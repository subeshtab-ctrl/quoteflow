import { NextRequest, NextResponse } from 'next/server';
import {
  getDeveloperAdminEmail,
  isAuthorizedMasterAdmin,
  setDeveloperAdminPassword,
  updateSupportStaffMember,
  syncCloudAdminConfig,
  normalizeAdminRoleLabel,
  registerAdminLoginSession,
  createAdminSessionToken,
  DEV_ADMIN_COOKIE_NAME,
  recordAdminSecurityEvent,
} from '@/lib/billing/dev-admin-auth';
import { verifySecureOtp, checkRateLimit } from '@/lib/auth/otp-service';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();
    const newPassword = body.newPassword || '';

    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 1. IP rate limiting (max 15 attempts / 15m)
    const ipCheck = checkRateLimit(`admin:reset-attempt:ip:${ip}`, 15, 15 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid developer admin email address is required.' },
        { status: 400 }
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { error: 'A valid 6-digit verification code is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Verify 6-digit OTP code
    const otpResult = verifySecureOtp(email, otp, 'ADMIN_RESET');
    if (!otpResult.valid) {
      if (otpResult.reason === 'EXPIRED') {
        return NextResponse.json(
          { error: 'Verification code has expired. Please request a new code.' },
          { status: 400 }
        );
      }
      if (otpResult.reason === 'MAX_ATTEMPTS') {
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Please request a new verification code.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: 'Invalid verification code. Please check your email and try again.',
          remainingAttempts: otpResult.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // 3. Verify admin account exists
    const cfg = await syncCloudAdminConfig();
    const isMaster = isAuthorizedMasterAdmin(email);
    const staff = (cfg.staffMembers || []).find(
      (s) => s.email.toLowerCase() === email && s.status !== 'inactive'
    );

    if (!isMaster && !staff) {
      return NextResponse.json(
        { error: 'Unauthorized: No active developer admin account found.' },
        { status: 403 }
      );
    }

    // 4. Update the password
    if (isMaster) {
      await setDeveloperAdminPassword(newPassword);
    } else if (staff) {
      await updateSupportStaffMember(staff.id, { password: newPassword });
    }

    // 5. Audit log
    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: isMaster ? 'dev_admin_root' : staff!.id,
      admin_email: email,
      action: 'ADMIN_PASSWORD_RESET_COMPLETED',
      target_type: 'developer_admin_config',
      target_id: email,
      metadata: {
        message: 'Developer Admin password reset successfully via email verification code',
        ipAddress: ip,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    recordAdminSecurityEvent({
      eventType: 'Admin Password Reset Completed',
      severity: 'medium',
      actorEmail: '[REDACTED]',
      ipAddress: ip,
      details: 'Developer Admin password reset verified and established.',
    });

    // 6. Establish authenticated session
    const authenticatedName = isMaster ? 'Master Developer Admin' : staff?.name || 'Staff Admin';
    const authenticatedRole = isMaster ? 'Super Admin' : normalizeAdminRoleLabel(staff?.role || 'STAFF');

    const session = registerAdminLoginSession({
      email,
      name: authenticatedName,
      role: authenticatedRole as any,
      ipAddress: ip,
      userAgent,
    });

    const token = createAdminSessionToken(email, session.id);

    const response = NextResponse.json({
      success: true,
      message: 'Developer Admin password reset successfully. Welcome back!',
      role: authenticatedRole,
      name: authenticatedName,
    });

    response.cookies.set({
      name: DEV_ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60, // 8 hours
    });

    return response;
  } catch (err: any) {
    console.error('[ADMIN AUTH] Reset password error:', err);
    return NextResponse.json(
      { error: err.message || 'An error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
