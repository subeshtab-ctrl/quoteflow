import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAdminPreAuthToken,
  verifyAdminPreAuthToken,
  getDeveloperAdminEmail,
  verifyPassword,
  hashPassword,
} from '@/lib/billing/dev-admin-auth';
import {
  generateSecureOtp,
  verifySecureOtp,
  checkRateLimit,
  _resetOtpStoresForTesting,
} from '@/lib/auth/otp-service';
import fs from 'fs';
import path from 'path';

describe('Phases 4 & 5 — Strict Admin 2-Step Login & Confidentiality Tests', () => {
  beforeEach(() => {
    _resetOtpStoresForTesting();
    vi.restoreAllMocks();
  });

  describe('Phase 4: Strict Admin Pre-Auth & OTP Flow', () => {
    it('creates and verifies signed HMAC pre-auth token with 5-minute expiry', () => {
      const email = 'admin@example.com';
      const token = createAdminPreAuthToken(email);
      expect(typeof token).toBe('string');

      // Valid token verifies successfully
      const result = verifyAdminPreAuthToken(token);
      expect(result.valid).toBe(true);
      expect(result.email).toBe(email);

      // Tampered token fails
      const tampered = token.slice(0, -4) + 'abcd';
      expect(verifyAdminPreAuthToken(tampered).valid).toBe(false);

      // Expired token (>5m) fails
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000);
      expect(verifyAdminPreAuthToken(token).valid).toBe(false);
    });

    it('enforces 3 maximum OTP attempts for admin authentication', () => {
      const email = 'master_admin@example.com';
      const { otp } = generateSecureOtp(email, 'ADMIN', 3);

      // Attempt 1: wrong
      const first = verifySecureOtp(email, '000000', 'ADMIN');
      expect(first.valid).toBe(false);
      expect(first.remainingAttempts).toBe(2);

      // Attempt 2: wrong
      const second = verifySecureOtp(email, '000000', 'ADMIN');
      expect(second.valid).toBe(false);
      expect(second.remainingAttempts).toBe(1);

      // Attempt 3: wrong -> triggers lockout
      const third = verifySecureOtp(email, '000000', 'ADMIN');
      expect(third.valid).toBe(false);
      expect(third.reason).toBe('MAX_ATTEMPTS');
      expect(third.remainingAttempts).toBe(0);

      // Even correct OTP is now rejected because lockout occurred
      expect(verifySecureOtp(email, otp, 'ADMIN').valid).toBe(false);
    });

    it('enforces single-use consumption of admin OTP upon successful verification', () => {
      const email = 'admin_single@example.com';
      const { otp } = generateSecureOtp(email, 'ADMIN', 3);

      // First verification passes
      expect(verifySecureOtp(email, otp, 'ADMIN').valid).toBe(true);

      // Second verification fails immediately
      expect(verifySecureOtp(email, otp, 'ADMIN').valid).toBe(false);
    });

    it('enforces 60-second cooldown on admin OTP resends', () => {
      const key = 'admin:otp:resend:admin@example.com';
      const now = 5000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const first = checkRateLimit(key, 3, 15 * 60 * 1000, 60 * 1000);
      expect(first.allowed).toBe(true);

      // Request 15 seconds later -> blocked
      vi.spyOn(Date, 'now').mockReturnValue(now + 15 * 1000);
      const second = checkRateLimit(key, 3, 15 * 60 * 1000, 60 * 1000);
      expect(second.allowed).toBe(false);
      expect(second.retryAfterSeconds).toBe(45);

      // Request 61 seconds later -> allowed
      vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 1000);
      const third = checkRateLimit(key, 3, 15 * 60 * 1000, 60 * 1000);
      expect(third.allowed).toBe(true);
    });

    it('verifies passwords using timing-safe PBKDF2 hash comparison', () => {
      const password = 'SuperSecureAdminPassword2026!';
      const { hash, salt } = hashPassword(password);

      expect(verifyPassword(password, hash, salt)).toBe(true);
      expect(verifyPassword('WrongPassword!', hash, salt)).toBe(false);
    });
  });

  describe('Phase 5: Admin Email Confidentiality & Redaction', () => {
    it('resolves developer admin email dynamically from process.env.ADMIN_EMAIL', () => {
      const testEmail = 'custom_secure_admin@company.com';
      process.env.ADMIN_EMAIL = testEmail;

      expect(getDeveloperAdminEmail()).toBe(testEmail);
    });

    it('confirms no hardcoded personal email exists in application codebase or tracked configs', () => {
      const scannedDirs = ['app', 'components', 'lib'];
      const forbiddenPattern = /m\.subesh@outlook\.com/i;

      function scanDir(dir: string): string[] {
        const fullPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(fullPath)) return [];
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        const violations: string[] = [];

        for (const entry of entries) {
          const res = path.join(dir, entry.name);
          const fullRes = path.join(process.cwd(), res);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.next') {
              violations.push(...scanDir(res));
            }
          } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
            const content = fs.readFileSync(fullRes, 'utf-8');
            if (forbiddenPattern.test(content)) {
              violations.push(res);
            }
          }
        }
        return violations;
      }

      const violations: string[] = [];
      for (const d of scannedDirs) {
        violations.push(...scanDir(d));
      }

      expect(violations).toEqual([]);
    });
  });
});
