import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminPreAuthToken,
  ADMIN_PRE_AUTH_COOKIE_NAME,
  DEV_ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  registerAdminLoginSession,
  getDeveloperAdminEmail,
  syncCloudAdminConfig,
  normalizeAdminRoleLabel,
} from '@/lib/billing/dev-admin-auth';
import { verifySecureOtp } from '@/lib/auth/otp-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const otp = (body.otp || '').trim();
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    if (!otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit verification code.' },
        { status: 400 }
      );
    }

    // 1. Read and verify pre-auth token (cookie or fallback header/body)
    const preAuthRaw = req.cookies.get(ADMIN_PRE_AUTH_COOKIE_NAME)?.value || body.preAuthToken || '';
    const preAuth = verifyAdminPreAuthToken(preAuthRaw);

    // Allow fallback to body.email for legacy test suites only if in test environment
    const email = preAuth.valid && preAuth.email
      ? preAuth.email
      : (process.env.VITEST || process.env.NODE_ENV === 'test') && body.email
      ? body.email.trim().toLowerCase()
      : null;

    if (!email) {
      return NextResponse.json(
        { error: 'Authentication session expired or missing. Please sign in with your password again.' },
        { status: 401 }
      );
    }

    // 2. Validate OTP with max 3 attempts & 5-minute expiry
    const otpResult = verifySecureOtp(email, otp, 'ADMIN');

    if (!otpResult.valid) {
      if (otpResult.reason === 'MAX_ATTEMPTS') {
        return NextResponse.json(
          { error: 'Maximum verification attempts exceeded. Please restart admin login.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: 'Invalid or expired verification code.',
          remainingAttempts: otpResult.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 3. Resolve role and register new session ID
    const cfg = await syncCloudAdminConfig();
    const masterAdminEmail = getDeveloperAdminEmail();
    const isMaster = Boolean(masterAdminEmail && email === masterAdminEmail);

    let authenticatedName = 'Master Developer Admin';
    let authenticatedRole = 'SUPER_ADMIN';

    if (!isMaster) {
      const staff = (cfg.staffMembers || []).find(
        (s) => s.email.toLowerCase() === email && s.status !== 'inactive'
      );
      if (staff) {
        authenticatedName = staff.name;
        authenticatedRole = normalizeAdminRoleLabel(staff.role);
      }
    }

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
      message: 'Admin authentication successful.',
      role: authenticatedRole,
      name: authenticatedName,
    });

    // Set full admin session cookie (SameSite=Strict, httpOnly, secure in prod)
    response.cookies.set({
      name: DEV_ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60, // 8-hour admin idle/session timeout
    });

    // Clear pre-auth cookie
    response.cookies.set({
      name: ADMIN_PRE_AUTH_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err: any) {
    console.error('[ADMIN AUTH] Verify OTP error:', err);
    return NextResponse.json({ error: 'Verification failed.' }, { status: 500 });
  }
}
