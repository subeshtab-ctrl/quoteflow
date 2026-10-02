import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const DEVELOPER_ADMIN_EMAIL = 'm.subesh@outlook.com';
export const DEV_ADMIN_COOKIE_NAME = 'qf_dev_admin_session';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'admin-config.json');
const OTP_PATH = path.join(process.cwd(), 'data', 'admin-otp.json');

const SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.RAZORPAY_KEY_SECRET ||
  'quoteflow_developer_admin_secret_2026';

export interface DeveloperAdminConfig {
  email: string;
  passwordHash: string | null;
  salt: string | null;
  updatedAt: string | null;
}

interface OtpRecord {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

function ensureDataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

/**
 * Read current developer admin configuration
 */
export function getDeveloperAdminConfig(): DeveloperAdminConfig {
  ensureDataDir();
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        email: DEVELOPER_ADMIN_EMAIL,
        passwordHash: parsed.passwordHash || null,
        salt: parsed.salt || null,
        updatedAt: parsed.updatedAt || null,
      };
    }
  } catch {}
  return {
    email: DEVELOPER_ADMIN_EMAIL,
    passwordHash: null,
    salt: null,
    updatedAt: null,
  };
}

/**
 * Check whether a developer admin password has been established
 */
export function hasDeveloperAdminPassword(): boolean {
  const cfg = getDeveloperAdminConfig();
  return Boolean(cfg.passwordHash && cfg.salt);
}

/**
 * Hash a password using PBKDF2 with SHA-512 and unique salt
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Timing-safe password verification
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Set / update developer admin password
 */
export function setDeveloperAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  ensureDataDir();
  const { hash, salt } = hashPassword(newPassword);
  const cfg: DeveloperAdminConfig = {
    email: DEVELOPER_ADMIN_EMAIL,
    passwordHash: hash,
    salt,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  return true;
}

/**
 * Generate 6-digit OTP for developer admin verification
 */
export function generateAdminOtp(): string {
  ensureDataDir();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const record: OtpRecord = {
    code,
    email: DEVELOPER_ADMIN_EMAIL,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    attempts: 0,
  };
  fs.writeFileSync(OTP_PATH, JSON.stringify(record, null, 2), 'utf-8');
  return code;
}

/**
 * Verify 6-digit OTP
 */
export function verifyAdminOtp(inputCode: string): boolean {
  ensureDataDir();
  try {
    if (!fs.existsSync(OTP_PATH)) return false;
    const raw = fs.readFileSync(OTP_PATH, 'utf-8');
    const record: OtpRecord = JSON.parse(raw);

    if (!record || !record.code) return false;
    if (Date.now() > record.expiresAt) return false;
    if (record.attempts >= 5) return false;

    record.attempts += 1;
    fs.writeFileSync(OTP_PATH, JSON.stringify(record, null, 2), 'utf-8');

    if (record.code === inputCode.trim()) {
      // Clear OTP on successful verification
      try {
        fs.unlinkSync(OTP_PATH);
      } catch {}
      return true;
    }
  } catch {}
  return false;
}

/**
 * Create a signed, tamper-proof session token for developer admin
 */
export function createAdminSessionToken(): string {
  const timestamp = Date.now();
  const payload = `${DEVELOPER_ADMIN_EMAIL}:${timestamp}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

/**
 * Verify session token authenticity and age (max 7 days)
 */
export function verifyAdminSessionToken(token: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split(':');
    if (parts.length !== 3) return false;
    const [email, tsStr, sig] = parts;
    if (email.toLowerCase() !== DEVELOPER_ADMIN_EMAIL.toLowerCase()) return false;

    const ts = parseInt(tsStr, 10);
    if (isNaN(ts)) return false;

    // 7-day validity
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - ts > maxAge) return false;

    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(`${email}:${tsStr}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Central Developer Admin Guard:
 * Strictly verifies that the request belongs to m.subesh@outlook.com
 */
export async function isAuthorizedDeveloperAdmin(req?: NextRequest): Promise<boolean> {
  // 1. Check custom test key header if configured
  const customKey = req?.headers.get('x-dev-admin-secret');
  if (customKey && process.env.DEV_ADMIN_SECRET && customKey === process.env.DEV_ADMIN_SECRET) {
    return true;
  }

  // 2. Check signed HTTP-only cookie
  let sessionCookie: string | undefined;
  if (req) {
    sessionCookie = req.cookies.get(DEV_ADMIN_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      sessionCookie = cookieStore.get(DEV_ADMIN_COOKIE_NAME)?.value;
    } catch {}
  }

  if (sessionCookie && verifyAdminSessionToken(sessionCookie)) {
    return true;
  }

  // 3. Check active Supabase authenticated user
  try {
    const auth = await getAuthenticatedUserContext();
    if (auth && auth.email.toLowerCase() === DEVELOPER_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
  } catch {}

  return false;
}
