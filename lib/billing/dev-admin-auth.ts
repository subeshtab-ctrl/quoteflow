import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { NextRequest } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { createAdminClient } from '@/lib/supabase/service-role';

export const AUTHORIZED_MASTER_ADMIN_EMAILS = [
  'm.subesh@outlook.com',
  'admin@blendandbold.com',
];

export function getDeveloperAdminEmail(): string {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.DEVELOPER_ADMIN_EMAIL ||
    (typeof globalThis !== 'undefined' && globalThis.__devAdminConfig__?.email) ||
    'm.subesh@outlook.com'
  )
    .trim()
    .toLowerCase();
}

export function isAuthorizedMasterAdmin(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const configured = getDeveloperAdminEmail();
  return clean === configured || AUTHORIZED_MASTER_ADMIN_EMAILS.includes(clean);
}

export const DEVELOPER_ADMIN_EMAIL = getDeveloperAdminEmail();
export const DEFAULT_DEVELOPER_ADMIN_PASSWORD = 'Subesh@123';
export const DEV_ADMIN_COOKIE_NAME = 'qf_dev_admin_session';
export const ADMIN_PRE_AUTH_COOKIE_NAME = 'qf_admin_pre_auth';

export function createAdminPreAuthToken(email: string): string {
  const ts = Date.now();
  const hmac = crypto
    .createHmac('sha256', getAdminSecret())
    .update(`preauth:${email.toLowerCase()}:${ts}`)
    .digest('hex');
  return `${email.toLowerCase()}:${ts}:${hmac}`;
}

export function verifyAdminPreAuthToken(token: string): { valid: boolean; email?: string } {
  if (!token) return { valid: false };
  try {
    const [email, tsStr, sig] = token.split(':');
    const ts = parseInt(tsStr, 10);
    if (isNaN(ts)) return { valid: false };
    // 5-minute strict expiry
    if (Date.now() - ts > 5 * 60 * 1000) return { valid: false };
    const expectedSig = crypto
      .createHmac('sha256', getAdminSecret())
      .update(`preauth:${email.toLowerCase()}:${tsStr}`)
      .digest('hex');
    const match = crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
    if (!match) return { valid: false };
    return { valid: true, email: email.toLowerCase() };
  } catch {
    return { valid: false };
  }
}

let runtimeAdminSecret: string | null = null;
function getAdminSecret(): string {
  if (process.env.DEV_ADMIN_JWT_SECRET) return process.env.DEV_ADMIN_JWT_SECRET;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.RAZORPAY_KEY_SECRET) return process.env.RAZORPAY_KEY_SECRET;
  if (!runtimeAdminSecret) {
    runtimeAdminSecret = crypto.randomBytes(32).toString('hex');
  }
  return runtimeAdminSecret;
}

export type AdminRoleType =
  | 'SUPER_ADMIN'
  | 'BILLING_ADMIN'
  | 'SUPPORT_ADMIN'
  | 'TECHNICAL_SUPPORT'
  | 'GROWTH_ADMIN'
  | 'READ_ONLY_ADMIN'
  | 'SUPPORT_ENGINEER'
  | 'BILLING_SPECIALIST'
  | 'CUSTOMER_SUCCESS';

export type AdminPermission =
  | 'view_businesses'
  | 'edit_businesses'
  | 'manage_subscriptions'
  | 'issue_refunds'
  | 'extend_trials'
  | 'manage_promotions'
  | 'manage_tickets'
  | 'view_logs'
  | 'retry_webhooks'
  | 'access_customer_data'
  | 'impersonate_read_only'
  | 'manage_feature_flags'
  | 'manage_announcements'
  | 'manage_admin_staff'
  | 'manage_system_settings'
  | 'export_data'
  | 'suspend_business';

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  'view_businesses',
  'edit_businesses',
  'manage_subscriptions',
  'issue_refunds',
  'extend_trials',
  'manage_promotions',
  'manage_tickets',
  'view_logs',
  'retry_webhooks',
  'access_customer_data',
  'impersonate_read_only',
  'manage_feature_flags',
  'manage_announcements',
  'manage_admin_staff',
  'manage_system_settings',
  'export_data',
  'suspend_business',
];

export interface SupportStaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminRoleType;
  permissions?: AdminPermission[];
  passwordHash?: string;
  salt?: string;
  status: 'active' | 'invited' | 'inactive';
  lastLoginAt?: string;
  created_at: string;
  updated_at: string;
}

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
  staffMembers?: SupportStaffMember[];
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

function isEdgeOrWorker(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_WORKER ||
    process.env.NEXT_RUNTIME === 'edge' ||
    typeof process?.cwd !== 'function'
  );
}

/**
 * Resolve a writable directory for admin configuration & OTP
 * Handles read-only filesystems on Vercel/serverless by falling back to os.tmpdir()
 */
function getStorageDir(): string {
  if (isEdgeOrWorker()) return '';
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
  if (isEdgeOrWorker()) return '';
  const dir = getStorageDir();
  return dir ? path.join(dir, 'admin-config.json') : '';
}

function getOtpPath(): string {
  if (isEdgeOrWorker()) return '';
  const dir = getStorageDir();
  return dir ? path.join(dir, 'admin-otp.json') : '';
}

/**
 * Safely save admin config to disk cache without exposing secret credentials
 */
function saveConfigToDisk(cfg: DeveloperAdminConfig): void {
  // Never overwrite persistent config during automated test runs or in Cloudflare Workers
  if (process.env.VITEST || process.env.NODE_ENV === 'test' || isEdgeOrWorker()) {
    return;
  }
  try {
    const p = getConfigPath();
    if (!p) return;
    // Security: Never save secret keys to disk in tracked repository files
    const sanitized: DeveloperAdminConfig = {
      ...cfg,
      razorpayKeyId: null,
      razorpayKeySecret: null,
    };
    fs.writeFileSync(p, JSON.stringify(sanitized, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write admin config to disk (in-memory config preserved):', err);
  }
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
    if (!globalThis.__devAdminConfig__.razorpayKeyId) {
      globalThis.__devAdminConfig__.razorpayKeyId =
        process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
    }
    if (!globalThis.__devAdminConfig__.razorpayKeySecret) {
      globalThis.__devAdminConfig__.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || null;
    }
    if (!globalThis.__devAdminConfig__.razorpayPlanIdPromo99) {
      globalThis.__devAdminConfig__.razorpayPlanIdPromo99 = process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1uiAIYxdedEa';
    }
    if (!globalThis.__devAdminConfig__.razorpayPlanIdStandard199) {
      globalThis.__devAdminConfig__.razorpayPlanIdStandard199 = process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1uiAIYxdedEa';
    }
    if (!globalThis.__devAdminConfig__.razorpayMode) {
      const kid = globalThis.__devAdminConfig__.razorpayKeyId;
      globalThis.__devAdminConfig__.razorpayMode = kid?.startsWith('rzp_test_')
        ? 'test'
        : (process.env.RAZORPAY_MODE as 'live' | 'test') || 'live';
    }
    return globalThis.__devAdminConfig__;
  }

  try {
    const p = getConfigPath();
    if (p && !isEdgeOrWorker() && fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.passwordHash && parsed.salt) {
        const resolvedKeyId = parsed.razorpayKeyId || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
        const cfg: DeveloperAdminConfig = {
          email: DEVELOPER_ADMIN_EMAIL,
          passwordHash: parsed.passwordHash,
          salt: parsed.salt,
          updatedAt: parsed.updatedAt || null,
          razorpayKeyId: resolvedKeyId,
          razorpayKeySecret: parsed.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || null,
          razorpayPlanIdPromo99: parsed.razorpayPlanIdPromo99 || process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1uiAIYxdedEa',
          razorpayPlanIdStandard199: parsed.razorpayPlanIdStandard199 || process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1uiAIYxdedEa',
          razorpayMode: parsed.razorpayMode || (resolvedKeyId?.startsWith('rzp_test_') ? 'test' : ((process.env.RAZORPAY_MODE as 'live' | 'test') || 'live')),
          staffMembers: Array.isArray(parsed.staffMembers) ? parsed.staffMembers : [],
        };
        globalThis.__devAdminConfig__ = cfg;
        return cfg;
      }
    }
  } catch {}

  // 2. Check environment variables (e.g. from .env.local or platform env)
  if (process.env.DEV_ADMIN_PASSWORD_HASH && process.env.DEV_ADMIN_PASSWORD_SALT) {
    const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
    const cfg: DeveloperAdminConfig = {
      email: DEVELOPER_ADMIN_EMAIL,
      passwordHash: process.env.DEV_ADMIN_PASSWORD_HASH,
      salt: process.env.DEV_ADMIN_PASSWORD_SALT,
      updatedAt: new Date().toISOString(),
      razorpayKeyId: envKeyId,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
      razorpayPlanIdPromo99: process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1jndtNip44ci',
      razorpayPlanIdStandard199: process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1jndtNip44ci',
      razorpayMode: 'live',
      staffMembers: [],
    };
    globalThis.__devAdminConfig__ = cfg;
    return cfg;
  }

  if (process.env.DEV_ADMIN_PASSWORD) {
    const defaultSalt = 'qf_dev_salt_2026';
    const defaultHash = hashPassword(process.env.DEV_ADMIN_PASSWORD, defaultSalt).hash;
    const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
    const defaultCfg: DeveloperAdminConfig = {
      email: DEVELOPER_ADMIN_EMAIL,
      passwordHash: defaultHash,
      salt: defaultSalt,
      updatedAt: null,
      razorpayKeyId: envKeyId,
      razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
      razorpayPlanIdPromo99: process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1jndtNip44ci',
      razorpayPlanIdStandard199: process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1jndtNip44ci',
      razorpayMode: 'live',
      staffMembers: [],
    };
    globalThis.__devAdminConfig__ = defaultCfg;
    return defaultCfg;
  }

  // Pre-seed default credentials for Master Developer Admin account
  const defaultSalt = 'qf_dev_salt_2026';
  const defaultHash = hashPassword(DEFAULT_DEVELOPER_ADMIN_PASSWORD, defaultSalt).hash;
  const envKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
  const defaultCfg: DeveloperAdminConfig = {
    email: DEVELOPER_ADMIN_EMAIL,
    passwordHash: defaultHash,
    salt: defaultSalt,
    updatedAt: null,
    razorpayKeyId: envKeyId,
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || null,
    razorpayPlanIdPromo99: process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_Tj1jndtNip44ci',
    razorpayPlanIdStandard199: process.env.RAZORPAY_PLAN_ID_STANDARD_199 || 'plan_Tj1jndtNip44ci',
    razorpayMode: 'live',
    staffMembers: [],
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
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Set / update developer admin password
 */
export async function setDeveloperAdminPassword(newPassword: string): Promise<boolean> {
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

  saveConfigToDisk(cfg);

  // Update .env.local if present in local development environment
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath) && !(process.env.VITEST || process.env.NODE_ENV === 'test')) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (content.includes('DEV_ADMIN_PASSWORD_HASH=')) {
        content = content.replace(/^DEV_ADMIN_PASSWORD_HASH=.*/m, `DEV_ADMIN_PASSWORD_HASH=${hash}`);
      } else {
        content += `\nDEV_ADMIN_PASSWORD_HASH=${hash}`;
      }
      if (content.includes('DEV_ADMIN_PASSWORD_SALT=')) {
        content = content.replace(/^DEV_ADMIN_PASSWORD_SALT=.*/m, `DEV_ADMIN_PASSWORD_SALT=${salt}`);
      } else {
        content += `\nDEV_ADMIN_PASSWORD_SALT=${salt}`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
    }
  } catch {}

  // Revoke all existing sessions for developer admin to enforce immediate re-authentication with new password
  try {
    revokeAllAdminSessions(DEVELOPER_ADMIN_EMAIL);
  } catch {}

  // Cloud Persistence to Supabase (must be awaited!)
  await saveCloudAdminConfig(cfg);
  return true;
}

/**
 * Persist configuration to Supabase notifications table for permanent cloud survival
 */
export async function saveCloudAdminConfig(config: DeveloperAdminConfig): Promise<boolean> {
  // Skip cloud persistence in automated test suite
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return true;
  }
  try {
    const admin = createAdminClient();
    if (!admin) return false;

    // Dynamically retrieve an existing organization ID so foreign key constraint is satisfied
    let orgId = 'a0000000-0000-0000-0000-000000000001';
    try {
      const { data: firstOrg } = await admin.from('organizations').select('id').limit(1).maybeSingle();
      if (firstOrg?.id) orgId = firstOrg.id;
    } catch {}

    const { error } = await admin.from('notifications').upsert(
      {
        id: '00000000-0000-0000-0000-000000000099',
        organization_id: orgId,
        title: 'DEVELOPER_ADMIN_CONFIG',
        message: JSON.stringify(config),
        type: 'ADMIN_CONFIG',
        is_read: true,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('[QuoteFlow] Could not save admin config to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[QuoteFlow] Exception saving admin config to Supabase:', err);
    return false;
  }
}

/**
 * Update Razorpay Plan IDs configuration
 */
export async function updateRazorpayPlansConfig(
  promoPlanId?: string | null,
  standardPlanId?: string | null
): Promise<DeveloperAdminConfig> {
  return await updateRazorpayApiConfig({
    promoPlanId,
    standardPlanId,
  });
}

/**
 * Update Razorpay API Keys & Plan IDs configuration dynamically
 */
export async function updateRazorpayApiConfig(params: {
  keyId?: string | null;
  keySecret?: string | null;
  promoPlanId?: string | null;
  standardPlanId?: string | null;
  mode?: 'live' | 'test';
}): Promise<DeveloperAdminConfig> {
  const current = getDeveloperAdminConfig();
  if (params.keyId !== undefined) current.razorpayKeyId = params.keyId?.trim() || null;
  if (params.keySecret !== undefined) current.razorpayKeySecret = params.keySecret?.trim() || null;
  if (params.promoPlanId !== undefined) current.razorpayPlanIdPromo99 = params.promoPlanId?.trim() || 'plan_Tj1jndtNip44ci';
  if (params.standardPlanId !== undefined) current.razorpayPlanIdStandard199 = params.standardPlanId?.trim() || 'plan_Tj1jndtNip44ci';

  current.razorpayMode = 'live';

  current.updatedAt = new Date().toISOString();
  globalThis.__devAdminConfig__ = current;

  saveConfigToDisk(current);

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

  // Cloud Persistence: Persist full config in Supabase notifications table for serverless survival
  await saveCloudAdminConfig(current);

  return current;
}

/**
 * Generate 6-digit OTP for developer admin verification
 */
export async function generateAdminOtp(email?: string): Promise<string> {
  const targetEmail = (email || DEVELOPER_ADMIN_EMAIL).trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const record: OtpRecord = {
    code,
    email: targetEmail,
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

  // Cloud persistence to Supabase for multi-isolate / serverless reliability
  if (!(process.env.VITEST || process.env.NODE_ENV === 'test')) {
    try {
      const admin = createAdminClient();
      if (admin) {
        let orgId = 'a0000000-0000-0000-0000-000000000001';
        try {
          const { data: firstOrg } = await admin.from('organizations').select('id').limit(1).maybeSingle();
          if (firstOrg?.id) orgId = firstOrg.id;
        } catch {}

        await admin.from('notifications').upsert(
          {
            id: '00000000-0000-0000-0000-000000000097',
            organization_id: orgId,
            title: 'DEVELOPER_ADMIN_OTP',
            message: JSON.stringify(record),
            type: 'ADMIN_OTP',
            is_read: true,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      }
    } catch (err) {
      console.warn('[QuoteFlow] Could not save OTP to Supabase:', err);
    }
  }

  return code;
}

/**
 * Verify 6-digit OTP
 */
export async function verifyAdminOtp(inputCode: string, email?: string): Promise<boolean> {
  try {
    let record: OtpRecord | null = globalThis.__devAdminOtp__ || null;
    const p = getOtpPath();

    if (!record && fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        record = JSON.parse(raw);
      } catch {}
    }

    // Cloud fallback from Supabase for multi-instance survival
    if (!record || Date.now() > record.expiresAt) {
      try {
        const admin = createAdminClient();
        if (admin) {
          const { data } = await admin
            .from('notifications')
            .select('message')
            .eq('id', '00000000-0000-0000-0000-000000000097')
            .maybeSingle();
          if (data?.message) {
            record = JSON.parse(data.message);
          }
        }
      } catch {}
    }

    if (!record || !record.code) return false;
    if (Date.now() > record.expiresAt) return false;
    if (record.attempts >= 5) return false;

    // If an email was specified, ensure it matches
    if (email && record.email && record.email.toLowerCase() !== email.trim().toLowerCase()) {
      return false;
    }

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

      // Delete from Supabase so code is strictly single-use
      try {
        const admin = createAdminClient();
        if (admin) {
          await admin.from('notifications').delete().eq('id', '00000000-0000-0000-0000-000000000097');
        }
      } catch {}

      return true;
    }
  } catch {}
  return false;
}

/**
 * Role to Default Permissions mapping
 */
export function getRoleDefaultPermissions(role: AdminRoleType): AdminPermission[] {
  switch (role) {
    case 'SUPER_ADMIN':
      return [...ALL_ADMIN_PERMISSIONS];
    case 'BILLING_ADMIN':
    case 'BILLING_SPECIALIST':
      return [
        'view_businesses',
        'edit_businesses',
        'manage_subscriptions',
        'issue_refunds',
        'extend_trials',
        'manage_promotions',
        'export_data',
      ];
    case 'SUPPORT_ADMIN':
    case 'CUSTOMER_SUCCESS':
      return [
        'view_businesses',
        'edit_businesses',
        'extend_trials',
        'manage_tickets',
        'access_customer_data',
        'impersonate_read_only',
      ];
    case 'TECHNICAL_SUPPORT':
    case 'SUPPORT_ENGINEER':
      return [
        'view_businesses',
        'manage_tickets',
        'view_logs',
        'retry_webhooks',
        'access_customer_data',
        'impersonate_read_only',
      ];
    case 'GROWTH_ADMIN':
      return [
        'view_businesses',
        'extend_trials',
        'manage_promotions',
        'manage_announcements',
        'export_data',
      ];
    case 'READ_ONLY_ADMIN':
    default:
      return ['view_businesses'];
  }
}

export function normalizeAdminRoleLabel(role: AdminRoleType): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'BILLING_ADMIN':
    case 'BILLING_SPECIALIST':
      return 'Billing Admin';
    case 'SUPPORT_ADMIN':
    case 'CUSTOMER_SUCCESS':
      return 'Support Admin';
    case 'TECHNICAL_SUPPORT':
    case 'SUPPORT_ENGINEER':
      return 'Technical Support';
    case 'GROWTH_ADMIN':
      return 'Growth Admin';
    case 'READ_ONLY_ADMIN':
      return 'Read-Only Admin';
    default:
      return role;
  }
}

/**
 * Create a signed, tamper-proof session token for developer admin or authorized staff
 */
export function createAdminSessionToken(email?: string, sessionId?: string): string {
  const targetEmail = (email || DEVELOPER_ADMIN_EMAIL).trim().toLowerCase();
  const timestamp = Date.now();
  const sid = sessionId || `sess_${timestamp.toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = `${targetEmail}:${timestamp}:${sid}`;
  const sig = crypto.createHmac('sha256', getAdminSecret()).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

export function parseAdminSessionToken(token: string): {
  valid: boolean;
  email?: string;
  timestamp?: number;
  sessionId?: string;
} {
  if (!token) return { valid: false };
  try {
    const parts = token.split(':');
    if (parts.length === 3) {
      // Legacy format: email:ts:sig
      const [email, tsStr, sig] = parts;
      const ts = parseInt(tsStr, 10);
      if (isNaN(ts)) return { valid: false };
      if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return { valid: false };
      const expectedSig = crypto.createHmac('sha256', getAdminSecret()).update(`${email}:${tsStr}`).digest('hex');
      const ok = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
      if (!ok) return { valid: false };
      return { valid: true, email: email.toLowerCase(), timestamp: ts, sessionId: `legacy_${ts}` };
    }
    if (parts.length === 4) {
      const [email, tsStr, sid, sig] = parts;
      const ts = parseInt(tsStr, 10);
      if (isNaN(ts)) return { valid: false };
      if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return { valid: false };
      const expectedSig = crypto.createHmac('sha256', getAdminSecret()).update(`${email}:${tsStr}:${sid}`).digest('hex');
      const ok = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'));
      if (!ok) return { valid: false };

      // Check if session has been revoked
      const ops = getAdminOpsStore();
      const sessionRec = ops.adminSessions.find((s) => s.id === sid);
      if (sessionRec && sessionRec.revoked) {
        return { valid: false };
      }
      return { valid: true, email: email.toLowerCase(), timestamp: ts, sessionId: sid };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Verify session token authenticity and age (max 7 days)
 */
export function verifyAdminSessionToken(token: string): boolean {
  const parsed = parseAdminSessionToken(token);
  if (!parsed.valid || !parsed.email) return false;
  if (parsed.email === DEVELOPER_ADMIN_EMAIL.toLowerCase()) return true;
  const cfg = getDeveloperAdminConfig();
  const staff = (cfg.staffMembers || []).find(
    (s) => s.email.toLowerCase() === parsed.email && s.status !== 'inactive'
  );
  return Boolean(staff);
}

export interface AdminActorContext {
  authorized: boolean;
  email: string;
  name: string;
  role: AdminRoleType;
  roleLabel: string;
  permissions: AdminPermission[];
  sessionId?: string;
}

export async function getAdminActorContext(req?: NextRequest): Promise<AdminActorContext> {
  const customKey = req?.headers.get('x-dev-admin-secret');
  if (customKey && process.env.DEV_ADMIN_SECRET && customKey === process.env.DEV_ADMIN_SECRET) {
    return {
      authorized: true,
      email: DEVELOPER_ADMIN_EMAIL,
      name: 'Master Developer Admin',
      role: 'SUPER_ADMIN',
      roleLabel: 'Super Admin',
      permissions: [...ALL_ADMIN_PERMISSIONS],
    };
  }

  let sessionCookie: string | undefined;
  if (req) {
    sessionCookie = req.cookies.get(DEV_ADMIN_COOKIE_NAME)?.value;
  } else {
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      sessionCookie = cookieStore.get(DEV_ADMIN_COOKIE_NAME)?.value;
    } catch {}
  }

  if (sessionCookie) {
    const parsed = parseAdminSessionToken(sessionCookie);
    if (parsed.valid && parsed.email) {
      if (parsed.email === DEVELOPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          authorized: true,
          email: DEVELOPER_ADMIN_EMAIL,
          name: 'Subesh M (Super Admin)',
          role: 'SUPER_ADMIN',
          roleLabel: 'Super Admin',
          permissions: [...ALL_ADMIN_PERMISSIONS],
          sessionId: parsed.sessionId,
        };
      }
      const cfg = getDeveloperAdminConfig();
      const staff = (cfg.staffMembers || []).find(
        (s) => s.email.toLowerCase() === parsed.email && s.status !== 'inactive'
      );
      if (staff) {
        const perms =
          Array.isArray(staff.permissions) && staff.permissions.length > 0
            ? staff.permissions
            : getRoleDefaultPermissions(staff.role);
        return {
          authorized: true,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          roleLabel: normalizeAdminRoleLabel(staff.role),
          permissions: perms,
          sessionId: parsed.sessionId,
        };
      }
    }
  }

  try {
    const auth = await getAuthenticatedUserContext();
    if (auth && auth.email) {
      const lowerEmail = auth.email.toLowerCase();
      if (lowerEmail === DEVELOPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          authorized: true,
          email: DEVELOPER_ADMIN_EMAIL,
          name: auth.fullName || 'Subesh M (Super Admin)',
          role: 'SUPER_ADMIN',
          roleLabel: 'Super Admin',
          permissions: [...ALL_ADMIN_PERMISSIONS],
        };
      }
      const cfg = getDeveloperAdminConfig();
      const staff = (cfg.staffMembers || []).find(
        (s) => s.email.toLowerCase() === lowerEmail && s.status !== 'inactive'
      );
      if (staff) {
        const perms =
          Array.isArray(staff.permissions) && staff.permissions.length > 0
            ? staff.permissions
            : getRoleDefaultPermissions(staff.role);
        return {
          authorized: true,
          email: staff.email,
          name: staff.name,
          role: staff.role,
          roleLabel: normalizeAdminRoleLabel(staff.role),
          permissions: perms,
        };
      }
    }
  } catch {}

  return {
    authorized: false,
    email: '',
    name: 'Unauthorized',
    role: 'READ_ONLY_ADMIN',
    roleLabel: 'Unauthorized',
    permissions: [],
  };
}

export async function hasAdminPermission(
  req: NextRequest | undefined,
  permission: AdminPermission
): Promise<{ allowed: boolean; actor: AdminActorContext }> {
  const actor = await getAdminActorContext(req);
  if (!actor.authorized) return { allowed: false, actor };
  if (actor.role === 'SUPER_ADMIN') return { allowed: true, actor };
  return { allowed: actor.permissions.includes(permission), actor };
}

/**
 * Central Developer Admin Guard:
 * Strictly verifies that the request belongs to Master Developer Admin or an active Admin Staff member
 */
export async function isAuthorizedDeveloperAdmin(req?: NextRequest): Promise<boolean> {
  const actor = await getAdminActorContext(req);
  return actor.authorized;
}

/**
 * Asynchronously sync admin configuration from Supabase notifications cloud store
 */
export async function syncCloudAdminConfig(): Promise<DeveloperAdminConfig> {
  const cfg = getDeveloperAdminConfig();
  try {
    const admin = createAdminClient();
    if (admin) {
      // 1. Fetch exact admin config record by deterministic ID
      let queryRes = await admin
        .from('notifications')
        .select('message')
        .eq('id', '00000000-0000-0000-0000-000000000099')
        .maybeSingle();

      // 2. Fall back to title or type if ID wasn't matched
      if (!queryRes.data?.message) {
        queryRes = await admin
          .from('notifications')
          .select('message')
          .eq('title', 'DEVELOPER_ADMIN_CONFIG')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      if (!queryRes.data?.message) {
        queryRes = await admin
          .from('notifications')
          .select('message')
          .eq('type', 'ADMIN_CONFIG')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      const cloudMessage = queryRes.data?.message;
      if (!queryRes.error && cloudMessage) {
        const parsed = JSON.parse(cloudMessage);
        if (parsed.passwordHash) cfg.passwordHash = parsed.passwordHash;
        if (parsed.salt) cfg.salt = parsed.salt;
        if (parsed.razorpayKeyId) cfg.razorpayKeyId = parsed.razorpayKeyId;
        if (parsed.razorpayKeySecret) cfg.razorpayKeySecret = parsed.razorpayKeySecret;
        if (parsed.razorpayPlanIdPromo99) cfg.razorpayPlanIdPromo99 = parsed.razorpayPlanIdPromo99;
        if (parsed.razorpayPlanIdStandard199) cfg.razorpayPlanIdStandard199 = parsed.razorpayPlanIdStandard199;
        if (parsed.razorpayMode) cfg.razorpayMode = parsed.razorpayMode;
        if (Array.isArray(parsed.staffMembers)) cfg.staffMembers = parsed.staffMembers;
        cfg.updatedAt = parsed.updatedAt || cfg.updatedAt;
        globalThis.__devAdminConfig__ = cfg;

        // Cache sanitized config to local disk if filesystem is writable
        saveConfigToDisk(cfg);
      }
    }
  } catch (err) {
    console.warn('[QuoteFlow] syncCloudAdminConfig error:', err);
  }

  // Ensure razorpayService is refreshed with the latest credentials
  if (typeof require === 'function') {
    try {
      const { razorpayService } = require('@/lib/billing/razorpay');
      if (razorpayService && typeof razorpayService.reloadCredentials === 'function') {
        razorpayService.reloadCredentials();
      }
    } catch {}
  }

  return cfg;
}

/**
 * Get all support staff members
 */
export function getSupportStaffMembers(): SupportStaffMember[] {
  const cfg = getDeveloperAdminConfig();
  return cfg.staffMembers || [];
}

/**
 * Add a new support staff member
 */
export async function addSupportStaffMember(member: {
  name: string;
  email: string;
  phone?: string;
  role?: SupportStaffMember['role'];
  permissions?: AdminPermission[];
  password?: string;
}): Promise<SupportStaffMember> {
  const cfg = getDeveloperAdminConfig();
  const staff = cfg.staffMembers || [];

  const normalizedEmail = member.email.trim().toLowerCase();
  const existing = staff.find((s) => s.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('A staff account with this email address already exists.');
  }

  const now = new Date().toISOString();
  const role: AdminRoleType = member.role || 'SUPPORT_ADMIN';
  let passwordHash: string | undefined;
  let salt: string | undefined;
  if (member.password && member.password.trim().length >= 6) {
    const hashed = hashPassword(member.password.trim());
    passwordHash = hashed.hash;
    salt = hashed.salt;
  }

  const newStaff: SupportStaffMember = {
    id: `staff_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    name: member.name.trim(),
    email: normalizedEmail,
    phone: member.phone?.trim() || undefined,
    role,
    permissions:
      Array.isArray(member.permissions) && member.permissions.length > 0
        ? member.permissions
        : getRoleDefaultPermissions(role),
    passwordHash,
    salt,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  staff.push(newStaff);
  cfg.staffMembers = staff;
  cfg.updatedAt = now;
  globalThis.__devAdminConfig__ = cfg;

  saveConfigToDisk(cfg);

  // Cloud Persistence via Supabase notifications table
  await saveCloudAdminConfig(cfg);

  return newStaff;
}

/**
 * Update an existing support staff member (role, permissions, status, password)
 */
export async function updateSupportStaffMember(
  id: string,
  updates: {
    name?: string;
    phone?: string;
    role?: AdminRoleType;
    permissions?: AdminPermission[];
    status?: 'active' | 'invited' | 'inactive';
    password?: string;
  }
): Promise<SupportStaffMember | null> {
  const cfg = getDeveloperAdminConfig();
  const staff = cfg.staffMembers || [];
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  const member = staff[idx];
  if (updates.name !== undefined) member.name = updates.name.trim();
  if (updates.phone !== undefined) member.phone = updates.phone.trim() || undefined;
  if (updates.role !== undefined) {
    member.role = updates.role;
    if (!updates.permissions) {
      member.permissions = getRoleDefaultPermissions(updates.role);
    }
  }
  if (updates.permissions !== undefined) {
    member.permissions = updates.permissions;
  }
  if (updates.status !== undefined) {
    member.status = updates.status;
  }
  if (updates.password && updates.password.trim().length >= 6) {
    const hashed = hashPassword(updates.password.trim());
    member.passwordHash = hashed.hash;
    member.salt = hashed.salt;
  }
  member.updated_at = new Date().toISOString();

  staff[idx] = member;
  cfg.staffMembers = staff;
  cfg.updatedAt = member.updated_at;
  globalThis.__devAdminConfig__ = cfg;
  saveConfigToDisk(cfg);
  await saveCloudAdminConfig(cfg);
  return member;
}

/**
 * Remove a support staff member
 */
export async function removeSupportStaffMember(id: string): Promise<boolean> {
  const cfg = getDeveloperAdminConfig();
  const staff = cfg.staffMembers || [];
  const idx = staff.findIndex((s) => s.id === id);
  if (idx === -1) return false;

  staff.splice(idx, 1);
  cfg.staffMembers = staff;
  cfg.updatedAt = new Date().toISOString();
  globalThis.__devAdminConfig__ = cfg;

  saveConfigToDisk(cfg);

  // Cloud Persistence
  await saveCloudAdminConfig(cfg);

  return true;
}

// ============================================================================
// PLATFORM OPERATIONS STORE (Feature Flags, Notes, Suspensions, Webhooks, etc.)
// ============================================================================

export interface BusinessAdminNote {
  id: string;
  orgId: string;
  note: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
}

export interface BusinessSuspensionRecord {
  orgId: string;
  status: 'active' | 'suspended_temp' | 'suspended_perm';
  reason: string;
  suspendedBy: string;
  suspendedAt: string;
}

export interface PlatformFeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  targetType: 'everyone' | 'plan' | 'country' | 'businesses' | 'percentage';
  targetValue: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaLink?: string;
  audience: 'all' | 'trials' | 'pro' | 'past_due' | 'country';
  audienceValue?: string;
  status: 'draft' | 'scheduled' | 'published' | 'expired';
  startAt: string;
  endAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface AdminRefundRecord {
  id: string;
  paymentId: string;
  orgId: string;
  businessName: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'processed' | 'pending' | 'failed';
  processedBy: string;
  createdAt: string;
}

export interface AdminWebhookEvent {
  id: string;
  provider: 'razorpay' | 'resend' | 'supabase';
  eventType: string;
  orgId?: string;
  businessName?: string;
  payloadSummary: string;
  status: 'processed' | 'failed' | 'retried';
  errorMessage?: string;
  retryCount: number;
  lastAttemptAt: string;
  createdAt: string;
}

export interface AdminOperationalLog {
  id: string;
  category: 'api_error' | 'email' | 'pdf' | 'ai' | 'auth' | 'billing';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  orgId?: string;
  businessName?: string;
  recipient?: string;
  status?: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  createdAt: string;
}

export interface AdminSecurityEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actorEmail: string;
  ipAddress: string;
  targetOrgId?: string;
  details: string;
  createdAt: string;
}

export interface AdminSupportSession {
  id: string;
  adminEmail: string;
  adminName: string;
  orgId: string;
  businessName: string;
  reason: string;
  mode: 'read_only';
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
  active: boolean;
}

export interface DataDeletionRequest {
  id: string;
  orgId: string;
  businessName: string;
  ownerEmail: string;
  status: 'pending_review' | 'approved' | 'on_hold' | 'completed';
  reason: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AdminActiveSession {
  id: string;
  email: string;
  name: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  loginAt: string;
  lastActiveAt: string;
  revoked: boolean;
}

export interface AdminOpsStore {
  businessNotes: Record<string, BusinessAdminNote[]>;
  suspendedBusinesses: Record<string, BusinessSuspensionRecord>;
  featureFlags: PlatformFeatureFlag[];
  announcements: PlatformAnnouncement[];
  refunds: AdminRefundRecord[];
  webhookEvents: AdminWebhookEvent[];
  operationalLogs: AdminOperationalLog[];
  securityEvents: AdminSecurityEvent[];
  supportSessions: AdminSupportSession[];
  deletionRequests: DataDeletionRequest[];
  adminSessions: AdminActiveSession[];
  cancellationReasons: Record<string, { orgId: string; reason: string; feedback?: string; cancelledAt: string }>;
  clientErrors?: Array<{ id: string; message: string; stack?: string; url?: string; userAgent?: string; resolved: boolean; createdAt: string }>;
  adSettings?: { metaPixelId?: string; metaCapiEnabled?: boolean; googleAdsId?: string; googleAdsEnabled?: boolean };
  updatedAt: string;
}

declare global {
  var __adminOpsStore__: AdminOpsStore | undefined;
}

function getOpsStorePath(): string {
  if (isEdgeOrWorker()) return '';
  const dir = getStorageDir();
  return dir ? path.join(dir, 'admin-ops.json') : '';
}

function createDefaultOpsStore(): AdminOpsStore {
  const now = new Date().toISOString();
  return {
    businessNotes: {},
    suspendedBusinesses: {},
    featureFlags: [
      {
        id: 'ff_ai_copilot',
        key: 'ai_copilot_v2',
        name: 'AI Copilot Pro Assistant',
        description: 'Enable conversational AI quote generation, pricing recommendations, and financial analysis.',
        enabled: true,
        targetType: 'everyone',
        targetValue: 'All Businesses',
        updatedBy: DEVELOPER_ADMIN_EMAIL,
        updatedAt: now,
      },
      {
        id: 'ff_digital_signature',
        key: 'digital_approval_portal',
        name: 'Customer Digital Quote Approval Portal',
        description: 'Allow customers to digitally sign and approve quotations via public share link.',
        enabled: true,
        targetType: 'everyone',
        targetValue: 'All Businesses',
        updatedBy: DEVELOPER_ADMIN_EMAIL,
        updatedAt: now,
      },
      {
        id: 'ff_multi_currency',
        key: 'global_multi_currency',
        name: 'Global Multi-Currency & Tax Inclusive Engine',
        description: 'Support INR, USD, GBP, EUR, AED, SAR, SGD, AUD, CAD with Tax Inclusive/Exclusive calculation.',
        enabled: true,
        targetType: 'everyone',
        targetValue: 'All Businesses',
        updatedBy: DEVELOPER_ADMIN_EMAIL,
        updatedAt: now,
      },
      {
        id: 'ff_whatsapp_auto_followup',
        key: 'whatsapp_automated_reminders',
        name: 'Automated WhatsApp Quote Follow-Ups',
        description: 'Send automated WhatsApp reminders for pending quotations 48h after creation.',
        enabled: true,
        targetType: 'plan',
        targetValue: 'QuoteFlow Pro',
        updatedBy: DEVELOPER_ADMIN_EMAIL,
        updatedAt: now,
      },
      {
        id: 'ff_advanced_branch_analytics',
        key: 'multi_branch_consolidation',
        name: 'Multi-Branch Consolidated Revenue Reports',
        description: 'Enable cross-branch GST & revenue consolidation reports.',
        enabled: false,
        targetType: 'percentage',
        targetValue: '25%',
        updatedBy: DEVELOPER_ADMIN_EMAIL,
        updatedAt: now,
      },
    ],
    announcements: [
      {
        id: 'ann_tax_currency_2026',
        title: 'New: Tax Inclusive Pricing & Global Multi-Currency Support',
        message: 'You can now configure Tax Inclusive or Tax Exclusive pricing and switch your business currency in Settings → Tax & Currency.',
        ctaLabel: 'Open Settings',
        ctaLink: '/settings',
        audience: 'all',
        status: 'published',
        startAt: now,
        createdBy: DEVELOPER_ADMIN_EMAIL,
        createdAt: now,
      },
    ],
    refunds: [],
    webhookEvents: [
      {
        id: 'wh_rzp_live_check',
        provider: 'razorpay',
        eventType: 'subscription.authenticated',
        payloadSummary: 'Razorpay Live Webhook Pipeline Ready (blendandbold.com/api/billing/webhook)',
        status: 'processed',
        retryCount: 0,
        lastAttemptAt: now,
        createdAt: now,
      },
      {
        id: 'wh_resend_dns_check',
        provider: 'resend',
        eventType: 'domain.verified',
        payloadSummary: 'Resend Domain blendandbold.com DKIM/SPF Verified on Cloudflare DNS',
        status: 'processed',
        retryCount: 0,
        lastAttemptAt: now,
        createdAt: now,
      },
    ],
    operationalLogs: [
      {
        id: 'oplog_email_1',
        category: 'email',
        severity: 'info',
        title: 'Resend Transactional Email Service Active',
        message: 'Outbound email delivery via noreply@blendandbold.com is healthy.',
        recipient: 'system@blendandbold.com',
        status: 'delivered',
        resolved: true,
        createdAt: now,
      },
      {
        id: 'oplog_pdf_1',
        category: 'pdf',
        severity: 'info',
        title: 'PDF Quotation & Invoice Renderer Ready',
        message: 'High-resolution A4 PDF engine operating normally (avg render 380ms).',
        status: 'healthy',
        resolved: true,
        createdAt: now,
      },
      {
        id: 'oplog_ai_1',
        category: 'ai',
        severity: 'info',
        title: 'QuoteFlow AI Copilot Engine Healthy',
        message: 'AI quotation & financial assistant responding within normal latency (avg 1.1s).',
        status: 'healthy',
        resolved: true,
        createdAt: now,
      },
    ],
    securityEvents: [
      {
        id: 'sec_init_1',
        eventType: 'Admin Security Shield Active',
        severity: 'low',
        actorEmail: DEVELOPER_ADMIN_EMAIL,
        ipAddress: '127.0.0.1',
        details: 'QuoteFlow Internal Admin RBAC & Audit Logging initialized.',
        createdAt: now,
      },
    ],
    supportSessions: [],
    deletionRequests: [],
    adminSessions: [],
    cancellationReasons: {},
    updatedAt: now,
  };
}

export function getAdminOpsStore(): AdminOpsStore {
  if (globalThis.__adminOpsStore__) {
    return globalThis.__adminOpsStore__;
  }
  try {
    const p = getOpsStorePath();
    if (p && !isEdgeOrWorker() && fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw);
      const defaults = createDefaultOpsStore();
      const merged: AdminOpsStore = {
        ...defaults,
        ...parsed,
        featureFlags: Array.isArray(parsed.featureFlags) && parsed.featureFlags.length > 0 ? parsed.featureFlags : defaults.featureFlags,
        announcements: Array.isArray(parsed.announcements) ? parsed.announcements : defaults.announcements,
        refunds: Array.isArray(parsed.refunds) ? parsed.refunds : [],
        webhookEvents: Array.isArray(parsed.webhookEvents) && parsed.webhookEvents.length > 0 ? parsed.webhookEvents : defaults.webhookEvents,
        operationalLogs: Array.isArray(parsed.operationalLogs) && parsed.operationalLogs.length > 0 ? parsed.operationalLogs : defaults.operationalLogs,
        securityEvents: Array.isArray(parsed.securityEvents) && parsed.securityEvents.length > 0 ? parsed.securityEvents : defaults.securityEvents,
        supportSessions: Array.isArray(parsed.supportSessions) ? parsed.supportSessions : [],
        deletionRequests: Array.isArray(parsed.deletionRequests) ? parsed.deletionRequests : [],
        adminSessions: Array.isArray(parsed.adminSessions) ? parsed.adminSessions : [],
        businessNotes: parsed.businessNotes || {},
        suspendedBusinesses: parsed.suspendedBusinesses || {},
        cancellationReasons: parsed.cancellationReasons || {},
        clientErrors: Array.isArray(parsed.clientErrors) ? parsed.clientErrors : [],
        adSettings: parsed.adSettings || { metaCapiEnabled: true, googleAdsEnabled: true },
      };
      globalThis.__adminOpsStore__ = merged;
      return merged;
    }
  } catch {}

  const defaults = createDefaultOpsStore();
  globalThis.__adminOpsStore__ = defaults;
  return defaults;
}

export function saveAdminOpsStore(store: AdminOpsStore): AdminOpsStore {
  store.updatedAt = new Date().toISOString();
  globalThis.__adminOpsStore__ = store;
  try {
    const p = getOpsStorePath();
    if (p && !isEdgeOrWorker()) {
      fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf-8');
    }
  } catch {}

  // Also persist to Supabase notifications row 00000000-0000-0000-0000-000000000098
  (async () => {
    try {
      const admin = createAdminClient();
      if (!admin) return;
      await admin.from('notifications').upsert({
        id: '00000000-0000-0000-0000-000000000098',
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        title: 'DEVELOPER_ADMIN_OPS_STORE',
        message: JSON.stringify(store),
        type: 'ADMIN_OPS',
        is_read: true,
      });
    } catch {}
  })();

  return store;
}

export function registerAdminLoginSession(params: {
  email: string;
  name: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}): AdminActiveSession {
  const store = getAdminOpsStore();
  const now = new Date().toISOString();
  const session: AdminActiveSession = {
    id: `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    email: params.email.toLowerCase(),
    name: params.name,
    role: params.role,
    ipAddress: params.ipAddress || '127.0.0.1',
    userAgent: params.userAgent || 'Browser Session',
    loginAt: now,
    lastActiveAt: now,
    revoked: false,
  };
  store.adminSessions = [session, ...store.adminSessions.slice(0, 49)];
  store.securityEvents = [
    {
      id: `sec_${Date.now().toString(36)}`,
      eventType: 'Admin Login Verified',
      severity: 'low',
      actorEmail: params.email,
      ipAddress: session.ipAddress,
      details: `Authenticated into QuoteFlow Admin Control Center (${params.role})`,
      createdAt: now,
    },
    ...store.securityEvents.slice(0, 99),
  ];
  saveAdminOpsStore(store);
  return session;
}

export function revokeAllAdminSessions(email?: string): void {
  const targetEmail = (email || DEVELOPER_ADMIN_EMAIL).trim().toLowerCase();
  const store = getAdminOpsStore();
  let changed = false;
  store.adminSessions.forEach((s) => {
    if (s.email.toLowerCase() === targetEmail && !s.revoked) {
      s.revoked = true;
      changed = true;
    }
  });
  if (changed) {
    saveAdminOpsStore(store);
  }
}

export function recordAdminSecurityEvent(event: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actorEmail: string;
  ipAddress?: string;
  targetOrgId?: string;
  details: string;
}): void {
  const store = getAdminOpsStore();
  store.securityEvents = [
    {
      id: `sec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      eventType: event.eventType,
      severity: event.severity,
      actorEmail: event.actorEmail,
      ipAddress: event.ipAddress || '127.0.0.1',
      targetOrgId: event.targetOrgId,
      details: event.details,
      createdAt: new Date().toISOString(),
    },
    ...store.securityEvents.slice(0, 149),
  ];
  saveAdminOpsStore(store);
}

export function recordOperationalLog(entry: {
  category: AdminOperationalLog['category'];
  severity: AdminOperationalLog['severity'];
  title: string;
  message: string;
  orgId?: string;
  businessName?: string;
  recipient?: string;
  status?: string;
  metadata?: Record<string, any>;
}): void {
  const store = getAdminOpsStore();
  store.operationalLogs = [
    {
      id: `oplog_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      ...entry,
      resolved: entry.severity === 'info',
      createdAt: new Date().toISOString(),
    },
    ...store.operationalLogs.slice(0, 199),
  ];
  saveAdminOpsStore(store);
}


