import {
  OperatorRecommendation,
  OperatorRecommendationStatus,
  OperatorRecommendationType,
} from '@/types/business-operator';
import { store } from '@/lib/supabase/data-store';
import { operatorAuditService } from './audit-service';
import fs from 'fs';
import path from 'path';

const isCloudflareWorker =
  typeof process !== 'undefined' &&
  (Boolean(process.env.CLOUDFLARE_WORKER) ||
    Boolean(process.env.WORKERS) ||
    !fs.existsSync);

const inMemoryRecommendations = new Map<string, OperatorRecommendation[]>();

function getStorageFilePath(): string {
  if (isCloudflareWorker) return '';
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'operator-recommendations.json');
  } catch {
    return '';
  }
}

function loadFromDisk(): OperatorRecommendation[] {
  if (isCloudflareWorker) return [];
  try {
    const p = getStorageFilePath();
    if (p && fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
    }
  } catch {}
  return [];
}

function saveToDisk(records: OperatorRecommendation[]): void {
  if (isCloudflareWorker) return;
  try {
    const p = getStorageFilePath();
    if (p) {
      fs.writeFileSync(p, JSON.stringify(records.slice(0, 2000), null, 2), 'utf-8');
    }
  } catch {}
}

// Initial load
(() => {
  const disk = loadFromDisk();
  for (const r of disk) {
    const list = inMemoryRecommendations.get(r.organization_id) || [];
    list.push(r);
    inMemoryRecommendations.set(r.organization_id, list);
  }
})();

export class OperatorRecommendationManager {
  /**
   * Retrieve active recommendations for an organization, reconciling against current live state.
   * Auto-resolves recommendations if quotes are already approved or invoices already paid.
   */
  public async getActiveRecommendations(orgId: string): Promise<OperatorRecommendation[]> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    const [quotations, invoices] = await Promise.all([
      store.getQuotations(orgId, { environment: env }),
      store.getInvoices(orgId, { environment: env }),
    ]);

    const quoteMap = new Map(quotations.map((q) => [q.id, q]));
    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));

    const list = inMemoryRecommendations.get(orgId) || [];
    let stateChanged = false;

    // Reconcile and auto-complete
    for (const rec of list) {
      if (rec.status !== 'ACTIVE') continue;

      // 1. If recommendation was about a quote follow-up, check if approved/cancelled
      if (rec.resource_type === 'quote' && rec.resource_id) {
        const quote = quoteMap.get(rec.resource_id);
        if (quote && (quote.status === 'APPROVED' || quote.status === 'COMPLETED' || quote.status === 'REJECTED')) {
          rec.status = 'COMPLETED';
          rec.resolved_at = new Date().toISOString();
          rec.resolved_reason = quote.status === 'REJECTED' ? 'MANUAL' : 'APPROVED';
          stateChanged = true;
        }
      }

      // 2. If recommendation was about an overdue invoice, check if paid
      if (rec.resource_type === 'invoice' && rec.resource_id) {
        const inv = invoiceMap.get(rec.resource_id);
        if (inv && (inv.status === 'PAID' || (Number(inv.paid_amount) || 0) >= (Number(inv.grand_total) || 0))) {
          rec.status = 'COMPLETED';
          rec.resolved_at = new Date().toISOString();
          rec.resolved_reason = 'PAID';
          stateChanged = true;
        }
      }
    }

    if (stateChanged && !isCloudflareWorker) {
      const all = Array.from(inMemoryRecommendations.values()).flat();
      saveToDisk(all);
    }

    return list.filter((r) => r.status === 'ACTIVE');
  }

  /**
   * Add a new recommendation, ensuring anti-nagging deduplication
   */
  public async addRecommendation(
    orgId: string,
    rec: Omit<OperatorRecommendation, 'id' | 'created_at' | 'status'>
  ): Promise<OperatorRecommendation | null> {
    const list = inMemoryRecommendations.get(orgId) || [];

    // Anti-nagging: check if identical active, completed, or dismissed recommendation exists
    const duplicate = list.find(
      (existing) =>
        existing.action_key === rec.action_key &&
        existing.resource_id === rec.resource_id &&
        (existing.status === 'ACTIVE' || existing.status === 'DISMISSED')
    );

    if (duplicate) {
      return null; // Suppressed by anti-nagging logic
    }

    const newRec: OperatorRecommendation = {
      ...rec,
      id: crypto.randomUUID(),
      organization_id: orgId,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    list.unshift(newRec);
    inMemoryRecommendations.set(orgId, list);

    if (!isCloudflareWorker) {
      const all = Array.from(inMemoryRecommendations.values()).flat();
      saveToDisk(all);
    }

    return newRec;
  }

  /**
   * User marks recommendation as dismissed or completed
   */
  public async updateRecommendationStatus(
    orgId: string,
    id: string,
    status: OperatorRecommendationStatus,
    reason?: 'APPROVED' | 'PAID' | 'DISMISSED' | 'CONTACTED' | 'MANUAL',
    revenueGenerated?: number
  ): Promise<OperatorRecommendation | null> {
    const list = inMemoryRecommendations.get(orgId) || [];
    const item = list.find((r) => r.id === id);
    if (!item) return null;

    item.status = status;
    item.resolved_at = new Date().toISOString();
    item.resolved_reason = reason;

    if (!isCloudflareWorker) {
      const all = Array.from(inMemoryRecommendations.values()).flat();
      saveToDisk(all);
    }

    // Track outcome
    await operatorAuditService.recordOutcome({
      organization_id: orgId,
      recommendation_id: item.id,
      recommendation_key: item.action_key,
      action_type: item.type,
      result_type: status === 'COMPLETED' ? 'ACCEPTED' : status === 'DISMISSED' ? 'REJECTED' : 'NO_RESPONSE',
      revenue_generated: revenueGenerated,
      notes: `Status changed to ${status} with reason ${reason || 'unspecified'}`,
    });

    return item;
  }
}

export const operatorRecommendationManager = new OperatorRecommendationManager();
