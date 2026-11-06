import { NextRequest, NextResponse } from 'next/server';
import {
  syncCloudAdminConfig,
  verifyPassword,
  hashPassword,
  recordAdminSecurityEvent,
  getDeveloperAdminEmail,
  ADMIN_PRE_AUTH_COOKIE_NAME,
  createAdminPreAuthToken,
} from '@/lib/billing/dev-admin-auth';
import { generateSecureOtp, checkRateLimit } from '@/lib/auth/otp-service';
import { sendEmail, generateAdminOtpEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    // 1. IP Rate Limiting (max 5 login attempts / 15m)
    const ipLimit = checkRateLimit(`admin:login:ip:${ip}`, 5, 15 * 60 * 1000, 2000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    // Generic uniform error response
    const INVALID_CREDENTIALS_RESPONSE = {
      error: 'Invalid credentials.',
    };

    if (!email || !password) {
      return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
    }

    // Account-level rate limiting
    const accountLimit = checkRateLimit(`admin:login:acc:${email}`, 5, 15 * 60 * 1000, 1000);
    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts for this account. Please wait a moment.' },
        { status: 429 }
      );
    }

    const cfg = await syncCloudAdminConfig();
    const masterAdminEmail = getDeveloperAdminEmail();
    const isMaster = Boolean(masterAdminEmail && email === masterAdminEmail);

    let isValid = false;
    let staffName = 'Master Developer Admin';
    let staffRole = 'SUPER_ADMIN';

    if (isMaster) {
      isValid = verifyPassword(password, cfg.passwordHash || '', cfg.salt || '');
    } else {
      const staff = (cfg.staffMembers || []).find(
        (s) => s.email.toLowerCase() === email && s.status !== 'inactive'
      );
      if (staff) {
        staffName = staff.name;
        staffRole = staff.role;
        isValid = staff.passwordHash && staff.salt
          ? verifyPassword(password, staff.passwordHash, staff.salt)
          : verifyPassword(password, cfg.passwordHash || '', cfg.salt || '');
      } else {
        // Dummy timing-safe comparison to prevent user enumeration
        const dummySalt = 'qf_dummy_salt_2026';
        const dummyHash = hashPassword('DummyTimingPasswordSafetyCheck', dummySalt).hash;
        verifyPassword(password, dummyHash, dummySalt);
      }
    }

    if (!isValid) {
      // Redacted server-side log only (never log the attempted admin email)
      console.warn('[ADMIN AUTH] Failed authentication attempt from IP:', ip);
      recordAdminSecurityEvent({
        eventType: 'Admin Failed Login',
        severity: 'medium',
        actorEmail: '[REDACTED]',
        ipAddress: ip,
        details: 'Failed credentials attempt on Admin authentication endpoint.',
      });

      return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
    }

    // Direct login support for unit testing suites ONLY
    if (body.directLogin === true && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
      const {
        registerAdminLoginSession,
        createAdminSessionToken,
        DEV_ADMIN_COOKIE_NAME,
      } = await import('@/lib/billing/dev-admin-auth');

      const session = registerAdminLoginSession({
        email,
        name: staffName,
        role: staffRole as any,
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || 'TestClient',
      });
      const token = createAdminSessionToken(email, session.id);
      const res = NextResponse.json({ success: true, message: 'Authenticated.' });
      res.cookies.set({
        name: DEV_ADMIN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return res;
    }

    // 2. Generate 6-digit CSPRNG hashed OTP (3 attempts, 5-minute expiry, single use)
    const { otp } = generateSecureOtp(email, 'ADMIN', 3);

    // 3. Issue short-lived signed pre-auth token cookie (5-minute expiry)
    const preAuthToken = createAdminPreAuthToken(email);

    // 4. Dispatch OTP email strictly to server-verified email
    const emailPayload = generateAdminOtpEmail({
      email,
      otpCode: otp,
    });
    await sendEmail(emailPayload).catch((err) => {
      console.warn('[ADMIN AUTH] Failed to deliver OTP email:', err);
    });

    const response = NextResponse.json({
      success: true,
      requireOtp: true,
      message: 'Credentials verified. A 6-digit security code has been dispatched.',
    });

    response.cookies.set({
      name: ADMIN_PRE_AUTH_COOKIE_NAME,
      value: preAuthToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 5 * 60, // 5 minutes
    });

    return response;
  } catch (err: any) {
    console.error('[ADMIN AUTH] Error during admin login step 1:', err);
    return NextResponse.json({ error: 'Authentication service error.' }, { status: 500 });
  }
}
