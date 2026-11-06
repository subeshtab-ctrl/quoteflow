import {
  AiActionLog,
  AiOutcomeRecord,
  AiUsageMetric,
  ActionCategory,
} from '@/types/business-operator';
import { StaffRole } from '@/types/staff';
import fs from 'fs';
import path from 'path';

const isCloudflareWorker =
  typeof process !== 'undefined' &&
  (Boolean(process.env.CLOUDFLARE_WORKER) ||
    Boolean(process.env.WORKERS) ||
    !fs.existsSync);

const inMemoryActionLogs: AiActionLog[] = [];
const inMemoryOutcomes: AiOutcomeRecord[] = [];
const inMemoryUsageMetrics: AiUsageMetric[] = [];

function getAuditFilePath(type: 'actions' | 'outcomes' | 'usage'): string {
  if (isCloudflareWorker) return '';
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, `ai-${type}-audit.json`);
  } catch {
    return '';
  }
}

function loadAuditData<T>(type: 'actions' | 'outcomes' | 'usage'): T[] {
  if (isCloudflareWorker) return [];
  try {
    const p = getAuditFilePath(type);
    if (p && fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
    }
  } catch {}
  return [];
}

function saveAuditData<T>(type: 'actions' | 'outcomes' | 'usage', items: T[]): void {
  if (isCloudflareWorker) return;
  try {
    const p = getAuditFilePath(type);
    if (p) {
      fs.writeFileSync(p, JSON.stringify(items.slice(0, 2000), null, 2), 'utf-8');
    }
  } catch {}
}

// Redact secrets, passwords, auth tokens, API keys
function redactSecrets(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSecrets);

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
      lower.includes('pin')
    ) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = redactSecrets(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export class OperatorAuditService {
  /**
   * Log an AI Action in the immutable audit log
   */
  public async logAiAction(
    entry: Omit<AiActionLog, 'id' | 'created_at'>
  ): Promise<AiActionLog> {
    const record: AiActionLog = {
      ...entry,
      id: crypto.randomUUID(),
      metadata: redactSecrets(entry.metadata),
      created_at: new Date().toISOString(),
    };

    inMemoryActionLogs.unshift(record);
    if (!isCloudflareWorker) {
      const diskList = loadAuditData<AiActionLog>('actions');
      diskList.unshift(record);
      saveAuditData('actions', diskList);
    }

    return record;
  }

  /**
   * Retrieve AI action audit logs filtered by organization
   */
  public async getAiActionLogs(
    orgId: string,
    limit: number = 50
  ): Promise<AiActionLog[]> {
    const all = !isCloudflareWorker
      ? loadAuditData<AiActionLog>('actions')
      : inMemoryActionLogs;

    return all.filter((l) => l.organization_id === orgId).slice(0, limit);
  }

  /**
   * Record a business outcome from an AI recommendation/action
   */
  public async recordOutcome(
    entry: Omit<AiOutcomeRecord, 'id' | 'created_at'>
  ): Promise<AiOutcomeRecord> {
    const outcome: AiOutcomeRecord = {
      ...entry,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    inMemoryOutcomes.unshift(outcome);
    if (!isCloudflareWorker) {
      const diskList = loadAuditData<AiOutcomeRecord>('outcomes');
      diskList.unshift(outcome);
      saveAuditData('outcomes', diskList);
    }

    return outcome;
  }

  /**
   * Retrieve outcome records for an organization
   */
  public async getOutcomes(orgId: string): Promise<AiOutcomeRecord[]> {
    const all = !isCloudflareWorker
      ? loadAuditData<AiOutcomeRecord>('outcomes')
      : inMemoryOutcomes;

    return all.filter((o) => o.organization_id === orgId);
  }

  /**
   * Record an AI telemetry / usage metric
   */
  public async recordUsage(
    entry: Omit<AiUsageMetric, 'id' | 'request_timestamp'>
  ): Promise<AiUsageMetric> {
    const metric: AiUsageMetric = {
      ...entry,
      id: crypto.randomUUID(),
      request_timestamp: new Date().toISOString(),
    };

    inMemoryUsageMetrics.unshift(metric);
    if (!isCloudflareWorker) {
      const diskList = loadAuditData<AiUsageMetric>('usage');
      diskList.unshift(metric);
      saveAuditData('usage', diskList);
    }

    return metric;
  }

  /**
   * Query aggregate usage metrics for Developer Admin
   */
  public async getUsageSummary(orgId?: string): Promise<{
    totalRequests: number;
    successRate: number;
    avgResponseTimeMs: number;
    featuresUsed: Record<string, number>;
  }> {
    const all = !isCloudflareWorker
      ? loadAuditData<AiUsageMetric>('usage')
      : inMemoryUsageMetrics;

    const filtered = orgId ? all.filter((m) => m.organization_id === orgId) : all;
    if (filtered.length === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        avgResponseTimeMs: 0,
        featuresUsed: {},
      };
    }

    const successful = filtered.filter((m) => m.success).length;
    const totalTime = filtered.reduce((s, m) => s + m.response_time_ms, 0);
    const featureMap: Record<string, number> = {};

    for (const m of filtered) {
      featureMap[m.feature_name] = (featureMap[m.feature_name] || 0) + 1;
    }

    return {
      totalRequests: filtered.length,
      successRate: Math.round((successful / filtered.length) * 100),
      avgResponseTimeMs: Math.round(totalTime / filtered.length),
      featuresUsed: featureMap,
    };
  }
}

export const operatorAuditService = new OperatorAuditService();
