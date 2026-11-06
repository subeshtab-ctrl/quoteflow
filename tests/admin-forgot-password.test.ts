import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDeveloperAdminEmail,
  verifyPassword,
  getDeveloperAdminConfig,
  setDeveloperAdminPassword,
  DEV_ADMIN_COOKIE_NAME,
} from '@/lib/billing/dev-admin-auth';
import {
  generateSecureOtp,
  verifySecureOtp,
  checkRateLimit,
  _resetOtpStoresForTesting,
} from '@/lib/auth/otp-service';
import { POST as forgotPasswordHandler } from '@/app/api/admin/auth/forgot-password/route';
import { POST as resetPasswordHandler } from '@/app/api/admin/auth/reset-password/route';
import { POST as loginPasswordHandler } from '@/app/api/admin/auth/login-password/route';
import { NextRequest } from 'next/server';

describe('Developer Admin — Forgot Password & Password Reset Flow', () => {
  beforeEach(() => {
    _resetOtpStoresForTesting();
    vi.restoreAllMocks();
  });

  it('generates, verifies, and invalidates ADMIN_RESET OTP', () => {
    const adminEmail = getDeveloperAdminEmail();
    const { otp, expiresAt } = generateSecureOtp(adminEmail, 'ADMIN_RESET', 3, 10 * 60 * 1000);

    expect(otp).toMatch(/^\d{6}$/);
    expect(expiresAt).toBeGreaterThan(Date.now());

    // Wrong OTP attempt 1
    const attempt1 = verifySecureOtp(adminEmail, '000000', 'ADMIN_RESET');
    expect(attempt1.valid).toBe(false);
    expect(attempt1.remainingAttempts).toBe(2);

    // Correct OTP succeeds
    const success = verifySecureOtp(adminEmail, otp, 'ADMIN_RESET');
    expect(success.valid).toBe(true);

    // Reuse fails immediately (consumed)
    const reuse = verifySecureOtp(adminEmail, otp, 'ADMIN_RESET');
    expect(reuse.valid).toBe(false);
  });

  it('expires ADMIN_RESET OTP after 10 minutes', () => {
    const adminEmail = getDeveloperAdminEmail();
    const { otp } = generateSecureOtp(adminEmail, 'ADMIN_RESET', 3, 10 * 60 * 1000);

    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 11 * 60 * 1000); // 11 mins later

    const result = verifySecureOtp(adminEmail, otp, 'ADMIN_RESET');
    expect(result.valid).toBe(false);
    expect(['EXPIRED', 'NOT_FOUND']).toContain(result.reason);
  });

  it('handles /api/admin/auth/forgot-password route validation and dispatch', async () => {
    const adminEmail = getDeveloperAdminEmail();

    // 1. Missing / invalid email
    const badReq = new NextRequest('http://localhost:3000/api/admin/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' }),
    });
    const badRes = await forgotPasswordHandler(badReq);
    expect(badRes.status).toBe(400);

    // 2. Valid admin email dispatches OTP
    const validReq = new NextRequest('http://localhost:3000/api/admin/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail }),
    });
    const validRes = await forgotPasswordHandler(validReq);
    expect(validRes.status).toBe(200);
    const validData = await validRes.json();
    expect(validData.success).toBe(true);
    expect(validData.devOtp).toMatch(/^\d{6}$/);
  });

  it('completes password reset and automatically logs admin in with session cookie', async () => {
    const adminEmail = getDeveloperAdminEmail();

    // 1. Request reset code
    const forgotReq = new NextRequest('http://localhost:3000/api/admin/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail }),
    });
    const forgotRes = await forgotPasswordHandler(forgotReq);
    const { devOtp } = await forgotRes.json();

    // 2. Attempt reset with wrong OTP
    const wrongOtpReq = new NextRequest('http://localhost:3000/api/admin/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        otp: '999999',
        newPassword: 'UpdatedSecret@2026',
      }),
    });
    const wrongOtpRes = await resetPasswordHandler(wrongOtpReq);
    expect(wrongOtpRes.status).toBe(400);

    // 3. Complete reset with valid OTP and new password
    const newPassword = 'NewAdminPassword#2026';
    const resetReq = new NextRequest('http://localhost:3000/api/admin/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        otp: devOtp,
        newPassword,
      }),
    });
    const resetRes = await resetPasswordHandler(resetReq);
    expect(resetRes.status).toBe(200);
    const resetData = await resetRes.json();
    expect(resetData.success).toBe(true);

    // Cookie is set
    const sessionCookie = resetRes.cookies.get(DEV_ADMIN_COOKIE_NAME);
    expect(sessionCookie?.value).toBeDefined();

    // 4. Verify that new password can now be used for login
    const loginReq = new NextRequest('http://localhost:3000/api/admin/auth/login-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: newPassword,
        directLogin: true,
      }),
    });
    const loginRes = await loginPasswordHandler(loginReq);
    expect(loginRes.status).toBe(200);
  });
});
