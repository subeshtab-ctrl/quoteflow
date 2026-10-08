import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin } from '@/lib/billing/dev-admin-auth';
import { createAdminClient } from '@/lib/supabase/service-role';
import { sendEmail, generateVerificationOtpEmail } from '@/lib/email/service';
import { getAuthRedirectUrl } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Strict developer admin access required.' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    const { data: listData, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allUsers = listData?.users || [];
    const unverifiedUsers = allUsers
      .filter((u) => !u.email_confirmed_at && !u.confirmed_at && u.user_metadata?.email_verified !== true)
      .map((u) => ({
        id: u.id,
        email: u.email || '',
        fullName: u.user_metadata?.full_name || '',
        companyName: u.user_metadata?.company_name || '',
        organizationId: u.user_metadata?.organization_id || '',
        role: u.user_metadata?.role || 'OWNER',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
      }));

    return NextResponse.json({
      success: true,
      total: unverifiedUsers.length,
      users: unverifiedUsers,
    });
  } catch (err: any) {
    console.error('Error fetching unverified accounts:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json(
        { error: 'Forbidden: Strict developer admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, userId, email } = body;

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
    }

    if (action === 'verify' && userId) {
      // Manually verify user from developer admin console
      const { data, error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: { email_verified: true },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Account for ${data.user.email} marked as verified successfully.`,
      });
    }

    if (action === 'resend' && email) {
      const callbackUrl = getAuthRedirectUrl('/auth/callback');
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: callbackUrl },
      });

      if (linkErr) {
        return NextResponse.json({ error: linkErr.message }, { status: 400 });
      }

      const otpCode = linkData?.properties?.email_otp;
      const actionLink = linkData?.properties?.action_link;

      const emailPayload = generateVerificationOtpEmail({
        email,
        verifyUrl: actionLink || undefined,
        otpCode: otpCode || undefined,
      });

      await sendEmail(emailPayload);

      return NextResponse.json({
        success: true,
        message: `Verification link re-sent to ${email}.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error processing unverified account action:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
