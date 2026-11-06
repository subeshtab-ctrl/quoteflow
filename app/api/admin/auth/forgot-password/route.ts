import { NextRequest, NextResponse } from 'next/server';
import {
  getDeveloperAdminEmail,
  isAuthorizedMasterAdmin,
  syncCloudAdminConfig,
  recordAdminSecurityEvent,
} from '@/lib/billing/dev-admin-auth';
import { generateSecureOtp, checkRateLimit } from '@/lib/auth/otp-service';
import { sendEmail, generateAdminPasswordResetEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid developer admin email address is required.' },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '127.0.0.1';

    // 1. IP rate limiting (max 10 requests / 15m)
    const ipLimit = checkRateLimit(`admin:forgot:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests from this network. Please wait a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    // 2. Email-specific rate limit (max 5 requests / 15m, 30s cooldown)
    const emailLimit = checkRateLimit(
      `admin:forgot:email:${email}`,
      5,
      15 * 60 * 1000,
      30 * 1000
    );
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: emailLimit.reason || 'Please wait before requesting another reset code.' },
        { status: 429, headers: { 'Retry-After': String(emailLimit.retryAfterSeconds) } }
      );
    }

    // 3. Verify authorized recipient server-side (master admin or active staff)
    const cfg = await syncCloudAdminConfig();
    const isMaster = isAuthorizedMasterAdmin(email);
    const isStaff = (cfg.staffMembers || []).some(
      (s) => s.email.toLowerCase() === email && s.status !== 'inactive'
    );

    // If unauthorized, return generic success to prevent email enumeration
    if (!isMaster && !isStaff) {
      console.warn('[ADMIN AUTH] Password reset attempted for non-admin email from IP:', ip);
      return NextResponse.json({
        success: true,
        message: 'If an authorized admin account exists with this email, a 6-digit verification code has been dispatched.',
      });
    }

    // 4. Generate 6-digit CSPRNG hashed OTP (3 attempts, 10-minute expiry)
    const { otp } = generateSecureOtp(email, 'ADMIN_RESET', 3, 10 * 60 * 1000);

    // 5. Dispatch branded password reset email via Resend
    const emailPayload = generateAdminPasswordResetEmail({
      email,
      otpCode: otp,
    });

    const emailResult = await sendEmail(emailPayload);
    if (!emailResult.success) {
      console.error('[ADMIN AUTH] Failed to deliver password reset OTP email via Resend:', emailResult.error);
      return NextResponse.json(
        { error: emailResult.error || 'Failed to dispatch verification email. Please try again.' },
        { status: 500 }
      );
    }

    recordAdminSecurityEvent({
      eventType: 'Admin Password Reset Initiated',
      severity: 'medium',
      actorEmail: '[REDACTED]',
      ipAddress: ip,
      details: 'Password reset OTP dispatched for authorized developer admin.',
    });

    const resPayload: Record<string, any> = {
      success: true,
      message: 'A 6-digit verification code has been dispatched to your registered admin email.',
    };

    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      resPayload.devOtp = otp;
    }

    return NextResponse.json(resPayload);
  } catch (err: any) {
    console.error('[ADMIN AUTH] Forgot password error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
