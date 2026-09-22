import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/service-role';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { loadInvitations, saveInvitation, InvitationRecord } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

// GET: Validate invite token
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invitations = loadInvitations();
    const invite = invitations[token];

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link.' },
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
        { error: 'This invitation link has expired. Please ask your administrator to send a new invite.' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invite.email,
        fullName: invite.fullName,
        companyName: invite.companyName,
        inviterName: invite.inviterName,
        role: invite.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to validate invitation' },
      { status: 500 }
    );
  }
}

// POST: Create staff invitation
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role !== 'OWNER' && auth.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only organization owners or admins can invite staff members.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fullName, email, role = 'STAFF' } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }
    if (!cleanName) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const admin = createAdminClient();

    // 1. Check if user is already an active member of this organization
    if (admin) {
      const { data: userList } = await admin.auth.admin.listUsers();
      const existingUser = (userList?.users || []).find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (existingUser) {
        const { data: member } = await admin
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (member?.organization_id === auth.orgId) {
          return NextResponse.json(
            { error: `"${cleanEmail}" is already an active team member of your company.` },
            { status: 400 }
          );
        }
      }
    }

    // 2. Generate secure token & expiry (7 days)
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const record: InvitationRecord = {
      token,
      email: cleanEmail,
      fullName: cleanName,
      role: assignedRole,
      organizationId: auth.orgId,
      companyName: auth.organization.name,
      inviterName: auth.fullName,
      createdAt: now.toISOString(),
      expiresAt,
      accepted: false,
    };

    saveInvitation(record);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://abilities-tap-rounds-dat.trycloudflare.com';
    const inviteLink = `${appUrl}/accept-invite?token=${token}`;

    // 3. Attempt Supabase Auth Invite if configured
    if (admin) {
      try {
        await admin.auth.admin.inviteUserByEmail(cleanEmail, {
          data: {
            full_name: cleanName,
            organization_id: auth.orgId,
            role: assignedRole,
            company_name: auth.organization.name,
          },
          redirectTo: inviteLink,
        });
      } catch (inviteErr) {
        console.warn('Supabase direct email invite note:', inviteErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitation generated for ${cleanEmail}!`,
      inviteLink,
      invitation: {
        email: cleanEmail,
        fullName: cleanName,
        role: assignedRole,
        expiresAt,
      },
    });
  } catch (err: any) {
    console.error('Failed to create invitation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
