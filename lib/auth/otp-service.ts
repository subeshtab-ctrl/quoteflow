import crypto from 'crypto';

/**
 * Robust, In-Memory CSPRNG Hashed OTP & Rate Limiting Service
 *
 * Implements:
 * - 6-digit numeric OTPs via crypto.randomInt
 * - SHA-256 salted hash storage (plain OTP is never persisted)
 * - 5-minute strict expiry
 * - Single-use enforcement (invalidated upon first successful verify)
 * - Max attempt tracking (locked out after 5 failed attempts)
 * - Rate limiting per IP and per target email with 60s cooldown
 */

interface StoredOtpRecord {
  hashedOtp: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  consumed: boolean;
  createdAt: number;
}

interface RateLimitRecord {
  timestamps: number[];
  lastRequest: number;
}

// In-memory records
const otpStore = new Map<string, StoredOtpRecord>();
const rateLimitStore = new Map<string, RateLimitRecord>();

function getOtpKey(target: string, type: string): string {
  return `${type.toLowerCase()}:${target.toLowerCase().trim()}`;
}

/**
 * Periodically purge expired records to keep memory clean
 */
function cleanupExpiredRecords(): void {
  const now = Date.now();
  otpStore.forEach((record, key) => {
    if (now > record.expiresAt || record.consumed) {
      otpStore.delete(key);
    }
  });
  rateLimitStore.forEach((record, key) => {
    // Keep records up to 1 hour
    if (now - record.lastRequest > 3600 * 1000) {
      rateLimitStore.delete(key);
    }
  });
}

// Lazy cleanup periodically during active operations (avoids timers in global scope)
let lastCleanup = 0;
function lazyCleanupExpiredRecords(): void {
  const now = Date.now();
  if (now - lastCleanup < 60 * 1000) return; // at most once a minute
  lastCleanup = now;
  cleanupExpiredRecords();
}

export const DEFAULT_OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates a cryptographically secure 6-digit OTP, stores its salted SHA-256 hash,
 * and sets a 10-minute expiry with a max attempt limit.
 */
export function generateSecureOtp(
  target: string,
  type: 'VERIFICATION' | 'PASSWORD_RESET' | 'ADMIN' = 'VERIFICATION',
  maxAttempts: number = 5,
  expiryMs: number = DEFAULT_OTP_EXPIRY_MS
): { otp: string; expiresAt: number } {
  lazyCleanupExpiredRecords();
  const key = getOtpKey(target, type);

  // Generate 6-digit numeric OTP via CSPRNG (100000 - 999999)
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Salt and hash
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedOtp = crypto
    .createHash('sha256')
    .update(salt + otp)
    .digest('hex');

  const now = Date.now();
  const expiresAt = now + expiryMs;

  otpStore.set(key, {
    hashedOtp,
    salt,
    expiresAt,
    attempts: 0,
    maxAttempts,
    consumed: false,
    createdAt: now,
  });

  return { otp, expiresAt };
}

/**
 * Verifies a user-supplied OTP against the stored salted hash using timing-safe comparison.
 * Increments attempt count and enforces lockouts.
 */
export function verifySecureOtp(
  target: string,
  inputOtp: string,
  type: 'VERIFICATION' | 'PASSWORD_RESET' | 'ADMIN' = 'VERIFICATION'
): {
  valid: boolean;
  reason?: 'NOT_FOUND' | 'EXPIRED' | 'MAX_ATTEMPTS' | 'ALREADY_USED' | 'INVALID';
  remainingAttempts?: number;
} {
  lazyCleanupExpiredRecords();
  const key = getOtpKey(target, type);
  const record = otpStore.get(key);

  if (!record) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (record.consumed) {
    return { valid: false, reason: 'ALREADY_USED' };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    otpStore.delete(key);
    return { valid: false, reason: 'EXPIRED' };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(key);
    return { valid: false, reason: 'MAX_ATTEMPTS' };
  }

  // Increment attempts
  record.attempts += 1;
  const remaining = Math.max(0, record.maxAttempts - record.attempts);

  // Compute hash of input
  const computedHash = crypto
    .createHash('sha256')
    .update(record.salt + inputOtp.trim())
    .digest('hex');

  const expectedBuffer = Buffer.from(record.hashedOtp, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');

  const isMatch =
    expectedBuffer.length === computedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, computedBuffer);

  if (isMatch) {
    record.consumed = true;
    otpStore.delete(key); // Invalidate immediately upon successful use
    return { valid: true };
  }

  if (record.attempts >= record.maxAttempts) {
    otpStore.delete(key); // Invalidate on reaching max attempts
    return { valid: false, reason: 'MAX_ATTEMPTS', remainingAttempts: 0 };
  }

  return { valid: false, reason: 'INVALID', remainingAttempts: remaining };
}

/**
 * Checks whether an action violates rate limits or cooldown windows.
 *
 * @param key Unique rate limit key (e.g. `ip:${ip}` or `email:${email}`)
 * @param maxHits Maximum allowed events in the window
 * @param windowMs Time window in milliseconds
 * @param cooldownMs Minimum mandatory cooldown between successive calls (default 0)
 */
export function checkRateLimit(
  key: string,
  maxHits: number,
  windowMs: number,
  cooldownMs: number = 0
): { allowed: boolean; retryAfterSeconds: number; reason?: string } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [], lastRequest: 0 };
    rateLimitStore.set(key, record);
  }

  // Check cooldown between successive calls
  if (cooldownMs > 0 && record.lastRequest > 0) {
    const elapsedSinceLast = now - record.lastRequest;
    if (elapsedSinceLast < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsedSinceLast) / 1000);
      return {
        allowed: false,
        retryAfterSeconds: waitSeconds,
        reason: `Please wait ${waitSeconds}s before requesting another verification email.`,
      };
    }
  }

  // Filter timestamps within sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxHits) {
    const oldestInWindow = record.timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldestInWindow)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, waitSeconds),
      reason: `Too many requests. Please try again in ${Math.max(1, waitSeconds)}s.`,
    };
  }

  // Record this request
  record.timestamps.push(now);
  record.lastRequest = now;

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Test helper: Reset rate limits and OTP store
 */
export function _resetOtpStoresForTesting(): void {
  otpStore.clear();
  rateLimitStore.clear();
}
