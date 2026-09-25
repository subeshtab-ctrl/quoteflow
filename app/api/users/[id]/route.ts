import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'OWNER' && auth.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only organization owners and admins can remove team members.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (auth.userId === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // 1. Verify target user belongs to this organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', auth.orgId)
      .eq('user_id', id)
      .maybeSingle();

    if (memberError) {
      console.error('Error querying organization member:', memberError);
    }

    if (!member) {
      return NextResponse.json(
        { error: 'User does not belong to your organization.' },
        { status: 404 }
      );
    }

    if (member.role === 'OWNER' && auth.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only organization owners can remove another owner.' },
        { status: 403 }
      );
    }

    // 2. Delete membership
    await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', auth.orgId)
      .eq('user_id', id);

    // 3. Delete from profiles
    await supabase.from('profiles').delete().eq('id', id);

    // 4. Delete user from auth
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.warn('Warning deleting auth user record:', authDeleteError.message);
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete user' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'OWNER' && auth.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only organization owners and admins can reset staff passwords.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { password } = await req.json();

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Temporary password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // Verify target user belongs to this organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', auth.orgId)
      .eq('user_id', id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: 'User does not belong to your organization.' },
        { status: 404 }
      );
    }

    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(id);

    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingAuthUser?.user?.user_metadata || {}),
        organization_id: auth.orgId,
        company_name: auth.organization.name,
        must_change_password: true,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Temporary password set! The staff member can now log in and set their own password.',
    });
  } catch (err: any) {
    console.error('Error resetting staff password:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to set temporary password' },
      { status: 400 }
    );
  }
}

