import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { sendEmail, generateVerificationOtpEmail } from '@/lib/email/service';
import { getAuthRedirectUrl } from '@/lib/utils/auth';
import { checkRateLimit, generateSecureOtp } from '@/lib/auth/otp-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const fullName = (body.fullName || '').trim();
    const companyName = (body.companyName || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // Rate limiting: max 5 requests / 15m per IP
    const ipCheck = checkRateLimit(`otp:ip:${clientIp}`, 5, 15 * 60 * 1000, 2000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: ipCheck.reason || 'Too many OTP requests. Please wait a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': String(ipCheck.retryAfterSeconds) },
        }
      );
    }

    // Cooldown & Rate limiting per target email: 60s cooldown, max 5 per 15m
    const emailCheck = checkRateLimit(`otp:email:${email}`, 5, 15 * 60 * 1000, 60 * 1000);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: emailCheck.reason || 'Please wait 60s before requesting another verification email.' },
        {
          status: 429,
          headers: { 'Retry-After': String(emailCheck.retryAfterSeconds) },
        }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 500 }
      );
    }

    // Generate secure 6-digit CSPRNG hashed OTP (10-minute expiry, max 5 attempts)
    const { otp: generatedOtp } = generateSecureOtp(email, 'VERIFICATION', 5, 10 * 60 * 1000);

    let otpCode: string | null = generatedOtp;
    let actionLink: string | null = null;
    let userFullName = fullName;
    let userCompanyName = companyName;

    // 1. Check if the user already exists in Supabase
    let existingUser = null;
    try {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
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

        // Stamp 10-minute expiry reference timestamp in user_metadata
        try {
          await admin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              ...(existingUser.user_metadata || {}),
              verification_link_sent_at: new Date().toISOString(),
            },
          });
        } catch (metaErr) {
          console.warn('Failed to update verification_link_sent_at for existing user:', metaErr);
        }

        if (!error && data?.properties) {
          actionLink = data.properties.action_link || null;
          if (data.properties.email_otp) {
            otpCode = data.properties.email_otp;
          }
        } else if (error) {
          console.warn('generateLink magiclink error:', error);
        }
      } else {
        // For new signups: use 'signup'
        const metadata: Record<string, any> = {
          verification_link_sent_at: new Date().toISOString(),
        };
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
          actionLink = data.properties.action_link || null;
          if (data.properties.email_otp) {
            otpCode = data.properties.email_otp;
          }
        } else if (error) {
          console.warn('generateLink signup error:', error);
        }
      }
    } catch (genErr) {
      console.warn('generateLink exception:', genErr);
    }

    // 2. Dispatch branded verification email via Resend
    if (otpCode || actionLink) {
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

    // Secure response: NEVER return raw otpCode or links in HTTP response
    return NextResponse.json({
      success: true,
      message: 'Verification email sent to your inbox.',
    });
  } catch (err: any) {
    console.error('Send verification OTP error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to dispatch verification email.' },
      { status: 500 }
    );
  }
}
