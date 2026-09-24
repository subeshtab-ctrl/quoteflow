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

        return {
          id: user.id,
          email: user.email,
          full_name:
            profile?.full_name ||
            user.user_metadata?.full_name ||
            (user.email ? user.email.split('@')[0] : 'Member'),
          role,
          company_name: user.user_metadata?.company_name || auth.organization.name,
          email_confirmed: !!user.email_confirmed_at,
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
    // No password required — staff sets their own password via invitation link
    const { fullName, email, role = 'STAFF' } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    // 1. Prevent cross-company conflicts — email must not already exist
    const { data: existingList } = await supabase.auth.admin.listUsers();
    const existingUser = (existingList?.users || []).find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );
    if (existingUser) {
      return NextResponse.json(
        {
          error:
            'This email address is already registered. Staff must use a new email address that has not been used for another account.',
        },
        { status: 409 }
      );
    }

    // 2. Create auth user WITHOUT email confirmation and WITHOUT a password
    //    Staff sets their own password via the invitation link.
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: false,
      user_metadata: {
        full_name: cleanName,
        organization_id: auth.orgId,
        role: assignedRole,
        company_name: auth.organization.name,
        invited_by: auth.userId,
      },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const newUser = userData.user;

    // 3. Clean up any rogue default org membership inserted by legacy DB triggers
    const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
    if (auth.orgId !== DEFAULT_ORG_ID) {
      await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('user_id', newUser.id);
    }

    // 4. Add to organization_members
    const { error: memberError } = await supabase.from('organization_members').upsert({
      organization_id: auth.orgId,
      user_id: newUser.id,
      role: assignedRole,
      is_active: true,
    });

    if (memberError) {
      console.error('Error creating organization member:', memberError);
    }

    // 5. Upsert into profiles
    await supabase.from('profiles').upsert({
      id: newUser.id,
      full_name: cleanName,
      email: cleanEmail,
      role: assignedRole,
      updated_at: new Date().toISOString(),
    });

    // 6. Generate invitation link and send branded email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';
    let invitationSent = false;
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback`,
          data: {
            full_name: cleanName,
            organization_id: auth.orgId,
            role: assignedRole,
            company_name: auth.organization.name,
          },
        },
      });

      const actionLink = linkData?.properties?.action_link;
      if (actionLink) {
        await sendEmail({
          to: cleanEmail,
          replyTo: auth.email,
          fromName: auth.organization.name,
          subject: `You've been invited to join ${auth.organization.name} on QuoteFlow`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
                  .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                  .badge { display: inline-block; background: #4f46e5; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
                  .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 24px 0; }
                  .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
                  .note { font-size: 13px; color: #64748b; line-height: 1.6; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="badge">Team Invitation</div>
                  <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">You're Invited!</h2>
                  <p class="note">
                    Hello <strong>${cleanName}</strong>,<br><br>
                    You have been invited to join <strong>${auth.organization.name}</strong> as a <strong>${assignedRole}</strong> on QuoteFlow.<br><br>
                    Click the button below to accept your invitation and create your own password:
                  </p>
                  <div style="text-align: center;">
                    <a href="${actionLink}" class="btn">Accept Invitation &amp; Set Password</a>
                  </div>
                  <p class="note" style="word-break: break-all;">
                    If the button doesn't work, copy this link:<br>
                    <a href="${actionLink}" style="color: #4f46e5;">${actionLink}</a>
                  </p>
                  <p class="note">This invitation link will expire in 24 hours. If you did not expect this invitation, you can safely ignore this email.</p>
                  <div class="footer"><p>QuoteFlow SaaS Platform © 2026</p></div>
                </div>
              </body>
            </html>
          `,
          text: `Hello ${cleanName},\n\nYou have been invited to join ${auth.organization.name} as ${assignedRole} on QuoteFlow.\n\nAccept your invitation and set your password:\n${actionLink}\n\nThis link expires in 24 hours.`,
        });
        invitationSent = true;
        console.log(`[STAFF INVITATION SENT] ${cleanEmail} → ${auth.organization.name} (${assignedRole})`);
      } else if (linkErr) {
        console.warn('generateLink warning for invitation:', linkErr);
      }
    } catch (linkErr) {
      console.warn('Staff invitation email warning:', linkErr);
    }

    return NextResponse.json({
      success: true,
      message: invitationSent
        ? `Invitation email sent to ${cleanEmail}. They will need to accept the invitation to set their password and access the workspace.`
        : `Staff member ${cleanEmail} added. Please send them the login link manually.`,
      user: {
        id: newUser.id,
        email: cleanEmail,
        full_name: cleanName,
        role: assignedRole,
        invitation_sent: invitationSent,
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
