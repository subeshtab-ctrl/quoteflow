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

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be Owner/Admin OR have staff_view permission
    const hasViewPermission =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'staff_view');

    if (!hasViewPermission) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view staff' }, { status: 403 });
    }

    const members = await staffService.getStaffMembers(auth.orgId);
    return NextResponse.json({ success: true, staff: members });
  } catch (err: any) {
    console.error('Failed to get staff members:', err);
    return NextResponse.json({ error: err.message || 'Failed to get staff members' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Must be Owner/Admin OR have staff_add permission
    const canAddStaff =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'staff_add');

    if (!canAddStaff) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to add staff members' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      branch = 'Main Branch',
      role = 'STAFF',
      permissions: customPermissions,
      password: providedPassword,
    } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const normalizedRole = (role || 'STAFF').toUpperCase() as StaffRole;

    // Security & Anti-Privilege Escalation Rules:
    // 1. Only an existing OWNER can assign the OWNER role
    if (normalizedRole === 'OWNER' && auth.role.toUpperCase() !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the Account Owner can assign the Owner role' },
        { status: 403 }
      );
    }

    // 2. Regular staff with staff_add permission cannot create ADMIN or OWNER accounts
    if (!isOwnerOrAdminRole(auth.role) && (normalizedRole === 'ADMIN' || normalizedRole === 'OWNER')) {
      return NextResponse.json(
        { error: 'You do not have permission to create administrative accounts' },
        { status: 403 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanBranch = (branch || 'Main Branch').trim();
    const cleanPhone = phone ? phone.trim() : null;

    // Password setup: use provided password or generate a secure temporary password
    const tempPassword = providedPassword && providedPassword.length >= 6
      ? providedPassword
      : `Qf!${Math.random().toString(36).slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    // Build effective permissions
    const preset = ROLE_PERMISSION_PRESETS[normalizedRole] || ROLE_PERMISSION_PRESETS.STAFF;
    const finalPermissions: StaffPermissions = {
      ...preset,
      ...(customPermissions || {}),
    };

    // Billing permissions are strictly Owner/Admin only
    if (normalizedRole !== 'OWNER' && normalizedRole !== 'ADMIN') {
      finalPermissions.billing_view = false;
      finalPermissions.billing_manage_subscription = false;
      finalPermissions.billing_manage_payment_method = false;
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Check if user already exists in auth
    const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = (existingList?.users || []).find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    let targetUserId: string;

    // The database organization_members.role column only accepts 'OWNER' | 'ADMIN' | 'STAFF'
    const dbColumnRole = normalizedRole === 'OWNER' ? 'OWNER' : normalizedRole === 'ADMIN' ? 'ADMIN' : 'STAFF';

    if (existingUser) {
      // Check if user belongs to another organization as OWNER
      const existingOrgId = existingUser.user_metadata?.organization_id;
      const existingUserRole = existingUser.user_metadata?.role;
      if (existingOrgId && existingOrgId !== auth.orgId && existingUserRole === 'OWNER') {
        return NextResponse.json(
          { error: 'This email is already registered as an Owner of another organization' },
          { status: 409 }
        );
      }

      const { data: updatedData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            full_name: cleanName,
            organization_id: auth.orgId,
            role: normalizedRole,
            company_name: auth.organization.name,
            branch: cleanBranch,
            phone: cleanPhone,
            permissions: finalPermissions,
            invited_by: auth.userId,
            is_staff: true,
            must_change_password: true,
            is_active: true,
          },
        }
      );

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      targetUserId = updatedData.user.id;
    } else {
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          organization_id: auth.orgId,
          role: normalizedRole,
          company_name: auth.organization.name,
          branch: cleanBranch,
          phone: cleanPhone,
          permissions: finalPermissions,
          invited_by: auth.userId,
          is_staff: true,
          must_change_password: true,
          is_active: true,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
      targetUserId = userData.user.id;
    }

    // Clean up default org membership if legacy trigger inserted it
    const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
    if (auth.orgId !== DEFAULT_ORG_ID) {
      await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('user_id', targetUserId);
    }

    // Add or update organization_members
    await supabase.from('organization_members').upsert({
      organization_id: auth.orgId,
      user_id: targetUserId,
      role: dbColumnRole,
      is_active: true,
    });

    // Update profiles
    await supabase.from('profiles').upsert({
      id: targetUserId,
      full_name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: dbColumnRole,
      updated_at: new Date().toISOString(),
    });

    // Log the staff creation in the immutable activity log
    await staffService.logStaffActivity({
      organization_id: auth.orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: 'CREATE',
      action_key: 'staff_created',
      module: 'STAFF',
      target_id: targetUserId,
      target_identifier: cleanEmail,
      details: `Added new staff member "${cleanName}" with role ${normalizedRole} (${cleanBranch})`,
      diff: {
        new: {
          full_name: cleanName,
          email: cleanEmail,
          role: normalizedRole,
          branch: cleanBranch,
          phone: cleanPhone,
          permissions: finalPermissions,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Staff member "${cleanName}" (${normalizedRole}) added successfully.`,
      tempPassword,
      staff: {
        id: targetUserId,
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        branch: cleanBranch,
        role: normalizedRole,
        permissions: finalPermissions,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Failed to create staff member:', err);
    return NextResponse.json({ error: err.message || 'Failed to create staff member' }, { status: 500 });
  }
}
