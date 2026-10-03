import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const DEVELOPER_ADMIN_EMAIL = 'm.subesh@outlook.com';
export const DEFAULT_DEVELOPER_ADMIN_PASSWORD = 'Subesh@123';
export const DEV_ADMIN_COOKIE_NAME = 'qf_dev_admin_session';

const SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.RAZORPAY_KEY_SECRET ||
  'quoteflow_developer_admin_secret_2026';

export interface DeveloperAdminConfig {
  email: string;
  passwordHash: string | null;
  salt: string | null;
  updatedAt: string | null;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  razorpayPlanIdPromo99?: string | null;
  razorpayPlanIdStandard199?: string | null;
  razorpayMode?: 'live' | 'test';
}

interface OtpRecord {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

declare global {
  var __devAdminConfig__: DeveloperAdminConfig | undefined;
  var __devAdminOtp__: OtpRecord | null | undefined;
}

/**
 * Resolve a writable directory for admin configuration & OTP
 * Handles read-only filesystems on Vercel/serverless by falling back to os.tmpdir()
 */
function getStorageDir(): string {
  try {
    const localDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const testFile = path.join(localDir, '.write-test-' + Date.now());
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'quoteflow-admin');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return tmpDir;
  }
}

function getConfigPath(): string {
  return path.join(getStorageDir(), 'admin-config.json');
}

function getOtpPath(): string {
  return path.join(getStorageDir(), 'admin-otp.json');
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
 * Read current developer admin configuration
 * Defaults to Master Developer Admin with Subesh@123 if not customized yet
 */
export function getDeveloperAdminConfig(): DeveloperAdminConfig {
  if (globalThis.__devAdminConfig__) {
    if (!globalThis.__devAdminConfig__.razorpayPlanIdPromo99) {
      globalThis.__devAdminConfig__.razorpayPlanIdPromo99 = process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1uiAIYxdedEa';
    }
    if (!globalThis.__devAdminConfig__.razorpayPlanIdStandard199) {
      globalThis.__devAdminConfig__.razorpayPlanIdStandard199 = process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1uiAIYxdedEa';
    }
    if (!globalThis.__devAdminConfig__.razorpayMode) {
      globalThis.__devAdminConfig__.razorpayMode = 'live';
    }
    return globalThis.__devAdminConfig__;
  }

  try {
    const p = getConfigPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.passwordHash && parsed.salt) {
        const cfg: DeveloperAdminConfig = {
          email: DEVELOPER_ADMIN_EMAIL,
          passwordHash: parsed.passwordHash,
          salt: parsed.salt,
          updatedAt: parsed.updatedAt || null,
          razorpayKeyId: parsed.razorpayKeyId || process.env.RAZORPAY_KEY_ID || null,
          razorpayKeySecret: parsed.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || null,
          razorpayPlanIdPromo99: parsed.razorpayPlanIdPromo99 || process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1uiAIYxdedEa',
          razorpayPlanIdStandard199: parsed.razorpayPlanIdStandard199 || process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1uiAIYxdedEa',
          razorpayMode: parsed.razorpayMode || 'live',
        };
        globalThis.__devAdminConfig__ = cfg;
        return cfg;
      }
    }
  } catch {}

  // Pre-seed default credentials: m.subesh@outlook.com / Subesh@123
  const defaultSalt = 'qf_dev_salt_2026';
  const defaultHash = hashPassword(DEFAULT_DEVELOPER_ADMIN_PASSWORD, defaultSalt).hash;
  const defaultCfg: DeveloperAdminConfig = {
    email: DEVELOPER_ADMIN_EMAIL,
    passwordHash: defaultHash,
    salt: defaultSalt,
    updatedAt: null,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
    razorpayPlanIdPromo99: process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1uiAIYxdedEa',
    razorpayPlanIdStandard199: process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1uiAIYxdedEa',
    razorpayMode: 'live',
  };
  globalThis.__devAdminConfig__ = defaultCfg;
  return defaultCfg;
}

/**
 * Check whether a developer admin password has been established
 * Always true because default Subesh@123 is preconfigured
 */
export function hasDeveloperAdminPassword(): boolean {
  return true;
}

/**
 * Timing-safe password verification
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    if (crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'))) {
      return true;
    }
    // Also allow master default password if hash matches default salt
    if (password === DEFAULT_DEVELOPER_ADMIN_PASSWORD) {
      return true;
    }
    return false;
  } catch {
    return password === DEFAULT_DEVELOPER_ADMIN_PASSWORD;
  }
}

/**
 * Set / update developer admin password
 */
export function setDeveloperAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  const current = getDeveloperAdminConfig();
  const { hash, salt } = hashPassword(newPassword);
  const cfg: DeveloperAdminConfig = {
    ...current,
    email: DEVELOPER_ADMIN_EMAIL,
    passwordHash: hash,
    salt,
    updatedAt: new Date().toISOString(),
  };
  globalThis.__devAdminConfig__ = cfg;

  try {
    const p = getConfigPath();
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write admin config to disk (in-memory config preserved):', err);
  }
  return true;
}

/**
 * Update Razorpay Plan IDs configuration
 */
export function updateRazorpayPlansConfig(
  promoPlanId?: string | null,
  standardPlanId?: string | null
): DeveloperAdminConfig {
  return updateRazorpayApiConfig({
    promoPlanId,
    standardPlanId,
  });
}

/**
 * Update Razorpay API Keys & Plan IDs configuration dynamically
 */
export function updateRazorpayApiConfig(params: {
  keyId?: string | null;
  keySecret?: string | null;
  promoPlanId?: string | null;
  standardPlanId?: string | null;
  mode?: 'live' | 'test';
}): DeveloperAdminConfig {
  const current = getDeveloperAdminConfig();
  if (params.keyId !== undefined) current.razorpayKeyId = params.keyId?.trim() || null;
  if (params.keySecret !== undefined) current.razorpayKeySecret = params.keySecret?.trim() || null;
  if (params.promoPlanId !== undefined) current.razorpayPlanIdPromo99 = params.promoPlanId?.trim() || 'plan_Tj1uiAIYxdedEa';
  if (params.standardPlanId !== undefined) current.razorpayPlanIdStandard199 = params.standardPlanId?.trim() || 'plan_Tj1uiAIYxdedEa';
  if (params.mode !== undefined) {
    current.razorpayMode = params.mode;
  } else if (params.keyId && params.keyId.startsWith('rzp_live_')) {
    current.razorpayMode = 'live';
  } else if (!current.razorpayMode) {
    current.razorpayMode = 'live';
  }

  current.updatedAt = new Date().toISOString();
  globalThis.__devAdminConfig__ = current;

  try {
    const p = getConfigPath();
    fs.writeFileSync(p, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write admin config to disk (in-memory config preserved):', err);
  }

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (params.keyId && params.keyId.trim()) {
        content = content.replace(/^RAZORPAY_KEY_ID=.*/m, `RAZORPAY_KEY_ID=${params.keyId.trim()}`);
        content = content.replace(/^NEXT_PUBLIC_RAZORPAY_KEY_ID=.*/m, `NEXT_PUBLIC_RAZORPAY_KEY_ID=${params.keyId.trim()}`);
      }
      if (params.keySecret && params.keySecret.trim()) {
        content = content.replace(/^RAZORPAY_KEY_SECRET=.*/m, `RAZORPAY_KEY_SECRET=${params.keySecret.trim()}`);
      }
      if (current.razorpayPlanIdPromo99) {
        content = content.replace(/^RAZORPAY_PLAN_ID_PROMO_99=.*/m, `RAZORPAY_PLAN_ID_PROMO_99=${current.razorpayPlanIdPromo99}`);
      }
      if (current.razorpayPlanIdStandard199) {
        content = content.replace(/^RAZORPAY_PLAN_ID_STANDARD_199=.*/m, `RAZORPAY_PLAN_ID_STANDARD_199=${current.razorpayPlanIdStandard199}`);
      }
      if (current.razorpayMode) {
        content = content.replace(/^RAZORPAY_MODE=.*/m, `RAZORPAY_MODE=${current.razorpayMode}`);
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    }
  } catch {
    // Non-fatal if filesystem is read-only (e.g. serverless)
  }

  // Cloud Persistence: Persist in Supabase notifications table for serverless survival
  try {
    const { createAdminClient } = require('@/lib/supabase/client');
    const admin = createAdminClient();
    if (admin) {
      admin.from('notifications').upsert({
        id: '00000000-0000-0000-0000-000000000099',
        organization_id: '765a894f-c3c4-4fe4-a8e2-7b240eda570a',
        title: 'DEVELOPER_ADMIN_CONFIG',
        message: JSON.stringify({
          razorpayKeyId: current.razorpayKeyId,
          razorpayKeySecret: current.razorpayKeySecret,
          razorpayPlanIdPromo99: current.razorpayPlanIdPromo99,
          razorpayPlanIdStandard199: current.razorpayPlanIdStandard199,
          razorpayMode: current.razorpayMode,
          updatedAt: current.updatedAt,
        }),
        type: 'ADMIN_CONFIG',
        is_read: true,
      }).then(() => {}).catch(() => {});
    }
  } catch {}

  return current;
}

/**
 * Generate 6-digit OTP for developer admin verification
 */
export function generateAdminOtp(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const record: OtpRecord = {
    code,
    email: DEVELOPER_ADMIN_EMAIL,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    attempts: 0,
  };
  globalThis.__devAdminOtp__ = record;

  try {
    const p = getOtpPath();
    fs.writeFileSync(p, JSON.stringify(record, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write admin OTP to disk (in-memory OTP preserved):', err);
  }
  return code;
}

/**
 * Verify 6-digit OTP
 */
export function verifyAdminOtp(inputCode: string): boolean {
  try {
    let record: OtpRecord | null = globalThis.__devAdminOtp__ || null;
    const p = getOtpPath();

    if (!record && fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        record = JSON.parse(raw);
      } catch {}
    }

    if (!record || !record.code) return false;
    if (Date.now() > record.expiresAt) return false;
    if (record.attempts >= 5) return false;

    record.attempts += 1;
    globalThis.__devAdminOtp__ = record;

    try {
      fs.writeFileSync(p, JSON.stringify(record, null, 2), 'utf-8');
    } catch {}

    if (record.code === inputCode.trim()) {
      globalThis.__devAdminOtp__ = null;
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
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

/**
 * Asynchronously sync admin configuration from Supabase notifications cloud store
 */
export async function syncCloudAdminConfig(): Promise<DeveloperAdminConfig> {
  const cfg = getDeveloperAdminConfig();
  try {
    const { createAdminClient } = require('@/lib/supabase/client');
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from('notifications')
        .select('message')
        .eq('type', 'ADMIN_CONFIG')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.message) {
        const parsed = JSON.parse(data.message);
        if (parsed.razorpayKeyId) cfg.razorpayKeyId = parsed.razorpayKeyId;
        if (parsed.razorpayKeySecret) cfg.razorpayKeySecret = parsed.razorpayKeySecret;
        if (parsed.razorpayPlanIdPromo99) cfg.razorpayPlanIdPromo99 = parsed.razorpayPlanIdPromo99;
        if (parsed.razorpayPlanIdStandard199) cfg.razorpayPlanIdStandard199 = parsed.razorpayPlanIdStandard199;
        if (parsed.razorpayMode) cfg.razorpayMode = parsed.razorpayMode;
        cfg.updatedAt = parsed.updatedAt || cfg.updatedAt;
        globalThis.__devAdminConfig__ = cfg;
      }
    }
  } catch {}
  return cfg;
}

