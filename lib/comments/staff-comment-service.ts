import {
  StaffComment,
  StaffCommentReadReceipt,
  QuotationCommentNotificationStatus,
  StaffMentionOption,
} from '@/types/staff-comment';
import { createAdminClient } from '@/lib/supabase/service-role';
import { staffService } from '@/lib/staff/staff-service';
import fs from 'fs';
import path from 'path';

const isCloudflareWorker =
  typeof process !== 'undefined' &&
  (Boolean(process.env.CLOUDFLARE_WORKER) ||
    Boolean(process.env.WORKERS) ||
    !fs.existsSync);

// In-memory caches for fast read & write cycles
const inMemoryComments = new Map<string, StaffComment[]>();
const inMemoryReads = new Map<string, StaffCommentReadReceipt>(); // Key: `${orgId}_${quotationId}_${userId}`

function getCommentsFilePath(): string {
  if (isCloudflareWorker) return '';
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'staff-comments.json');
  } catch {
    return '';
  }
}

function getReadsFilePath(): string {
  if (isCloudflareWorker) return '';
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'staff-comment-reads.json');
  } catch {
    return '';
  }
}

function loadCommentsFromFile(): StaffComment[] {
  if (isCloudflareWorker) return [];
  try {
    const p = getCommentsFilePath();
    if (p && fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
    }
  } catch {}
  return [];
}

function saveCommentsToFile(comments: StaffComment[]): void {
  if (isCloudflareWorker) return;
  try {
    const p = getCommentsFilePath();
    if (p) fs.writeFileSync(p, JSON.stringify(comments.slice(-1000), null, 2), 'utf-8');
  } catch {}
}

function loadReadsFromFile(): StaffCommentReadReceipt[] {
  if (isCloudflareWorker) return [];
  try {
    const p = getReadsFilePath();
    if (p && fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8')) || [];
    }
  } catch {}
  return [];
}

function saveReadsToFile(reads: StaffCommentReadReceipt[]): void {
  if (isCloudflareWorker) return;
  try {
    const p = getReadsFilePath();
    if (p) fs.writeFileSync(p, JSON.stringify(reads.slice(-2000), null, 2), 'utf-8');
  } catch {}
}

// Initialise memory cache from file if available
if (!isCloudflareWorker) {
  try {
    const savedComments = loadCommentsFromFile();
    for (const c of savedComments) {
      const list = inMemoryComments.get(c.quotation_id) || [];
      if (!list.some((existing) => existing.id === c.id)) {
        list.push(c);
        inMemoryComments.set(c.quotation_id, list);
      }
    }
    const savedReads = loadReadsFromFile();
    for (const r of savedReads) {
      const key = `${r.organization_id}_${r.quotation_id}_${r.user_id}`;
      inMemoryReads.set(key, r);
    }
  } catch {}
}

export class StaffCommentService {
  /**
   * Get all internal comments for a quotation.
   * Comments are strictly scoped to the authorized organization.
   */
  public async getComments(quotationId: string, orgId: string): Promise<StaffComment[]> {
    const cachedList = inMemoryComments.get(quotationId) || [];
    let comments = cachedList.filter((c) => c.organization_id === orgId);

    // Sync from Supabase events if available
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('quotation_events')
          .select('*')
          .eq('quotation_id', quotationId)
          .eq('organization_id', orgId)
          .eq('event_type', 'INTERNAL_STAFF_COMMENT')
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          const dbComments: StaffComment[] = data.map((ev: any) => ({
            id: ev.id,
            organization_id: ev.organization_id,
            quotation_id: ev.quotation_id,
            author_id: ev.actor_id || ev.metadata?.author_id || '',
            author_name: ev.actor_name || ev.metadata?.author_name || 'Staff Member',
            author_email: ev.metadata?.author_email,
            author_role: ev.metadata?.author_role,
            text: ev.metadata?.text || '',
            mentions: Array.isArray(ev.metadata?.mentions) ? ev.metadata.mentions : [],
            created_at: ev.created_at,
            updated_at: ev.metadata?.updated_at,
          }));

          // Merge without duplicates
          const commentMap = new Map<string, StaffComment>();
          for (const c of comments) commentMap.set(c.id, c);
          for (const c of dbComments) commentMap.set(c.id, c);
          comments = Array.from(commentMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          inMemoryComments.set(quotationId, comments);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch staff comments from Supabase:', err);
    }

    return comments.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  /**
   * Add a new staff comment to a quotation.
   */
  public async addComment(params: {
    quotationId?: string;
    quotation_id?: string;
    orgId?: string;
    organization_id?: string;
    authorId?: string;
    author_id?: string;
    authorName?: string;
    author_name?: string;
    authorEmail?: string;
    author_email?: string;
    authorRole?: string;
    author_role?: string;
    text?: string;
    content?: string;
    mentions?: string[];
  }): Promise<StaffComment> {
    const quotationId = params.quotationId || params.quotation_id || '';
    const orgId = params.orgId || params.organization_id || '';
    const authorId = params.authorId || params.author_id || '';
    const authorName = params.authorName || params.author_name || 'Staff Member';
    const authorEmail = params.authorEmail || params.author_email;
    const authorRole = params.authorRole || params.author_role;
    const rawText = params.text || params.content || '';
    const cleanText = rawText.trim();
    if (!cleanText) {
      throw new Error('Comment text cannot be empty');
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Resolve mentions: combine explicitly provided IDs and any detected via @name matching
    const staffCandidates = await this.getMentionCandidates(orgId);
    const detectedMentionIds = this.detectMentionUserIds(cleanText, staffCandidates);
    const mentionSet = new Set<string>([
      ...(params.mentions || []),
      ...detectedMentionIds,
    ]);
    // The author cannot mention themselves to trigger unread indicators
    mentionSet.delete(authorId);
    const finalMentions = Array.from(mentionSet);

    const newComment: StaffComment = {
      id: commentId,
      organization_id: orgId,
      quotation_id: quotationId,
      author_id: authorId,
      author_name: authorName,
      author_email: authorEmail,
      author_role: authorRole || 'STAFF',
      text: cleanText,
      mentions: finalMentions,
      created_at: now,
    };

    // Save in memory
    const list = inMemoryComments.get(quotationId) || [];
    list.push(newComment);
    inMemoryComments.set(quotationId, list);

    // Author automatically reads their own comment
    await this.markCommentsRead(quotationId, orgId, authorId, commentId);

    // Save to file fallback
    try {
      const allComments = loadCommentsFromFile();
      allComments.push(newComment);
      saveCommentsToFile(allComments);
    } catch {}

    // Persist to Supabase quotation_events
    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase.from('quotation_events').insert({
          organization_id: params.orgId,
          quotation_id: params.quotationId,
          actor_type: 'USER',
          actor_id: params.authorId,
          actor_name: params.authorName,
          event_type: 'INTERNAL_STAFF_COMMENT',
          metadata: {
            author_id: params.authorId,
            author_name: params.authorName,
            author_email: params.authorEmail,
            author_role: params.authorRole,
            text: cleanText,
            mentions: finalMentions,
          },
          created_at: now,
        });
      }
    } catch (err) {
      console.warn('Failed to insert staff comment to Supabase:', err);
    }

    return newComment;
  }

  /**
   * Mark all comments on a quotation as read for a specific staff member.
   */
  public async markCommentsRead(
    quotationId: string,
    orgId: string,
    userId: string,
    lastReadCommentId?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const key = `${orgId}_${quotationId}_${userId}`;
    const readReceipt: StaffCommentReadReceipt = {
      organization_id: orgId,
      quotation_id: quotationId,
      user_id: userId,
      last_read_at: now,
      last_read_comment_id: lastReadCommentId,
    };

    inMemoryReads.set(key, readReceipt);

    // Save to file
    try {
      const allReads = loadReadsFromFile();
      const existingIdx = allReads.findIndex(
        (r) =>
          r.organization_id === orgId &&
          r.quotation_id === quotationId &&
          r.user_id === userId
      );
      if (existingIdx >= 0) {
        allReads[existingIdx] = readReceipt;
      } else {
        allReads.push(readReceipt);
      }
      saveReadsToFile(allReads);
    } catch {}

    // Save to Supabase quotation_events as read cursor
    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase.from('quotation_events').insert({
          organization_id: orgId,
          quotation_id: quotationId,
          actor_type: 'USER',
          actor_id: userId,
          actor_name: 'Staff Member',
          event_type: 'STAFF_COMMENT_READ',
          metadata: {
            user_id: userId,
            last_read_at: now,
            last_read_comment_id: lastReadCommentId || null,
          },
          created_at: now,
        });
      }
    } catch (err) {
      console.warn('Failed to insert staff read status to Supabase:', err);
    }

    return true;
  }

  /**
   * Calculate independent notification status for a specific staff member on a quotation.
   * State A: Everything read (hasUnread = false)
   * State B: Unread comments (hasUnread = true, hasUnreadMention = false) -> Comment ●
   * State C: Unread direct mention (hasUnreadMention = true) -> Comment @ ●
   */
  public async getNotificationStatus(
    quotationId: string,
    orgId: string,
    userId: string
  ): Promise<QuotationCommentNotificationStatus> {
    const comments = await this.getComments(quotationId, orgId);
    const key = `${orgId}_${quotationId}_${userId}`;
    let readReceipt = inMemoryReads.get(key);

    if (!readReceipt) {
      // Check Supabase for last read event
      try {
        const supabase = createAdminClient();
        if (supabase) {
          const { data } = await supabase
            .from('quotation_events')
            .select('*')
            .eq('quotation_id', quotationId)
            .eq('organization_id', orgId)
            .eq('event_type', 'STAFF_COMMENT_READ')
            .eq('actor_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            readReceipt = {
              organization_id: orgId,
              quotation_id: quotationId,
              user_id: userId,
              last_read_at: data[0].metadata?.last_read_at || data[0].created_at,
              last_read_comment_id: data[0].metadata?.last_read_comment_id,
            };
            inMemoryReads.set(key, readReceipt);
          }
        }
      } catch {}
    }

    const lastReadMs = readReceipt
      ? new Date(readReceipt.last_read_at).getTime()
      : 0;

    // Filter comments that:
    // 1. Are created AFTER the user's last read timestamp
    // 2. Are NOT authored by the user themselves (never unread for own comment)
    const unreadComments = comments.filter((c) => {
      if (c.author_id === userId) return false;
      const cMs = new Date(c.created_at).getTime();
      return cMs > lastReadMs;
    });

    // Unread direct mentions of this user
    const unreadMentionComments = unreadComments.filter((c) =>
      Array.isArray(c.mentions) && c.mentions.includes(userId)
    );

    return {
      hasUnread: unreadComments.length > 0,
      hasUnreadMention: unreadMentionComments.length > 0,
      unreadCount: unreadComments.length,
      unreadMentionCount: unreadMentionComments.length,
      lastReadAt: readReceipt?.last_read_at,
    };
  }

  /**
   * Batch calculate notification status for quotation list view.
   */
  public async getBatchNotificationStatus(
    quotationIds: string[],
    orgId: string,
    userId: string
  ): Promise<Record<string, QuotationCommentNotificationStatus>> {
    const results: Record<string, QuotationCommentNotificationStatus> = {};
    if (!quotationIds || quotationIds.length === 0) return results;

    await Promise.all(
      quotationIds.map(async (qId) => {
        try {
          const st = await this.getNotificationStatus(qId, orgId, userId);
          results[qId] = st;
        } catch {
          results[qId] = {
            hasUnread: false,
            hasUnreadMention: false,
            unreadCount: 0,
            unreadMentionCount: 0,
          };
        }
      })
    );

    return results;
  }

  /**
   * Get eligible staff members for @mention autocomplete dropdown.
   */
  public async getMentionCandidates(orgId: string): Promise<StaffMentionOption[]> {
    try {
      const members = await staffService.getStaffMembers(orgId);
      return members
        .filter((m) => m.is_active)
        .map((m) => ({
          id: m.id,
          full_name: m.full_name || m.email.split('@')[0],
          email: m.email,
          role: m.role || 'STAFF',
        }));
    } catch {
      return [];
    }
  }

  /**
   * Helper to detect mentioned user IDs from @name patterns in comment text.
   */
  private detectMentionUserIds(text: string, staffList: StaffMentionOption[]): string[] {
    const mentionedIds: string[] = [];
    const lower = text.toLowerCase();

    for (const staff of staffList) {
      const name = staff.full_name.trim().toLowerCase();
      const firstName = name.split(' ')[0];
      const emailPrefix = staff.email.split('@')[0].toLowerCase();

      if (
        lower.includes(`@${name}`) ||
        (firstName.length >= 3 && lower.includes(`@${firstName}`)) ||
        lower.includes(`@${emailPrefix}`)
      ) {
        if (!mentionedIds.includes(staff.id)) {
          mentionedIds.push(staff.id);
        }
      }
    }

    return mentionedIds;
  }
}

export const staffCommentService = new StaffCommentService();
