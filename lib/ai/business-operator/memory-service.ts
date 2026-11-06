import {
  OrganizationAiProfile,
  OrganizationAiMemory,
  MemoryType,
  SubjectType,
  MemoryStatus,
} from '@/types/business-operator';
import { CurrencyCode, Organization } from '@/types/database';
import { store } from '@/lib/supabase/data-store';
import fs from 'fs';
import path from 'path';

const isCloudflareWorker =
  typeof process !== 'undefined' &&
  (Boolean(process.env.CLOUDFLARE_WORKER) ||
    Boolean(process.env.WORKERS) ||
    !fs.existsSync);

// In-memory caches for fast sub-millisecond retrieval
const memoryProfiles = new Map<string, OrganizationAiProfile>();
const memoryStore = new Map<string, OrganizationAiMemory[]>();

function getStorageFilePath(): string {
  if (isCloudflareWorker) return '';
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'organization-ai-memory.json');
  } catch {
    return '';
  }
}

function loadFromDisk(): { profiles: OrganizationAiProfile[]; memories: OrganizationAiMemory[] } {
  if (isCloudflareWorker) return { profiles: [], memories: [] };
  try {
    const p = getStorageFilePath();
    if (p && fs.existsSync(p)) {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return {
        profiles: parsed.profiles || [],
        memories: parsed.memories || [],
      };
    }
  } catch {}
  return { profiles: [], memories: [] };
}

function saveToDisk(): void {
  if (isCloudflareWorker) return;
  try {
    const p = getStorageFilePath();
    if (p) {
      const allProfiles = Array.from(memoryProfiles.values());
      const allMemories = Array.from(memoryStore.values()).flat();
      fs.writeFileSync(
        p,
        JSON.stringify({ profiles: allProfiles, memories: allMemories.slice(0, 5000) }, null, 2),
        'utf-8'
      );
    }
  } catch {}
}

// Initialize from disk if available
(() => {
  const diskData = loadFromDisk();
  for (const pr of diskData.profiles) {
    memoryProfiles.set(pr.organization_id, pr);
  }
  for (const mem of diskData.memories) {
    const list = memoryStore.get(mem.organization_id) || [];
    list.push(mem);
    memoryStore.set(mem.organization_id, list);
  }
})();

export class BusinessMemoryService {
  /**
   * Retrieve the AI Profile for an organization.
   * Auto-populates from organization settings if not yet customized.
   */
  public async getProfile(orgId: string): Promise<OrganizationAiProfile> {
    if (memoryProfiles.has(orgId)) {
      return memoryProfiles.get(orgId)!;
    }

    const org = await store.getOrganization(orgId);
    const now = new Date().toISOString();

    const initialProfile: OrganizationAiProfile = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      business_summary: org?.name
        ? `${org.name} operates in ${org.city || org.state || 'India'}. Specializing in commercial quotations and invoicing.`
        : 'Commercial business focused on quotes, invoices, and client service.',
      industry: 'Commercial Services',
      preferred_tone: 'PROFESSIONAL',
      default_currency: (org?.default_currency || 'INR') as CurrencyCode,
      default_quote_validity_days: org?.default_validity_days || 30,
      default_payment_terms: org?.default_terms || 'Payment due within 30 days of completion.',
      created_at: now,
      updated_at: now,
    };

    memoryProfiles.set(orgId, initialProfile);
    saveToDisk();

    // Seed initial explicit rules based on organization defaults
    await this.seedInitialRules(orgId, initialProfile, org);

    return initialProfile;
  }

  /**
   * Seed standard explicit rules so the AI has baseline memory on day one
   */
  private async seedInitialRules(
    orgId: string,
    profile: OrganizationAiProfile,
    org: Organization | null
  ) {
    const existing = memoryStore.get(orgId) || [];
    if (existing.length > 0) return;

    const initialRules: Array<Omit<OrganizationAiMemory, 'id' | 'created_at' | 'updated_at'>> = [
      {
        organization_id: orgId,
        memory_type: 'EXPLICIT_RULE',
        subject_type: 'PRICING',
        key: 'default_validity',
        value: `Quotations are valid for ${profile.default_quote_validity_days} days from issue date.`,
        source: 'MANUAL_SETTING',
        confidence: 100,
        confirmed: true,
        status: 'ACTIVE',
      },
      {
        organization_id: orgId,
        memory_type: 'EXPLICIT_RULE',
        subject_type: 'COMMUNICATION',
        key: 'communication_tone',
        value: `Customer communication should be ${profile.preferred_tone.toLowerCase()} and courteous.`,
        source: 'MANUAL_SETTING',
        confidence: 100,
        confirmed: true,
        status: 'ACTIVE',
      },
    ];

    if (org?.default_tax_rate) {
      initialRules.push({
        organization_id: orgId,
        memory_type: 'EXPLICIT_RULE',
        subject_type: 'PRICING',
        key: 'standard_tax_rate',
        value: `Default tax rate applied is ${org.default_tax_rate}% (${org.default_tax_mode || 'exclusive'}).`,
        source: 'MANUAL_SETTING',
        confidence: 100,
        confirmed: true,
        status: 'ACTIVE',
      });
    }

    for (const r of initialRules) {
      await this.addMemory(orgId, r);
    }
  }

  /**
   * Update or customize the organization AI Profile
   */
  public async upsertProfile(
    orgId: string,
    data: Partial<Omit<OrganizationAiProfile, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<OrganizationAiProfile> {
    const current = await this.getProfile(orgId);
    const updated: OrganizationAiProfile = {
      ...current,
      ...data,
      updated_at: new Date().toISOString(),
    };

    memoryProfiles.set(orgId, updated);
    saveToDisk();
    return updated;
  }

  /**
   * Retrieve all memories for an organization, optionally filtered by type or status
   */
  public async getMemories(
    orgId: string,
    options?: {
      memoryType?: MemoryType;
      subjectType?: SubjectType;
      status?: MemoryStatus;
      confirmedOnly?: boolean;
    }
  ): Promise<OrganizationAiMemory[]> {
    // Ensure profile & seeded rules exist
    await this.getProfile(orgId);

    const list = memoryStore.get(orgId) || [];
    return list.filter((m) => {
      if (options?.status && m.status !== options.status) return false;
      if (!options?.status && m.status === 'DELETED') return false; // Hide deleted by default
      if (options?.memoryType && m.memory_type !== options.memoryType) return false;
      if (options?.subjectType && m.subject_type !== options.subjectType) return false;
      if (options?.confirmedOnly && !m.confirmed) return false;
      return true;
    });
  }

  /**
   * Add a new memory entry (Rule, Pattern, Observation)
   */
  public async addMemory(
    orgId: string,
    entry: Omit<OrganizationAiMemory, 'id' | 'created_at' | 'updated_at'>
  ): Promise<OrganizationAiMemory> {
    const list = memoryStore.get(orgId) || [];
    const now = new Date().toISOString();

    const newMemory: OrganizationAiMemory = {
      ...entry,
      id: crypto.randomUUID(),
      organization_id: orgId,
      created_at: now,
      updated_at: now,
    };

    list.unshift(newMemory);
    memoryStore.set(orgId, list);
    saveToDisk();

    return newMemory;
  }

  /**
   * Update an existing memory entry
   */
  public async updateMemory(
    orgId: string,
    id: string,
    updates: Partial<Omit<OrganizationAiMemory, 'id' | 'organization_id' | 'created_at'>>
  ): Promise<OrganizationAiMemory | null> {
    const list = memoryStore.get(orgId) || [];
    const index = list.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const updated: OrganizationAiMemory = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    list[index] = updated;
    memoryStore.set(orgId, list);
    saveToDisk();

    return updated;
  }

  /**
   * Confirm an observation or learned pattern as an accepted business rule
   */
  public async confirmMemory(
    orgId: string,
    id: string,
    confirmedByUserId?: string
  ): Promise<OrganizationAiMemory | null> {
    return this.updateMemory(orgId, id, {
      confirmed: true,
      source: 'CONFIRMED_USER',
      created_by: confirmedByUserId || null,
    });
  }

  /**
   * Disable a memory rule/pattern so it is not used in recommendations
   */
  public async disableMemory(orgId: string, id: string): Promise<OrganizationAiMemory | null> {
    return this.updateMemory(orgId, id, {
      status: 'DISABLED',
    });
  }

  /**
   * Soft-delete a memory
   */
  public async deleteMemory(orgId: string, id: string): Promise<boolean> {
    const res = await this.updateMemory(orgId, id, {
      status: 'DELETED',
    });
    return Boolean(res);
  }
}

export const businessMemoryService = new BusinessMemoryService();
