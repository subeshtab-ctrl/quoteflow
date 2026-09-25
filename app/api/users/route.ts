import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { sendEmail } from '@/lib/email/service';

export async function GET() {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: true, users: [] });
    }

    // 1. Fetch organization members for the authenticated user's organization
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('id, user_id, role, created_at, is_active')
      .eq('organization_id', auth.orgId);

    if (memberError) {
      console.error('Error fetching org members:', memberError);
    }

    // Always include current user's ID
    const memberUserIds = new Set((members || []).map((m: any) => m.user_id));
    memberUserIds.add(auth.userId);

    const [{ data: authData, error: authError }, { data: profilesData }] =
      await Promise.all([
        supabase.auth.admin.listUsers(),
        supabase.from('profiles').select('*'),
      ]);

    if (authError) {
      console.error('Error fetching auth users:', authError);
    }

    const membersMap = new Map((members || []).map((m: any) => [m.user_id, m]));
    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

    const users = (authData?.users || [])
      .filter((user) => memberUserIds.has(user.id))
      .map((user) => {
        const member = membersMap.get(user.id);
        const profile = profilesMap.get(user.id);
        const role =
          member?.role ||
          user.user_metadata?.role ||
          (user.id === auth.userId ? auth.role : 'STAFF');

        const mustChangePassword = Boolean(user.user_metadata?.must_change_password);
        const isVerifiedWithOwnPassword =
          Boolean(user.email_confirmed_at) && !mustChangePassword;

        return {
          id: user.id,
          email: user.email,
          full_name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            (user.email ? user.email.split('@')[0] : 'Member'),
          role,
          company_name: user.user_metadata?.company_name || auth.organization.name,
          email_confirmed: isVerifiedWithOwnPassword,
          must_change_password: mustChangePassword,
          created_at: member?.created_at || user.created_at,
          last_sign_in_at: user.last_sign_in_at,
        };
      });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    console.error('Failed to list users:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only OWNER or ADMIN can add team members
    if (auth.role !== 'OWNER' && auth.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only organization owners or admins can add staff members.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fullName, email, password, role = 'STAFF' } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Temporary password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // 1. Check if email already exists in Supabase Auth
    const { data: existingList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = (existingList?.users || []).find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    let targetUserId: string;

    if (existingUser) {
      // Check if existing user belongs to another company as OWNER
      const existingOrgId = existingUser.user_metadata?.organization_id;
      const existingRole = existingUser.user_metadata?.role;
      if (existingOrgId && existingOrgId !== auth.orgId && existingRole === 'OWNER') {
        return NextResponse.json(
          {
            error:
              'This email address is already registered as an owner of another organization.',
          },
          { status: 409 }
        );
      }

      // Otherwise update existing staff account with the new temporary password & confirm email
      const { data: updatedData, error: updateError } =
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            full_name: cleanName,
            organization_id: auth.orgId,
            role: assignedRole,
            company_name: auth.organization.name,
            invited_by: auth.userId,
            must_change_password: true,
          },
        });

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
      targetUserId = updatedData.user.id;
    } else {
      // 2. Create auth user with email confirmed and the temporary password.
      //    Set must_change_password: true so staff is prompted to set their own password on first login.
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          organization_id: auth.orgId,
          role: assignedRole,
          company_name: auth.organization.name,
          invited_by: auth.userId,
          must_change_password: true,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
      targetUserId = userData.user.id;
    }

    // 3. Clean up any rogue default org membership inserted by legacy DB triggers
    const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
    if (auth.orgId !== DEFAULT_ORG_ID) {
      await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('user_id', targetUserId);
    }

    // 4. Add to organization_members
    const { error: memberError } = await supabase.from('organization_members').upsert({
      organization_id: auth.orgId,
      user_id: targetUserId,
      role: assignedRole,
      is_active: true,
    });

    if (memberError) {
      console.error('Error creating organization member:', memberError);
    }

    // 5. Upsert into profiles
    await supabase.from('profiles').upsert({
      id: targetUserId,
      full_name: cleanName,
      email: cleanEmail,
      role: assignedRole,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Staff account ready for ${cleanEmail}. They can now sign in with the temporary password and set their own password.`,
      user: {
        id: targetUserId,
        email: cleanEmail,
        full_name: cleanName,
        role: assignedRole,
        email_confirmed: true,
      },
    });
  } catch (err: any) {
    console.error('Failed to invite staff user:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to invite staff user' },
      { status: 500 }
    );
  }
}
