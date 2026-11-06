import {
  StaffRole,
  StaffPermissions,
  StaffMember,
  StaffActivityLog,
  StaffActivityFilterParams,
  PermissionKey,
  ROLE_PERMISSION_PRESETS,
  DEFAULT_FULL_PERMISSIONS,
  isOwnerOrAdminRole,
} from '@/types/staff';
import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';
import fs from 'fs';
import path from 'path';

const isCloudflareWorker =
  typeof process !== 'undefined' &&
  (Boolean(process.env.CLOUDFLARE_WORKER) ||
    Boolean(process.env.WORKERS) ||
    !fs.existsSync);

// In-memory cache for fast lookups
const inMemoryActivityLogs: StaffActivityLog[] = [];
const inMemoryStaffMembers = new Map<string, StaffMember>();

function getStaffActivityFilePath(): string {
  if (isCloudflareWorker) return '';
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'staff-activity-logs.json');
  } catch {
    return '';
  }
}

function loadStaffActivityFromFile(): StaffActivityLog[] {
  if (isCloudflareWorker) return inMemoryActivityLogs;
  try {
    const p = getStaffActivityFilePath();
    if (p && fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
    }
  } catch {}
  return [];
}

function saveStaffActivityToFile(logs: StaffActivityLog[]): void {
  if (isCloudflareWorker) return;
  try {
    const p = getStaffActivityFilePath();
    if (p) {
      fs.writeFileSync(p, JSON.stringify(logs.slice(0, 1000), null, 2), 'utf-8');
    }
  } catch {}
}

/**
 * Remove sensitive credentials from audit logs
 */
function sanitizeActivityPayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeActivityPayload);

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('apikey') ||
      lower.includes('api_key') ||
      lower.includes('card') ||
      lower.includes('cvv') ||
      lower.includes('pin') ||
      lower.includes('key_secret')
    ) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeActivityPayload(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export class StaffService {
  /**
   * Log an immutable, tamper-resistant business action performed by a staff/admin user
   */
  public async logStaffActivity(
    entry: Omit<StaffActivityLog, 'id' | 'created_at'>
  ): Promise<StaffActivityLog> {
    const log: StaffActivityLog = {
      id: crypto.randomUUID(),
      organization_id: entry.organization_id,
      user_id: entry.user_id,
      user_name: entry.user_name || 'Team Member',
      user_email: entry.user_email || '',
      user_role: entry.user_role || 'STAFF',
      action: entry.action,
      action_key: entry.action_key || entry.action.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      module: entry.module,
      target_id: entry.target_id,
      target_identifier: entry.target_identifier,
      details: entry.details,
      diff: sanitizeActivityPayload(entry.diff),
      metadata: sanitizeActivityPayload(entry.metadata),
      ip_address: entry.ip_address,
      created_at: new Date().toISOString(),
    };

    // 1. In-memory unshift
    inMemoryActivityLogs.unshift(log);

    // 2. File persistence for local dev
    if (!isCloudflareWorker) {
      try {
        const fileLogs = loadStaffActivityFromFile();
        fileLogs.unshift(log);
        saveStaffActivityToFile(fileLogs);
      } catch (err) {
        console.warn('Failed saving staff activity to file:', err);
      }
    }

    // 3. Cloud persistence in Supabase notifications table
    const admin = createAdminClient();
    if (admin) {
      try {
        await admin.from('notifications').insert({
          id: log.id,
          organization_id: log.organization_id,
          title: `STAFF_ACTIVITY:${log.action_key}`,
          message: JSON.stringify(log),
          type: 'STAFF_ACTIVITY_LOG',
          is_read: true,
        });
      } catch (err) {
        console.warn('Supabase staff activity cloud persist warning:', err);
      }
    }

    return log;
  }

  /**
   * Query Activity Logs with rich multi-field filtering and search
   */
  public async getStaffActivityLogs(
    orgId: string,
    filters?: StaffActivityFilterParams
  ): Promise<{ logs: StaffActivityLog[]; total: number }> {
    const limit = Math.min(filters?.limit || 50, 200);
    const offset = filters?.offset || 0;

    const logMap = new Map<string, StaffActivityLog>();

    // 1. Add in-memory logs
    for (const log of inMemoryActivityLogs) {
      if (log.organization_id === orgId) {
        logMap.set(log.id, log);
      }
    }

    // 2. Add local file logs
    if (!isCloudflareWorker) {
      try {
        const fileLogs = loadStaffActivityFromFile();
        for (const log of fileLogs) {
          if (log.organization_id === orgId) {
            logMap.set(log.id, log);
          }
        }
      } catch {}
    }

    // 3. Load cloud records from Supabase notifications table
    const admin = createAdminClient();
    if (admin) {
      try {
        const { data: cloudLogs } = await admin
          .from('notifications')
          .select('message')
          .eq('organization_id', orgId)
          .eq('type', 'STAFF_ACTIVITY_LOG')
          .order('created_at', { ascending: false })
          .limit(200);

        if (cloudLogs) {
          for (const row of cloudLogs) {
            try {
              const log: StaffActivityLog = JSON.parse(row.message);
              if (log && log.id && log.organization_id === orgId) {
                logMap.set(log.id, log);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Error reading cloud staff activity logs:', err);
      }
    }

    // Convert to array and sort newest first
    let allLogs = Array.from(logMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply Filters
    if (filters?.staffId && filters.staffId !== 'all') {
      allLogs = allLogs.filter((l) => l.user_id === filters.staffId);
    }

    if (filters?.role && filters.role !== 'all') {
      const targetRole = filters.role.toUpperCase();
      allLogs = allLogs.filter((l) => l.user_role.toUpperCase() === targetRole);
    }

    if (filters?.module && filters.module !== 'all') {
      const targetMod = filters.module.toLowerCase();
      allLogs = allLogs.filter((l) => l.module.toLowerCase() === targetMod);
    }

    if (filters?.action && filters.action !== 'all') {
      const targetAction = filters.action.toLowerCase();
      allLogs = allLogs.filter(
        (l) =>
          l.action_key.toLowerCase().includes(targetAction) ||
          l.action.toLowerCase().includes(targetAction)
      );
    }

    if (filters?.startDate) {
      const startMs = new Date(filters.startDate).getTime();
      allLogs = allLogs.filter((l) => new Date(l.created_at).getTime() >= startMs);
    }

    if (filters?.endDate) {
      const endMs = new Date(filters.endDate).getTime();
      allLogs = allLogs.filter((l) => new Date(l.created_at).getTime() <= endMs);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      allLogs = allLogs.filter(
        (l) =>
          (l.target_identifier || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q) ||
          (l.user_name || '').toLowerCase().includes(q) ||
          (l.user_email || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q)
      );
    }

    const total = allLogs.length;
    const paginated = allLogs.slice(offset, offset + limit);

    return { logs: paginated, total };
  }

  /**
   * Get recent activity for a specific staff member
   */
  public async getStaffMemberActivity(
    orgId: string,
    userId: string,
    limit = 10
  ): Promise<StaffActivityLog[]> {
    const { logs } = await this.getStaffActivityLogs(orgId, {
      staffId: userId,
      limit,
    });
    return logs;
  }

  /**
   * Check if user has specific permission based on role and custom permissions
   */
  public hasPermission(
    role: StaffRole | string,
    permissions: StaffPermissions | undefined,
    permissionKey: PermissionKey
  ): boolean {
    const normalizedRole = (role || 'STAFF').toUpperCase() as StaffRole;

    // Owners and Admins always have all operational permissions
    if (normalizedRole === 'OWNER' || normalizedRole === 'ADMIN') {
      return true;
    }

    // If explicit permissions map provided, check key
    if (permissions && typeof permissions[permissionKey] === 'boolean') {
      return permissions[permissionKey];
    }

    // Fallback to role presets
    const preset = ROLE_PERMISSION_PRESETS[normalizedRole] || ROLE_PERMISSION_PRESETS.STAFF;
    return Boolean(preset[permissionKey]);
  }

  /**
   * Get all staff members for an organization
   */
  public async getStaffMembers(orgId: string): Promise<StaffMember[]> {
    const admin = createAdminClient();
    const membersList: StaffMember[] = [];

    if (admin) {
      try {
        const [{ data: members }, { data: authData }, { data: profilesData }] =
          await Promise.all([
            admin
              .from('organization_members')
              .select('id, user_id, role, is_active, created_at')
              .eq('organization_id', orgId),
            admin.auth.admin.listUsers({ perPage: 1000 }),
            admin.from('profiles').select('*'),
          ]);

        const memberMap = new Map((members || []).map((m: any) => [m.user_id, m]));
        const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

        for (const user of authData?.users || []) {
          const memberRecord = memberMap.get(user.id);
          const userOrgId = user.user_metadata?.organization_id;

          if (memberRecord || userOrgId === orgId) {
            const profile = profileMap.get(user.id);
            const rawRole = (
              memberRecord?.role ||
              user.user_metadata?.role ||
              'STAFF'
            ).toUpperCase() as StaffRole;

            const role: StaffRole = ROLE_PERMISSION_PRESETS[rawRole] ? rawRole : 'STAFF';

            // Resolve permissions from metadata or role preset
            const customPermissions = user.user_metadata?.permissions as StaffPermissions | undefined;
            const permissions: StaffPermissions = {
              ...(ROLE_PERMISSION_PRESETS[role] || ROLE_PERMISSION_PRESETS.STAFF),
              ...(customPermissions || {}),
            };

            const branch = (user.user_metadata?.branch as string) || 'Main Branch';
            const phone = (user.user_metadata?.phone as string) || (profile?.phone as string) || null;
            const fullName =
              (user.user_metadata?.full_name as string) ||
              profile?.full_name ||
              user.email?.split('@')[0] ||
              'Team Member';

            const isActive = memberRecord?.is_active !== false && user.user_metadata?.is_active !== false;

            const staffObj: StaffMember = {
              id: user.id,
              organization_id: orgId,
              email: user.email || '',
              full_name: fullName,
              phone,
              branch,
              role,
              permissions,
              is_active: isActive,
              email_confirmed: Boolean(user.email_confirmed_at) && !user.user_metadata?.must_change_password,
              must_change_password: Boolean(user.user_metadata?.must_change_password),
              created_at: memberRecord?.created_at || user.created_at,
              last_sign_in_at: user.last_sign_in_at || null,
            };

            membersList.push(staffObj);
            inMemoryStaffMembers.set(user.id, staffObj);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch staff members from Supabase:', err);
      }
    }

    // Return in-memory fallback if empty
    if (membersList.length === 0) {
      for (const m of inMemoryStaffMembers.values()) {
        if (m.organization_id === orgId) {
          membersList.push(m);
        }
      }
    }

    return membersList;
  }

  /**
   * Get single staff member
   */
  public async getStaffMember(orgId: string, userId: string): Promise<StaffMember | null> {
    const list = await this.getStaffMembers(orgId);
    return list.find((m) => m.id === userId) || null;
  }

  /**
   * Calculate dashboard staff counts
   */
  public async getStaffOverviewStats(orgId: string): Promise<{
    active: number;
    managers: number;
    sales: number;
    accounts: number;
    marketing: number;
    total: number;
  }> {
    const members = await this.getStaffMembers(orgId);
    const active = members.filter((m) => m.is_active);

    return {
      active: active.length,
      managers: active.filter((m) => m.role === 'MANAGER').length,
      sales: active.filter((m) => m.role === 'SALES').length,
      accounts: active.filter((m) => m.role === 'ACCOUNTS').length,
      marketing: active.filter((m) => m.role === 'MARKETING').length,
      total: members.length,
    };
  }
}

export const staffService = new StaffService();
