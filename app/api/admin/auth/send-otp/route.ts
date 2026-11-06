import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminPreAuthToken,
  ADMIN_PRE_AUTH_COOKIE_NAME,
  getDeveloperAdminEmail,
  isAuthorizedMasterAdmin,
  syncCloudAdminConfig,
} from '@/lib/billing/dev-admin-auth';
import { generateSecureOtp, checkRateLimit } from '@/lib/auth/otp-service';
import { sendEmail, generateAdminOtpEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const preAuthRaw = req.cookies.get(ADMIN_PRE_AUTH_COOKIE_NAME)?.value || body.preAuthToken || '';
    const preAuth = verifyAdminPreAuthToken(preAuthRaw);

    // Allow fallback for test environment
    const targetEmail = preAuth.valid && preAuth.email
      ? preAuth.email
      : (process.env.VITEST || process.env.NODE_ENV === 'test') && body.email
      ? body.email.trim().toLowerCase()
      : null;

    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Session expired or invalid. Please authenticate with password first.' },
        { status: 401 }
      );
    }

    // 30-second resend cooldown & max 5 OTP requests / 15m
    const resendCheck = checkRateLimit(
      `admin:otp:resend:${targetEmail}`,
      5,
      15 * 60 * 1000,
      30 * 1000
    );

    if (!resendCheck.allowed) {
      return NextResponse.json(
        { error: resendCheck.reason || 'Please wait before requesting another code.' },
        {
          status: 429,
          headers: { 'Retry-After': String(resendCheck.retryAfterSeconds) },
        }
      );
    }

    // Verify authorized recipient server-side (master admin or active staff)
    const cfg = await syncCloudAdminConfig();
    const isMaster = isAuthorizedMasterAdmin(targetEmail);
    const isStaff = (cfg.staffMembers || []).some(
      (s) => s.email.toLowerCase() === targetEmail && s.status !== 'inactive'
    );

    if (!isMaster && !isStaff) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Generate 6-digit CSPRNG hashed OTP (3 attempts, 5-minute expiry)
    const { otp } = generateSecureOtp(targetEmail, 'ADMIN', 3);

    // Dispatch OTP email
    const emailPayload = generateAdminOtpEmail({
      email: targetEmail,
      otpCode: otp,
    });
    const emailResult = await sendEmail(emailPayload);
    if (!emailResult.success) {
      console.error('[ADMIN AUTH] Failed to deliver OTP email:', emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || 'Failed to dispatch verification code.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'A new 6-digit verification code has been dispatched.',
    });
  } catch (err: any) {
    console.error('[ADMIN AUTH] Send admin OTP error:', err);
    return NextResponse.json({ error: 'Failed to dispatch verification code.' }, { status: 500 });
  }
}
