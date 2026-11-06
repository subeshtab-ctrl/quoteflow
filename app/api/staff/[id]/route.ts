import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffService } from '@/lib/staff/staff-service';
import {
  StaffRole,
  StaffPermissions,
  ROLE_PERMISSION_PRESETS,
  isOwnerOrAdminRole,
} from '@/types/staff';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;
    const canView =
      isOwnerOrAdminRole(auth.role) ||
      auth.userId === targetUserId ||
      staffService.hasPermission(auth.role, undefined, 'staff_view');

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const member = await staffService.getStaffMember(auth.orgId, targetUserId);
    if (!member) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Also get their recent activity timeline
    const activity = await staffService.getStaffMemberActivity(auth.orgId, targetUserId, 20);

    return NextResponse.json({
      success: true,
      staff: member,
      activity,
    });
  } catch (err: any) {
    console.error('Failed to get staff detail:', err);
    return NextResponse.json({ error: err.message || 'Failed to get staff detail' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;
    const body = await req.json();
    const {
      fullName,
      phone,
      branch,
      role,
      permissions: customPermissions,
      isActive,
      password: newPassword,
    } = body;

    const currentMember = await staffService.getStaffMember(auth.orgId, targetUserId);
    if (!currentMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Security & Anti-Privilege Escalation Rules:
    // 1. Staff members CANNOT edit their own role or permissions!
    if (auth.userId === targetUserId && (role !== undefined || customPermissions !== undefined)) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot modify your own role or permissions' },
        { status: 403 }
      );
    }

    // 2. Non-owner cannot modify the Account Owner
    if (currentMember.role === 'OWNER' && auth.role.toUpperCase() !== 'OWNER') {
      return NextResponse.json(
        { error: 'Forbidden: Only the Account Owner can modify the Owner profile' },
        { status: 403 }
      );
    }

    // 3. To change role or permissions, caller must be Owner/Admin OR have staff_change_roles permission
    if (role !== undefined || customPermissions !== undefined) {
      const canChangeRoles =
        isOwnerOrAdminRole(auth.role) ||
        staffService.hasPermission(auth.role, undefined, 'staff_change_roles');
      if (!canChangeRoles) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions to change roles or permissions' },
          { status: 403 }
        );
      }
    }

    // 4. Regular staff without staff_edit permission cannot edit other staff
    if (auth.userId !== targetUserId) {
      const canEdit =
        isOwnerOrAdminRole(auth.role) ||
        staffService.hasPermission(auth.role, undefined, 'staff_edit');
      if (!canEdit) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions to edit staff' },
          { status: 403 }
        );
      }
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Fetch existing user from auth
    const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(targetUserId);
    if (fetchError || !userData?.user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    const existingMeta = userData.user.user_metadata || {};
    const newRole = role !== undefined ? (role.toUpperCase() as StaffRole) : currentMember.role;

    // Calculate updated permissions
    let updatedPermissions = currentMember.permissions;
    if (role !== undefined || customPermissions !== undefined) {
      const basePreset = ROLE_PERMISSION_PRESETS[newRole] || ROLE_PERMISSION_PRESETS.STAFF;
      updatedPermissions = {
        ...basePreset,
        ...(customPermissions || currentMember.permissions),
      };

      // Restrict billing permissions for non-admin/owner roles
      if (newRole !== 'OWNER' && newRole !== 'ADMIN') {
        updatedPermissions.billing_view = false;
        updatedPermissions.billing_manage_subscription = false;
        updatedPermissions.billing_manage_payment_method = false;
      }
    }

    const updatedName = fullName !== undefined ? fullName.trim() : currentMember.full_name;
    const updatedBranch = branch !== undefined ? branch.trim() : currentMember.branch;
    const updatedPhone = phone !== undefined ? (phone ? phone.trim() : null) : currentMember.phone;
    const updatedActive = typeof isActive === 'boolean' ? isActive : currentMember.is_active;

    const authUpdates: any = {
      user_metadata: {
        ...existingMeta,
        full_name: updatedName,
        branch: updatedBranch,
        phone: updatedPhone,
        role: newRole,
        permissions: updatedPermissions,
        is_active: updatedActive,
      },
    };

    if (newPassword && newPassword.length >= 6) {
      authUpdates.password = newPassword;
      authUpdates.user_metadata.must_change_password = false;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, authUpdates);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    const dbColumnRole = newRole === 'OWNER' ? 'OWNER' : newRole === 'ADMIN' ? 'ADMIN' : 'STAFF';

    // Update organization_members
    await supabase.from('organization_members').update({
      role: dbColumnRole,
      is_active: updatedActive,
    }).eq('organization_id', auth.orgId).eq('user_id', targetUserId);

    // Update profiles
    await supabase.from('profiles').update({
      full_name: updatedName,
      phone: updatedPhone,
      role: dbColumnRole,
      updated_at: new Date().toISOString(),
    }).eq('id', targetUserId);

    // Prepare diff for audit log
    const diff: Record<string, any> = {
      previous: {
        full_name: currentMember.full_name,
        role: currentMember.role,
        branch: currentMember.branch,
        phone: currentMember.phone,
        is_active: currentMember.is_active,
      },
      current: {
        full_name: updatedName,
        role: newRole,
        branch: updatedBranch,
        phone: updatedPhone,
        is_active: updatedActive,
      },
    };

    let logAction = 'UPDATE';
    let logActionKey = 'staff_updated';
    let detailsMsg = `Updated staff member "${updatedName}"`;

    if (role !== undefined && role !== currentMember.role) {
      logAction = 'ROLE_CHANGE';
      logActionKey = 'staff_role_changed';
      detailsMsg = `Changed role of "${updatedName}" from ${currentMember.role} to ${newRole}`;
    } else if (typeof isActive === 'boolean' && isActive !== currentMember.is_active) {
      logAction = isActive ? 'ACTIVATE' : 'DEACTIVATE';
      logActionKey = isActive ? 'staff_activated' : 'staff_deactivated';
      detailsMsg = `${isActive ? 'Activated' : 'Deactivated'} staff member "${updatedName}"`;
    }

    await staffService.logStaffActivity({
      organization_id: auth.orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: logAction,
      action_key: logActionKey,
      module: 'STAFF',
      target_id: targetUserId,
      target_identifier: currentMember.email,
      details: detailsMsg,
      diff,
    });

    return NextResponse.json({
      success: true,
      message: detailsMsg,
      staff: {
        id: targetUserId,
        full_name: updatedName,
        email: currentMember.email,
        phone: updatedPhone,
        branch: updatedBranch,
        role: newRole,
        permissions: updatedPermissions,
        is_active: updatedActive,
      },
    });
  } catch (err: any) {
    console.error('Failed to update staff member:', err);
    return NextResponse.json({ error: err.message || 'Failed to update staff member' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;

    // Cannot delete yourself
    if (auth.userId === targetUserId) {
      return NextResponse.json({ error: 'You cannot remove your own account' }, { status: 400 });
    }

    // Must be Owner/Admin OR have staff_remove permission
    const canRemove =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'staff_remove');

    if (!canRemove) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to remove staff' },
        { status: 403 }
      );
    }

    const currentMember = await staffService.getStaffMember(auth.orgId, targetUserId);
    if (!currentMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Cannot remove the Owner!
    if (currentMember.role === 'OWNER') {
      return NextResponse.json(
        { error: 'The Account Owner cannot be removed' },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Remove from organization_members
    await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', auth.orgId)
      .eq('user_id', targetUserId);

    // Invalidate organization_id in user_metadata
    await supabase.auth.admin.updateUserById(targetUserId, {
      user_metadata: {
        organization_id: null,
        is_active: false,
      },
    });

    // Log the staff removal in the activity log
    await staffService.logStaffActivity({
      organization_id: auth.orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: 'DELETE',
      action_key: 'staff_removed',
      module: 'STAFF',
      target_id: targetUserId,
      target_identifier: currentMember.email,
      details: `Removed staff member "${currentMember.full_name}" (${currentMember.role}) from organization`,
      diff: {
        removed_user: {
          id: targetUserId,
          email: currentMember.email,
          full_name: currentMember.full_name,
          role: currentMember.role,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Staff member "${currentMember.full_name}" removed successfully`,
    });
  } catch (err: any) {
    console.error('Failed to remove staff member:', err);
    return NextResponse.json({ error: err.message || 'Failed to remove staff member' }, { status: 500 });
  }
}
