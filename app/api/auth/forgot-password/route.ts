import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email/service';
import { getAuthRedirectUrl } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Authentication service is temporarily unavailable.' },
        { status: 500 }
      );
    }

    // 1. Verify that user exists in Supabase Auth
    let userExists = false;
    try {
      const { data: listData, error: listError } = await admin.auth.admin.listUsers();
      if (!listError && listData?.users) {
        userExists = listData.users.some((u) => u.email?.toLowerCase() === email);
      }
    } catch (listErr) {
      console.warn('Error checking user existence in forgot-password:', listErr);
    }

    // If user does not exist, return generic success to prevent email enumeration
    if (!userExists) {
      console.log(`[FORGOT PASSWORD] Account not found for email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account exists for this email, password reset instructions have been sent.',
      });
    }

    // 2. Generate Supabase recovery link
    const redirectTo = getAuthRedirectUrl('/auth/callback?next=/reset-password');
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    if (error || !data?.properties) {
      console.error('generateLink recovery error:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to generate password reset link.' },
        { status: 500 }
      );
    }

    const actionLink = data.properties.action_link;
    const otpCode = data.properties.email_otp;

    console.log(`\n======================================================`);
    console.log(`[PASSWORD RESET EMAIL DISPATCH] Target: ${email}`);
    console.log(`[RECOVERY OTP CODE]              ${otpCode}`);
    console.log(`[ACTION LINK]                    ${actionLink}`);
    console.log(`======================================================\n`);

    // 3. Dispatch branded HTML email via Resend
    const emailPayload = generatePasswordResetEmail({
      email,
      resetUrl: actionLink,
      otpCode,
    });

    const emailResult = await sendEmail(emailPayload);

    if (!emailResult.success) {
      console.error('Failed to send password reset email via Resend:', emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || 'Failed to deliver reset email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email.',
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while processing password reset.' },
      { status: 500 }
    );
  }
}
