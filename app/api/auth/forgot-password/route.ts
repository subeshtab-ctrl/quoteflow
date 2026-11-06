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

    // 1. Generate Supabase recovery link directly
    const redirectTo = getAuthRedirectUrl('/auth/callback?next=/reset-password');
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo,
      },
    });

    // If user does not exist in Supabase Auth, return generic success to prevent email enumeration
    if (error) {
      const errMsg = (error.message || '').toLowerCase();
      if (errMsg.includes('not found') || (error as any).status === 404) {
        console.log(`[FORGOT PASSWORD] Account not found for email: ${email}`);
        return NextResponse.json({
          success: true,
          message: 'If an account exists for this email, password reset instructions have been sent.',
        });
      }

      console.error('generateLink recovery error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to generate password reset link.' },
        { status: 500 }
      );
    }

    if (!data?.properties) {
      return NextResponse.json(
        { error: 'Failed to generate recovery credentials.' },
        { status: 500 }
      );
    }

    const actionLink = data.properties.action_link;
    const otpCode = data.properties.email_otp;

    // 2. Dispatch branded HTML email via Resend
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
