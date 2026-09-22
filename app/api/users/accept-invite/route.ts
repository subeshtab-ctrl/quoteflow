import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { loadInvitations, saveInvitation } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { token, fullName, password } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const invitations = loadInvitations();
    const invite = invitations[token];

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token.' },
        { status: 404 }
      );
    }

    if (invite.accepted) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted. Please sign in.' },
        { status: 400 }
      );
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired. Please contact your company administrator.' },
        { status: 410 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Auth service unavailable.' }, { status: 500 });
    }

    const cleanName = (fullName || invite.fullName || '').trim();
    const cleanEmail = invite.email.toLowerCase().trim();

    // 1. Check if auth user already exists for this email
    const { data: listData } = await admin.auth.admin.listUsers();
    let authUser = (listData?.users || []).find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    let userId: string;

    if (authUser) {
      userId = authUser.id;
      // Update existing user with new password, confirmation, and organization metadata
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          ...authUser.user_metadata,
          full_name: cleanName,
          organization_id: invite.organizationId,
          role: invite.role,
          company_name: invite.companyName,
        },
      });
    } else {
      // Create new user in Supabase auth
      const { data: newUserData, error: createError } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          organization_id: invite.organizationId,
          role: invite.role,
          company_name: invite.companyName,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }
      userId = newUserData.user.id;
    }

    // 2. Remove any default org rogue membership
    const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
    if (invite.organizationId !== DEFAULT_ORG_ID) {
      await admin
        .from('organization_members')
        .delete()
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('user_id', userId);
    }

    // 3. Add to organization_members for inviter company
    await admin.from('organization_members').upsert({
      organization_id: invite.organizationId,
      user_id: userId,
      role: invite.role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 4. Update profile
    await admin.from('profiles').upsert({
      id: userId,
      full_name: cleanName,
      email: cleanEmail,
      role: invite.role,
      updated_at: new Date().toISOString(),
    });

    // 5. Mark invitation accepted
    invite.accepted = true;
    saveInvitation(invite);

    return NextResponse.json({
      success: true,
      message: `Welcome to ${invite.companyName}! Your password has been set.`,
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error('Accept invite error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to accept invitation.' },
      { status: 500 }
    );
  }
}
