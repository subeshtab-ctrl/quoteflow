import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { sendEmail, generateVerificationOtpEmail } from '@/lib/email/service';
import { getAuthRedirectUrl } from '@/lib/utils/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const fullName = (body.fullName || '').trim();
    const companyName = (body.companyName || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 500 }
      );
    }

    let otpCode: string | null = null;
    let actionLink: string | null = null;
    let userFullName = fullName;
    let userCompanyName = companyName;

    // 1. Check if the user already exists in Supabase
    let existingUser = null;
    try {
      const { data: listData } = await admin.auth.admin.listUsers();
      existingUser = (listData?.users || []).find(
        (u) => u.email?.toLowerCase() === email
      );
      if (existingUser) {
        userFullName = userFullName || existingUser.user_metadata?.full_name || '';
        userCompanyName = userCompanyName || existingUser.user_metadata?.company_name || '';
      }
    } catch (listErr) {
      console.warn('Error checking existing users:', listErr);
    }

    const callbackUrl = getAuthRedirectUrl('/auth/callback');

    try {
      if (existingUser) {
        // For existing users: use 'magiclink' to avoid overwriting their existing password
        const { data, error } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: callbackUrl,
          },
        });

        if (!error && data?.properties) {
          otpCode = data.properties.email_otp || null;
          actionLink = data.properties.action_link || null;
        } else if (error) {
          console.warn('generateLink magiclink error:', error);
        }
      } else {
        // For new signups: use 'signup'
        const metadata: Record<string, any> = {};
        if (fullName) metadata.full_name = fullName;
        if (companyName) metadata.company_name = companyName;

        const { data, error } = await admin.auth.admin.generateLink({
          type: 'signup',
          email,
          password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
          options: {
            data: metadata,
            redirectTo: callbackUrl,
          },
        });

        if (!error && data?.properties) {
          otpCode = data.properties.email_otp || null;
          actionLink = data.properties.action_link || null;
        } else if (error) {
          console.warn('generateLink signup error:', error);
        }
      }
    } catch (genErr) {
      console.warn('generateLink exception:', genErr);
    }

    // 2. Dispatch branded verification email via Resend
    if (otpCode || actionLink) {
      console.log(`\n======================================================`);
      console.log(`[VERIFICATION EMAIL DISPATCH] Target: ${email}`);
      console.log(`[VERIFICATION OTP CODE]      ${otpCode}`);
      console.log(`[ACTION LINK]                ${actionLink}`);
      console.log(`======================================================\n`);

      const emailPayload = generateVerificationOtpEmail({
        email,
        verifyUrl: actionLink || undefined,
        otpCode: otpCode || undefined,
        companyName: userCompanyName || undefined,
        fullName: userFullName || undefined,
      });

      const emailResult = await sendEmail(emailPayload);
      if (!emailResult.success) {
        console.error('Failed to send verification email via Resend:', emailResult.error);
        return NextResponse.json(
          { error: emailResult.error || 'Failed to deliver verification email. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Could not generate verification details for this email.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent to your inbox.',
      otpCode,
    });
  } catch (err: any) {
    console.error('Send verification OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch verification email.' },
      { status: 500 }
    );
  }
}
