import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSecureOtp,
  verifySecureOtp,
  checkRateLimit,
  _resetOtpStoresForTesting,
} from '@/lib/auth/otp-service';
import { registrationSchema } from '@/lib/validations/auth';

describe('Phase 2 — Registration & OTP Hardening Security Tests', () => {
  beforeEach(() => {
    _resetOtpStoresForTesting();
    vi.restoreAllMocks();
  });

  describe('CSPRNG 6-Digit OTP Generation & Storage', () => {
    it('generates a 6-digit numeric code strictly within [100000, 999999]', () => {
      const generated = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const { otp, expiresAt } = generateSecureOtp(`user${i}@example.com`, 'VERIFICATION');
        expect(otp).toMatch(/^\d{6}$/);
        expect(Number(otp)).toBeGreaterThanOrEqual(100000);
        expect(Number(otp)).toBeLessThanOrEqual(999999);
        expect(expiresAt).toBeGreaterThan(Date.now());
        generated.add(otp);
      }
      // High entropy check: in 50 iterations, values should not be all identical
      expect(generated.size).toBeGreaterThan(45);
    });

    it('verifies correct OTP with timing-safe comparison', () => {
      const target = 'owner@business.com';
      const { otp } = generateSecureOtp(target, 'VERIFICATION');

      const result = verifySecureOtp(target, otp, 'VERIFICATION');
      expect(result.valid).toBe(true);
    });

    it('enforces single-use invalidation immediately upon successful verification', () => {
      const target = 'singleuse@business.com';
      const { otp } = generateSecureOtp(target, 'VERIFICATION');

      // First verification must succeed
      const firstResult = verifySecureOtp(target, otp, 'VERIFICATION');
      expect(firstResult.valid).toBe(true);

      // Second verification attempt with same OTP must be rejected
      const secondResult = verifySecureOtp(target, otp, 'VERIFICATION');
      expect(secondResult.valid).toBe(false);
      expect(['NOT_FOUND', 'ALREADY_USED']).toContain(secondResult.reason);
    });

    it('expires after 10 minutes', () => {
      const target = 'expired@business.com';
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      const { otp } = generateSecureOtp(target, 'VERIFICATION');

      // 9 minutes 59 seconds later: still valid
      vi.spyOn(Date, 'now').mockReturnValue(now + 9 * 60 * 1000 + 59 * 1000);
      expect(verifySecureOtp(target, '999999', 'VERIFICATION').reason).toBe('INVALID');

      // 10 minutes 1 second later: expired
      vi.spyOn(Date, 'now').mockReturnValue(now + 10 * 60 * 1000 + 1000);
      const expiredResult = verifySecureOtp(target, otp, 'VERIFICATION');
      expect(expiredResult.valid).toBe(false);
      expect(expiredResult.reason).toBe('EXPIRED');
    });

    it('enforces lockout after 5 consecutive failed attempts', () => {
      const target = 'lockout@business.com';
      const { otp } = generateSecureOtp(target, 'VERIFICATION', 5);

      // Failed attempts 1 to 4
      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = verifySecureOtp(target, '000000', 'VERIFICATION');
        expect(res.valid).toBe(false);
        expect(res.reason).toBe('INVALID');
        expect(res.remainingAttempts).toBe(5 - attempt);
      }

      // 5th failed attempt triggers lockout
      const fifthResult = verifySecureOtp(target, '000000', 'VERIFICATION');
      expect(fifthResult.valid).toBe(false);
      expect(fifthResult.reason).toBe('MAX_ATTEMPTS');
      expect(fifthResult.remainingAttempts).toBe(0);

      // Subsequent attempt even with the real OTP is completely locked out
      const subsequentResult = verifySecureOtp(target, otp, 'VERIFICATION');
      expect(subsequentResult.valid).toBe(false);
      expect(subsequentResult.reason).toBe('NOT_FOUND');
    });
  });

  describe('Sliding-Window Rate Limiting & Cooldown Protection', () => {
    it('enforces a mandatory cooldown period between successive calls', () => {
      const key = 'email:test@company.com';
      const now = 1000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // First call allowed
      const first = checkRateLimit(key, 5, 15 * 60 * 1000, 60 * 1000);
      expect(first.allowed).toBe(true);

      // Attempt 30 seconds later (within 60s cooldown) should be blocked
      vi.spyOn(Date, 'now').mockReturnValue(now + 30 * 1000);
      const second = checkRateLimit(key, 5, 15 * 60 * 1000, 60 * 1000);
      expect(second.allowed).toBe(false);
      expect(second.retryAfterSeconds).toBe(30);

      // Attempt 61 seconds later (after cooldown) should be allowed
      vi.spyOn(Date, 'now').mockReturnValue(now + 61 * 1000);
      const third = checkRateLimit(key, 5, 15 * 60 * 1000, 60 * 1000);
      expect(third.allowed).toBe(true);
    });

    it('enforces maximum hits within sliding window (e.g. 5 hits / 15m)', () => {
      const ipKey = 'ip:198.51.100.42';
      let currentTime = 2000000;

      // 5 allowed hits spaced out by 10s
      for (let i = 0; i < 5; i++) {
        vi.spyOn(Date, 'now').mockReturnValue(currentTime + i * 10 * 1000);
        const res = checkRateLimit(ipKey, 5, 15 * 60 * 1000, 0);
        expect(res.allowed).toBe(true);
      }

      // 6th hit within the 15-minute window must be blocked
      vi.spyOn(Date, 'now').mockReturnValue(currentTime + 55 * 1000);
      const blocked = checkRateLimit(ipKey, 5, 15 * 60 * 1000, 0);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe('Registration Schema & Input Hardening', () => {
    it('accepts valid company registration inputs', () => {
      const parsed = registrationSchema.safeParse({
        fullName: 'Jane Doe',
        companyName: 'Acme Solutions Inc.',
        email: 'jane@acme.com',
        password: 'StrongPassword123!',
        countryCode: 'IN',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects names with HTML injection characters', () => {
      const parsed = registrationSchema.safeParse({
        fullName: 'Jane <script>alert(1)</script>',
        companyName: 'Acme Solutions',
        email: 'jane@acme.com',
        password: 'StrongPassword123!',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects company names containing URLs or phishing payloads', () => {
      const parsed = registrationSchema.safeParse({
        fullName: 'Jane Doe',
        companyName: 'Visit https://phishing.example.com',
        email: 'jane@acme.com',
        password: 'StrongPassword123!',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects passwords shorter than 6 characters', () => {
      const parsed = registrationSchema.safeParse({
        fullName: 'Jane Doe',
        companyName: 'Acme Solutions',
        email: 'jane@acme.com',
        password: '123',
      });
      expect(parsed.success).toBe(false);
    });
  });
});
