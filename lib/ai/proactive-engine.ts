import { store } from '@/lib/supabase/data-store';
import { Customer, Quotation, Invoice, CurrencyCode, PersistentRecommendationRecord } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';

export type PriorityLevel = 'URGENT' | 'ACTION_REQUIRED' | 'OPPORTUNITY' | 'INFORMATION';

export interface CustomerCandidateMatch {
  customer: Customer;
  score: number;
  reason: string;
}

export interface CustomerMatchResult {
  type: 'exact' | 'multiple' | 'none';
  customer?: Customer;
  matches: CustomerCandidateMatch[];
  searchedTerm: string;
}

export interface ProactiveAction {
  id: string;
  label: string;
  actionKey:
    | 'send_whatsapp'
    | 'send_email'
    | 'review_batch'
    | 'remind_later'
    | 'dismiss'
    | 'view_quote'
    | 'view_invoice'
    | 'create_quote';
  payload?: any;
}

export interface AiAttentionItem {
  id: string;
  recommendationKey?: string;
  cycleNumber?: number;
  priority: PriorityLevel;
  title: string;
  description: string;
  category:
    | 'quote_unapproved'
    | 'quote_expiring'
    | 'high_interest_lead'
    | 'invoice_overdue'
    | 'payment_pending'
    | 'batch_followup'
    | 'customer_viewed'
    | 'system_update';
  targetId?: string;
  targetNumber?: string;
  customerName?: string;
  amount?: number;
  currency?: CurrencyCode;
  daysWaiting?: number;
  viewCount?: number;
  recommendedActionText?: string;
  actions: ProactiveAction[];
  batchMessages?: Array<{
    targetId: string;
    targetNumber: string;
    recipientName: string;
    recipientContact: string;
    channel: 'WHATSAPP' | 'EMAIL';
    amount: number;
    currency: string;
    messageText: string;
    quoteUrl?: string;
  }>;
  status?: string;
  actionTaken?: string | null;
  actionTakenAt?: string | null;
  snoozeUntil?: string | null;
}

export interface DailyBriefingMetrics {
  quotesCreated: number;
  quotesSent: number;
  quoteValue: number;
  quotesViewed: number;
  quotesApproved: number;
  quotesRejected: number;
  quotesAwaitingApproval: number;
  quotesViewedUnapproved: number;
  quotesNotYetViewed: number;
  quotesDeleted: number;
  deletedQuotesAmount: number;
  paymentsReceived: number;
  outstandingPayments: number;
  overdueInvoicesCount: number;
  overdueInvoicesAmount: number;
  newCustomersCount: number;
  followUpsRequiredCount: number;
}

export interface WeekComparison {
  quotesCreatedChangePct: number;
  quotesApprovedChangePct: number;
  quotedValueChangePct: number;
  paymentsReceivedChangePct: number;
  summaryText: string;
}

export interface FourQuestionsAnswers {
  whatHappened: string;
  needsAttention: string[];
  shouldDoNext: string[];
  canDoForYou: Array<{
    title: string;
    actionKey: string;
    description: string;
    payload?: any;
  }>;
}

export interface DailyBusinessBriefing {
  greeting: string;
  currency: CurrencyCode;
  metrics: DailyBriefingMetrics;
  comparison: WeekComparison;
  attentionItems: AiAttentionItem[];
  fourQuestions: FourQuestionsAnswers;
  recentActions?: PersistentRecommendationRecord[];
  generatedAt: string;
}

/**
 * Normalizes customer or company string for fuzzy matching
 */
function normalizeString(val: string): string {
  return (val || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(llc|ltd|limited|pvt|private|inc|corp|corporation|co|trading|technical|services|customer|client)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Token & Levenshtein-like string similarity (0 to 100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = (str1 || '').trim().toLowerCase();
  const s2 = (str2 || '').trim().toLowerCase();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;

  // Direct substring check
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return Math.round((shorter / longer) * 90) + 10;
  }

  // Normalized token overlap
  const norm1 = normalizeString(s1);
  const norm2 = normalizeString(s2);
  if (norm1 === norm2 && norm1.length > 0) return 96;

  const tokens1 = norm1.split(' ').filter((t) => t.length > 1);
  const tokens2 = norm2.split(' ').filter((t) => t.length > 1);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const overlap = tokens1.filter((t) => tokens2.includes(t));
  if (overlap.length === Math.min(tokens1.length, tokens2.length) && overlap.length > 0) {
    return 88;
  }

  const score = (overlap.length / Math.max(tokens1.length, tokens2.length)) * 80;
  return Math.round(score);
}

/**
 * Intelligent customer matching checking Name, Company, Email, Phone, and GST/VAT.
 * Never guesses when confidence is ambiguous.
 */
export function matchCustomerIntelligently(
  customers: Customer[],
  queryTerm: string
): CustomerMatchResult {
  const rawTerm = (queryTerm || '').trim();
  const lowerTerm = rawTerm.toLowerCase();
  const cleanPhone = rawTerm.replace(/[^\d+]/g, '');

  if (!rawTerm || customers.length === 0) {
    return { type: 'none', matches: [], searchedTerm: rawTerm };
  }

  // 1. Direct Email Search if term has '@'
  if (lowerTerm.includes('@')) {
    const matched = customers.filter((c) => c.email && c.email.toLowerCase() === lowerTerm);
    if (matched.length === 1) {
      return {
        type: 'exact',
        customer: matched[0],
        matches: [{ customer: matched[0], score: 100, reason: 'Exact email match' }],
        searchedTerm: rawTerm,
      };
    }
    if (matched.length > 1) {
      return {
        type: 'multiple',
        matches: matched.map((c) => ({ customer: c, score: 100, reason: 'Exact email match' })),
        searchedTerm: rawTerm,
      };
    }
  }

  // 2. Direct Phone Search if term is 7+ digits
  if (cleanPhone.length >= 7 && (rawTerm.startsWith('+') || /^\d[\d\s\-]+$/.test(rawTerm))) {
    const matched = customers.filter(
      (c) => c.phone && c.phone.replace(/[^\d+]/g, '').includes(cleanPhone)
    );
    if (matched.length === 1) {
      return {
        type: 'exact',
        customer: matched[0],
        matches: [{ customer: matched[0], score: 100, reason: 'Exact phone match' }],
        searchedTerm: rawTerm,
      };
    }
    if (matched.length > 1) {
      return {
        type: 'multiple',
        matches: matched.map((c) => ({ customer: c, score: 100, reason: 'Exact phone match' })),
        searchedTerm: rawTerm,
      };
    }
  }

  // 3. Direct Tax / GSTIN / TRN check
  if (/^[A-Za-z0-9]{8,18}$/.test(rawTerm.replace(/\s/g, ''))) {
    const cleanTax = rawTerm.replace(/\s/g, '').toLowerCase();
    const matched = customers.filter(
      (c) =>
        (c.tax_number && c.tax_number.replace(/\s/g, '').toLowerCase() === cleanTax) ||
        (c.customer_gstin && c.customer_gstin.replace(/\s/g, '').toLowerCase() === cleanTax)
    );
    if (matched.length === 1) {
      return {
        type: 'exact',
        customer: matched[0],
        matches: [{ customer: matched[0], score: 100, reason: 'Tax/VAT identifier match' }],
        searchedTerm: rawTerm,
      };
    }
  }

  // 4. Name & Company Similarity Search
  const queryTokens = lowerTerm.split(/\s+/).filter((t) => t.length > 0);
  const scoredMatches: CustomerCandidateMatch[] = [];

  for (const cust of customers) {
    const custName = (cust.name || '').trim().toLowerCase();
    const compName = (cust.company_name || '').trim().toLowerCase();

    // Exact full name or company match
    if (custName === lowerTerm || compName === lowerTerm) {
      scoredMatches.push({ customer: cust, score: 100, reason: 'Exact name match' });
      continue;
    }

    const nameTokens = Array.from(
      new Set(`${custName} ${compName}`.split(/\s+/).filter((t) => t.length > 0))
    );

    // Check how many query tokens match tokens in the customer name/company
    const matchingTokens = queryTokens.filter((qt) =>
      nameTokens.some((nt) => nt === qt || nt.startsWith(qt) || qt.startsWith(nt))
    );

    if (matchingTokens.length === queryTokens.length) {
      // All words in query match!
      const ratio = queryTokens.length / Math.max(nameTokens.length, 1);
      const score = Math.round(75 + ratio * 20); // 75 to 95
      scoredMatches.push({ customer: cust, score, reason: 'Name token match' });
    } else if (matchingTokens.length > 0 && queryTokens.length > 1) {
      const ratio = matchingTokens.length / queryTokens.length;
      if (ratio >= 0.5) {
        scoredMatches.push({ customer: cust, score: Math.round(ratio * 70), reason: 'Partial name match' });
      }
    }
  }

  scoredMatches.sort((a, b) => b.score - a.score);

  if (scoredMatches.length === 0) {
    return { type: 'none', matches: [], searchedTerm: rawTerm };
  }

  if (scoredMatches.length === 1) {
    return {
      type: 'exact',
      customer: scoredMatches[0].customer,
      matches: scoredMatches,
      searchedTerm: rawTerm,
    };
  }

  // If there are multiple candidates
  const topMatch = scoredMatches[0];
  const secondMatch = scoredMatches[1];

  // If top match is 100% exact match and second match is not, return exact
  if (topMatch.score === 100 && secondMatch.score < 100) {
    return {
      type: 'exact',
      customer: topMatch.customer,
      matches: scoredMatches,
      searchedTerm: rawTerm,
    };
  }

  // If top match is significantly higher than second match
  if (
    (topMatch.score >= 80 && topMatch.score - secondMatch.score >= 15) ||
    (topMatch.score >= 85 && topMatch.score - secondMatch.score >= 10)
  ) {
    return {
      type: 'exact',
      customer: topMatch.customer,
      matches: scoredMatches,
      searchedTerm: rawTerm,
    };
  }

  return {
    type: 'multiple',
    matches: scoredMatches.slice(0, 5),
    searchedTerm: rawTerm,
  };
}

/**
 * Generates proactive AI Business Briefing, week-over-week performance comparison,
 * and categorized prioritized attention cards.
 */
export async function generateAiBusinessBriefing(
  orgId: string,
  env: 'live' | 'test' = 'live',
  firstName?: string,
  clientHour?: number
): Promise<DailyBusinessBriefing> {
  const [quotations, invoices, customers, org, deletedQuotations, persistedRecs, recentActions] = await Promise.all([
    store.getQuotations(orgId, { environment: env }),
    store.getInvoices(orgId, { environment: env }),
    store.getCustomers(orgId, { environment: env }),
    store.getOrganization(orgId),
    store.getDeletedQuotations(orgId),
    store.getRecommendations(orgId),
    store.getRecentAiActions(orgId, 10),
  ]);

  const currency = (org?.default_currency || 'USD') as CurrencyCode;
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 86400000;
  const FOURTEEN_DAYS_MS = 14 * 86400000;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

  // 1. Separate Last 7 Days vs Prior 7-14 Days
  const quotesLast7 = quotations.filter((q) => {
    const time = new Date(q.created_at || q.issue_date).getTime();
    return now - time <= SEVEN_DAYS_MS;
  });

  const quotesPrior7 = quotations.filter((q) => {
    const time = new Date(q.created_at || q.issue_date).getTime();
    const diff = now - time;
    return diff > SEVEN_DAYS_MS && diff <= FOURTEEN_DAYS_MS;
  });

  // Track deleted quotes in last 7 days separately (never include in active quotes count)
  const deletedLast7 = (deletedQuotations || []).filter((d) => {
    const time = new Date(d.deleted_at).getTime();
    return now - time <= SEVEN_DAYS_MS;
  });
  const quotesDeleted = deletedLast7.length;
  const deletedQuotesAmount = deletedLast7.reduce((sum, d) => sum + (d.grand_total || 0), 0);

  // Calculate Last 7 Days metrics (ACTIVE ONLY - deleted quotes NOT included in counts)
  const quotesCreated = quotesLast7.length;
  const quoteValue = quotesLast7.reduce((sum, q) => sum + (q.grand_total || 0), 0);
  const quotesApproved = quotesLast7.filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED').length;
  const quotesSent = quotesLast7.filter((q) => q.status !== 'DRAFT').length;
  const quotesRejected = quotesLast7.filter((q) => q.status === 'REJECTED').length;
  const quotesAwaitingApproval = quotations.filter((q) =>
    ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status)
  ).length;

  const quotesViewedUnapproved = quotations.filter(
    (q) => (q.view_count || 0) > 0 && ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status)
  ).length;

  const quotesNotYetViewed = quotations.filter(
    (q) => (q.view_count || 0) === 0 && ['SENT', 'PENDING_APPROVAL'].includes(q.status)
  ).length;

  // Invoices & Payments metrics
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const paymentsReceived = paidInvoices.reduce((sum, i) => sum + (i.paid_amount || i.grand_total || 0), 0);

  const outstandingInvoices = invoices.filter((i) => ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(i.status));
  const outstandingPayments = outstandingInvoices.reduce(
    (sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)),
    0
  );

  const overdueInvoices = invoices.filter(
    (i) =>
      i.status === 'OVERDUE' ||
      (['ISSUED', 'PARTIAL'].includes(i.status) && new Date(i.due_date).getTime() < now)
  );
  const overdueInvoicesCount = overdueInvoices.length;
  const overdueInvoicesAmount = overdueInvoices.reduce(
    (sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)),
    0
  );

  const newCustomersCount = customers.filter((c) => {
    const time = new Date(c.created_at).getTime();
    return now - time <= SEVEN_DAYS_MS;
  }).length;

  // 2. Week-over-Week Comparison
  const priorApproved = quotesPrior7.filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED').length;
  const priorQuotedValue = quotesPrior7.reduce((sum, q) => sum + (q.grand_total || 0), 0);

  const calcPctChange = (current: number, prior: number): number => {
    if (prior === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prior) / prior) * 100);
  };

  const quotesCreatedChangePct = calcPctChange(quotesCreated, quotesPrior7.length);
  const quotesApprovedChangePct = calcPctChange(quotesApproved, priorApproved);
  const quotedValueChangePct = calcPctChange(quoteValue, priorQuotedValue);

  let summaryText = 'QuoteFlow activity is steady.';
  if (quotesApprovedChangePct > 0) {
    summaryText = `Quote approvals increased ${quotesApprovedChangePct}% compared with last week.`;
  } else if (quotesCreatedChangePct > 0) {
    summaryText = `Quote generation increased ${quotesCreatedChangePct}% compared with last week.`;
  } else if (overdueInvoicesCount > 0) {
    summaryText = `${overdueInvoicesCount} invoice(s) currently require follow-up.`;
  }

  const comparison: WeekComparison = {
    quotesCreatedChangePct,
    quotesApprovedChangePct,
    quotedValueChangePct,
    paymentsReceivedChangePct: 0,
    summaryText,
  };

  // 3. Construct Prioritized Attention Items
  const attentionItems: AiAttentionItem[] = [];

  // Helper to evaluate and synchronize each recommendation candidate with persistent DB state
  function evaluateRecommendationCandidate(
    candidate: {
      type: 'invoice_overdue' | 'quote_expiring' | 'high_interest_lead' | 'quote_unapproved';
      priority: PriorityLevel;
      category:
        | 'quote_unapproved'
        | 'quote_expiring'
        | 'high_interest_lead'
        | 'invoice_overdue'
        | 'payment_pending'
        | 'batch_followup'
        | 'customer_viewed'
        | 'system_update';
      sourceId: string;
      sourceNumber: string;
      quoteId?: string;
      quoteNumber?: string;
      invoiceId?: string;
      invoiceNumber?: string;
      customerName: string;
      amount?: number;
      currency?: CurrencyCode;
      title: string;
      description: string;
      daysWaiting?: number;
      viewCount?: number;
      actions: ProactiveAction[];
    }
  ): AiAttentionItem | null {
    const sourceKey = candidate.sourceNumber || candidate.sourceId;
    const matching = persistedRecs.filter(
      (r) =>
        r.organization_id === orgId &&
        r.recommendation_type === candidate.type &&
        (r.quote_id === candidate.quoteId ||
          r.quote_number === candidate.quoteNumber ||
          r.invoice_id === candidate.invoiceId ||
          r.invoice_number === candidate.invoiceNumber ||
          r.recommendation_key.includes(sourceKey))
    );

    matching.sort((a, b) => (b.cycle_number || 1) - (a.cycle_number || 1));
    const latest = matching[0];

    if (latest) {
      // 1. If resolved, dismissed, or ignored -> DO NOT SHOW
      if (['resolved', 'dismissed', 'ignored'].includes(latest.status)) {
        return null;
      }

      // 2. If snoozed -> check if snooze_until has elapsed
      if (latest.status === 'snoozed') {
        if (latest.snooze_until && now < new Date(latest.snooze_until).getTime()) {
          return null;
        }
      }

      // 3. If actioned (e.g. WhatsApp or email was sent) -> check if 7 days elapsed to create Cycle 2/3
      if (latest.status === 'actioned') {
        const actionTime = new Date(latest.action_taken_at || latest.updated_at).getTime();
        const daysSinceAction = (now - actionTime) / 86400000;
        if (daysSinceAction >= 7) {
          const nextCycle = (latest.cycle_number || 1) + 1;
          const nextKey = `${candidate.type}:${sourceKey}:cycle_${nextCycle}`;
          const existingNextCycle = matching.find((m) => m.cycle_number === nextCycle);
          if (
            existingNextCycle &&
            ['dismissed', 'ignored', 'resolved', 'actioned'].includes(existingNextCycle.status)
          ) {
            return null;
          }

          const channelLabel = latest.action_taken === 'whatsapp_sent' ? 'WhatsApp' : 'Email';
          const cycleTitle = `${candidate.title} (Follow-Up Cycle ${nextCycle})`;
          const cycleDesc = `You sent ${candidate.customerName} a ${channelLabel} reminder ${Math.round(
            daysSinceAction
          )} days ago, but Quote #${candidate.sourceNumber} is still awaiting approval. Would you like to follow up again?`;

          return {
            id: existingNextCycle ? existingNextCycle.id : `rec_${nextKey}`,
            recommendationKey: nextKey,
            cycleNumber: nextCycle,
            priority: candidate.priority,
            category: candidate.category,
            title: cycleTitle,
            description: cycleDesc,
            targetId: candidate.sourceId,
            targetNumber: candidate.sourceNumber,
            customerName: candidate.customerName,
            amount: candidate.amount,
            currency: candidate.currency,
            daysWaiting: candidate.daysWaiting,
            viewCount: candidate.viewCount,
            actions: candidate.actions,
            status: existingNextCycle ? existingNextCycle.status : 'pending',
            actionTaken: existingNextCycle?.action_taken || null,
            actionTakenAt: existingNextCycle?.action_taken_at || null,
            snoozeUntil: existingNextCycle?.snooze_until || null,
          };
        } else {
          // Less than 7 days since action -> Keep hidden, do not repeat
          return null;
        }
      }

      // 4. If pending -> show active item with persistent id & key
      return {
        id: latest.id,
        recommendationKey: latest.recommendation_key,
        cycleNumber: latest.cycle_number || 1,
        priority: candidate.priority,
        category: candidate.category,
        title: candidate.title,
        description: candidate.description,
        targetId: candidate.sourceId,
        targetNumber: candidate.sourceNumber,
        customerName: candidate.customerName,
        amount: candidate.amount,
        currency: candidate.currency,
        daysWaiting: candidate.daysWaiting,
        viewCount: candidate.viewCount,
        actions: candidate.actions,
        status: latest.status,
        actionTaken: latest.action_taken || null,
        actionTakenAt: latest.action_taken_at || null,
        snoozeUntil: latest.snooze_until || null,
      };
    }

    // 5. No record in DB yet -> Create Cycle 1 record and save it
    const initialKey = `${candidate.type}:${sourceKey}:cycle_1`;
    const initialId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newRec: PersistentRecommendationRecord = {
      id: initialId,
      recommendation_key: initialKey,
      organization_id: orgId,
      customer_id: undefined,
      customer_name: candidate.customerName,
      quote_id: candidate.quoteId,
      quote_number: candidate.quoteNumber,
      invoice_id: candidate.invoiceId,
      invoice_number: candidate.invoiceNumber,
      recommendation_type: candidate.type,
      priority: candidate.priority,
      title: candidate.title,
      description: candidate.description,
      amount: candidate.amount,
      currency: candidate.currency,
      status: 'pending',
      action_taken: null,
      cycle_number: 1,
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    };

    store.saveRecommendation(newRec).catch((err) => console.warn('Could not save recommendation:', err));

    return {
      id: newRec.id,
      recommendationKey: initialKey,
      cycleNumber: 1,
      priority: candidate.priority,
      category: candidate.category,
      title: candidate.title,
      description: candidate.description,
      targetId: candidate.sourceId,
      targetNumber: candidate.sourceNumber,
      customerName: candidate.customerName,
      amount: candidate.amount,
      currency: candidate.currency,
      daysWaiting: candidate.daysWaiting,
      viewCount: candidate.viewCount,
      actions: candidate.actions,
      status: 'pending',
    };
  }

  // A. URGENT: Overdue Invoices (Past 7 Days only for AI Attention)
  const overdueInvoicesLast7 = overdueInvoices.filter((inv) => {
    const overdueTime = new Date(inv.due_date).getTime();
    return now - overdueTime <= SEVEN_DAYS_MS && overdueTime <= now;
  });

  for (const inv of (overdueInvoicesLast7.length > 0 ? overdueInvoicesLast7 : overdueInvoices).slice(0, 3)) {
    const cust = inv.customer || customers.find((c) => c.id === inv.customer_id);
    const balance = (inv.grand_total || 0) - (inv.paid_amount || 0);
    const custName = cust?.name || 'Customer';
    const custPhone = cust?.phone || '';
    const custEmail = cust?.email || '';

    const item = evaluateRecommendationCandidate({
      type: 'invoice_overdue',
      priority: 'URGENT',
      category: 'invoice_overdue',
      sourceId: inv.id,
      sourceNumber: inv.invoice_number,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      customerName: custName,
      amount: balance,
      currency,
      title: `Invoice #${inv.invoice_number} is Overdue`,
      description: `Invoice ${inv.invoice_number} for ${formatCurrency(balance, currency)} became overdue on ${new Date(
        inv.due_date
      ).toLocaleDateString()}. Customer ${custName} has not settled payment.`,
      actions: [
        {
          id: 'act_wa_inv',
          label: 'Send WhatsApp Reminder',
          actionKey: 'send_whatsapp',
          payload: {
            recipientPhone: custPhone,
            message: `Hi ${custName}, this is a friendly reminder that Invoice #${inv.invoice_number} for ${formatCurrency(
              balance,
              currency
            )} is overdue. Kindly complete payment at your earliest convenience. Thank you!`,
          },
        },
        {
          id: 'act_em_inv',
          label: 'Send Email Reminder',
          actionKey: 'send_email',
          payload: {
            recipientEmail: custEmail,
            subject: `Payment Reminder: Invoice #${inv.invoice_number}`,
            body: `Dear ${custName},\n\nWe hope this email finds you well. Our records show Invoice #${inv.invoice_number} for ${formatCurrency(
              balance,
              currency
            )} is currently overdue.\n\nPlease process payment today. Thank you for your business!`,
          },
        },
        { id: 'act_view_inv', label: 'View Invoice', actionKey: 'view_invoice', payload: { invoiceId: inv.id } },
        { id: 'act_dismiss', label: 'Dismiss', actionKey: 'dismiss' },
      ],
    });

    if (item) attentionItems.push(item);
  }

  // A2. URGENT / WARNING: In-Progress Quotations Nearing Deadline (e.g. 6th day of 7 days)
  const inProgressQuotes = quotations.filter((q) => {
    if (q.status !== 'IN_PROGRESS') return false;
    const startTime = new Date(q.in_progress_at || q.updated_at || q.created_at).getTime();
    const ageDays = (now - startTime) / 86400000;
    return ageDays <= 7;
  });

  for (const q of inProgressQuotes) {
    const cust = q.customer || customers.find((c) => c.id === q.customer_id);
    const custName = cust?.name || 'Customer';
    const startTime = new Date(q.in_progress_at || q.updated_at || q.created_at).getTime();
    const daysElapsed = Math.floor((now - startTime) / 86400000);
    const estimatedDays =
      q.estimated_days ??
      (q.estimated_completion_date
        ? Math.max(1, Math.round((new Date(q.estimated_completion_date).getTime() - startTime) / 86400000))
        : null);

    let isWarningTime = false;
    let daysRemaining = 0;

    if (estimatedDays && estimatedDays >= 2) {
      daysRemaining = estimatedDays - daysElapsed;
      // Warning on the 6th day of 7 days (1 day remaining or daysElapsed >= estimatedDays - 1)
      if (daysRemaining <= 1 && daysRemaining >= 0) {
        isWarningTime = true;
      }
    } else if (q.estimated_completion_date) {
      const targetTime = new Date(q.estimated_completion_date).getTime();
      const hoursRemaining = (targetTime - now) / 3600000;
      if (hoursRemaining > 0 && hoursRemaining <= 36) {
        isWarningTime = true;
        daysRemaining = Math.max(0, Math.round(hoursRemaining / 24));
      }
    }

    if (isWarningTime) {
      const totalDays = estimatedDays || 7;
      const currentDay = Math.min(daysElapsed + 1, totalDays);
      const dayLabel = `(Day ${currentDay} of ${totalDays})`;

      const item = evaluateRecommendationCandidate({
        type: 'quote_expiring',
        priority: 'URGENT',
        category: 'quote_expiring',
        sourceId: q.id,
        sourceNumber: q.quotation_number,
        quoteId: q.id,
        quoteNumber: q.quotation_number,
        customerName: custName,
        amount: q.grand_total,
        currency: q.currency,
        title: `⚠️ Quote #${q.quotation_number} In-Progress: 1 Day Left ${dayLabel}`.trim(),
        description: `Quotation #${q.quotation_number} (${formatCurrency(
          q.grand_total,
          q.currency
        )}) for ${custName} is scheduled for completion soon. Day ${currentDay} of ${totalDays} reached. Please review progress, finish delivery, or update the client.`,
        actions: [
          { id: 'act_view_q', label: 'View Quote', actionKey: 'view_quote', payload: { quoteId: q.id } },
          { id: 'act_remind_later', label: 'Remind Later', actionKey: 'remind_later' },
          { id: 'act_dismiss', label: 'Dismiss', actionKey: 'dismiss' },
        ],
      });

      if (item) attentionItems.push(item);
    }
  }

  // B. URGENT: Expiring Quotes (< 48 hours remaining)
  const expiringQuotes = quotations.filter((q) => {
    if (!['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status)) return false;
    const expiry = new Date(q.valid_until).getTime();
    const remainingHours = (expiry - now) / 3600000;
    return remainingHours > 0 && remainingHours <= 48;
  });

  for (const q of expiringQuotes.slice(0, 2)) {
    const custName = q.customer?.name || 'Customer';
    const item = evaluateRecommendationCandidate({
      type: 'quote_expiring',
      priority: 'URGENT',
      category: 'quote_expiring',
      sourceId: q.id,
      sourceNumber: q.quotation_number,
      quoteId: q.id,
      quoteNumber: q.quotation_number,
      customerName: custName,
      amount: q.grand_total,
      currency: q.currency,
      title: `Quote #${q.quotation_number} Expires Soon`,
      description: `Quote #${q.quotation_number} (${formatCurrency(
        q.grand_total,
        q.currency
      )}) sent to ${custName} expires tomorrow. Follow up before validity lapses.`,
      actions: [
        {
          id: 'act_exp_wa',
          label: 'Send WhatsApp Reminder',
          actionKey: 'send_whatsapp',
          payload: {
            recipientPhone: q.customer?.phone || '',
            message: `Hi ${custName}, your quotation #${q.quotation_number} (${formatCurrency(
              q.grand_total,
              q.currency
            )}) expires tomorrow. Please approve or let us know if you need adjustments: ${appUrl}/q/${q.public_token}`,
          },
        },
        { id: 'act_view_q', label: 'View Quote', actionKey: 'view_quote', payload: { quoteId: q.id } },
        { id: 'act_dismiss', label: 'Dismiss', actionKey: 'dismiss' },
      ],
    });

    if (item) attentionItems.push(item);
  }

  // C. OPPORTUNITY: High-Interest Leads (Viewed multiple times >= 2 without approval in last 72h)
  const highInterestQuotes = quotations.filter((q) => {
    return (
      (q.view_count || 0) >= 2 &&
      ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status) &&
      now - new Date(q.updated_at || q.issue_date).getTime() <= 3 * 86400000
    );
  });

  for (const q of highInterestQuotes.slice(0, 2)) {
    const custName = q.customer?.name || 'Customer';
    const views = q.view_count || 2;
    const item = evaluateRecommendationCandidate({
      type: 'high_interest_lead',
      priority: 'OPPORTUNITY',
      category: 'high_interest_lead',
      sourceId: q.id,
      sourceNumber: q.quotation_number,
      quoteId: q.id,
      quoteNumber: q.quotation_number,
      customerName: custName,
      viewCount: views,
      amount: q.grand_total,
      currency: q.currency,
      title: `High-Interest Lead: ${custName}`,
      description: `Customer ${custName} viewed Quote #${q.quotation_number} (${formatCurrency(
        q.grand_total,
        q.currency
      )}) ${views} times recently but hasn't approved it yet. Strike while interest is hot!`,
      actions: [
        {
          id: 'act_lead_wa',
          label: 'Send WhatsApp Follow-up',
          actionKey: 'send_whatsapp',
          payload: {
            recipientPhone: q.customer?.phone || '',
            message: `Hello ${custName}, I noticed you were reviewing Quote #${q.quotation_number}. Do you have any questions or can we proceed with approval? ${appUrl}/q/${q.public_token}`,
          },
        },
        {
          id: 'act_lead_em',
          label: 'Send Email Follow-up',
          actionKey: 'send_email',
          payload: {
            recipientEmail: q.customer?.email || '',
            subject: `Following up on Quotation #${q.quotation_number}`,
            body: `Hi ${custName},\n\nI hope your week is going well. We are following up regarding Quote #${q.quotation_number} (${formatCurrency(
              q.grand_total,
              q.currency
            )}). Let us know if you would like any modifications before we finalize!\n\nReview quote: ${appUrl}/q/${q.public_token}`,
          },
        },
        { id: 'act_remind_later', label: 'Remind Me Later', actionKey: 'remind_later' },
        { id: 'act_ignore', label: 'Ignore', actionKey: 'dismiss' },
      ],
    });

    if (item) attentionItems.push(item);
  }

  // D. ACTION REQUIRED: Quotes Waiting for Approval in Past 7 Days (3 to 7 days)
  const unapprovedQuotes = quotations.filter((q) => {
    if (!['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status)) return false;
    const ageDays = (now - new Date(q.issue_date || q.created_at).getTime()) / 86400000;
    return ageDays >= 3 && ageDays <= 7;
  });

  for (const q of unapprovedQuotes.slice(0, 3)) {
    const custName = q.customer?.name || 'Customer';
    const ageDays = Math.floor((now - new Date(q.issue_date || q.created_at).getTime()) / 86400000);
    const views = q.view_count || 0;

    const item = evaluateRecommendationCandidate({
      type: 'quote_unapproved',
      priority: 'ACTION_REQUIRED',
      category: 'quote_unapproved',
      sourceId: q.id,
      sourceNumber: q.quotation_number,
      quoteId: q.id,
      quoteNumber: q.quotation_number,
      customerName: custName,
      daysWaiting: ageDays,
      viewCount: views,
      amount: q.grand_total,
      currency: q.currency,
      title: `Quote #${q.quotation_number} Awaiting Decision (${ageDays} Days)`,
      description: `Quote #${q.quotation_number} was sent to ${custName} ${ageDays} days ago. The customer has viewed it ${views} time(s) but has not approved it.`,
      actions: [
        {
          id: 'act_unapp_wa',
          label: 'Send WhatsApp Reminder',
          actionKey: 'send_whatsapp',
          payload: {
            recipientPhone: q.customer?.phone || '',
            message: `Hi ${custName}, following up on Quote #${q.quotation_number} (${formatCurrency(
              q.grand_total,
              q.currency
            )}) sent ${ageDays} days ago. Please let us know if you are ready to proceed: ${appUrl}/q/${q.public_token}`,
          },
        },
        {
          id: 'act_unapp_em',
          label: 'Send Email Reminder',
          actionKey: 'send_email',
          payload: {
            recipientEmail: q.customer?.email || '',
            subject: `Follow-up: Quote #${q.quotation_number}`,
            body: `Dear ${custName},\n\nWe are following up on Quote #${q.quotation_number} sent ${ageDays} days ago. Would you like us to schedule a quick call or proceed with approval?\n\nReview quote: ${appUrl}/q/${q.public_token}`,
          },
        },
        { id: 'act_remind_later', label: 'Remind Me Later', actionKey: 'remind_later' },
        { id: 'act_ignore', label: 'Ignore', actionKey: 'dismiss' },
      ],
    });

    if (item) attentionItems.push(item);
  }

  // E. Batch Follow-up Item (if >= 2 unapproved quotes exist)
  if (unapprovedQuotes.length >= 2) {
    const batchMessages = unapprovedQuotes.slice(0, 5).map((q) => {
      const c = q.customer || customers.find((cust) => cust.id === q.customer_id);
      const name = c?.name || 'Customer';
      const phone = c?.phone || '';
      const email = c?.email || '';
      const channel = phone && phone.length >= 7 ? ('WHATSAPP' as const) : ('EMAIL' as const);
      const contact = channel === 'WHATSAPP' ? phone : email;

      return {
        targetId: q.id,
        targetNumber: q.quotation_number,
        recipientName: name,
        recipientContact: contact,
        channel,
        amount: q.grand_total,
        currency: q.currency,
        quoteUrl: `${appUrl}/q/${q.public_token}`,
        messageText: `Hi ${name}, following up on Quotation #${q.quotation_number} (${formatCurrency(
          q.grand_total,
          q.currency
        )}). Let us know if you are ready to approve: ${appUrl}/q/${q.public_token}`,
      };
    });

    attentionItems.unshift({
      id: 'batch_followup_quotes',
      priority: 'ACTION_REQUIRED',
      category: 'batch_followup',
      title: `${unapprovedQuotes.length} Quotations Need Follow-Up`,
      description: `${unapprovedQuotes.length} quotations have been waiting for approval for more than 5 days. I can prepare personalized reminder messages for all recipients.`,
      recommendedActionText: 'Review messages before sending',
      batchMessages,
      actions: [
        {
          id: 'act_review_batch',
          label: 'Review Messages',
          actionKey: 'review_batch',
          payload: { batchMessages },
        },
        { id: 'act_remind_later', label: 'Remind Later', actionKey: 'remind_later' },
      ],
    });
  }

  // F. INFORMATION: Weekly Highlights & Approvals
  attentionItems.push({
    id: 'info_summary',
    priority: 'INFORMATION',
    category: 'system_update',
    title: 'Weekly Performance Overview',
    description: `In the last 7 days: ${quotesCreated} quotes created (${formatCurrency(
      quoteValue,
      currency
    )} total), ${quotesApproved} quotes approved, and ${formatCurrency(
      paymentsReceived,
      currency
    )} in received payments.`,
    actions: [{ id: 'act_view_report', label: 'View Reports', actionKey: 'custom', payload: { url: '/reports' } }],
  });

  if (quotesDeleted > 0) {
    attentionItems.push({
      id: 'info_deleted_quotes',
      priority: 'INFORMATION',
      category: 'system_update',
      title: `${quotesDeleted} Quote(s) Deleted in Last 7 Days`,
      description: `${quotesDeleted} quote(s) totaling ${formatCurrency(
        deletedQuotesAmount,
        currency
      )} were deleted in the last 7 days and are excluded from your active pipeline count.`,
      actions: [],
    });
  }

  // Count follow-ups required
  const followUpsRequiredCount = attentionItems.filter((i) => i.priority === 'URGENT' || i.priority === 'ACTION_REQUIRED').length;

  const metrics: DailyBriefingMetrics = {
    quotesCreated,
    quotesSent,
    quoteValue,
    quotesViewed: quotations.reduce((sum, q) => sum + (q.view_count || 0), 0),
    quotesApproved,
    quotesRejected,
    quotesAwaitingApproval,
    quotesViewedUnapproved,
    quotesNotYetViewed,
    quotesDeleted,
    deletedQuotesAmount,
    paymentsReceived,
    outstandingPayments,
    overdueInvoicesCount,
    overdueInvoicesAmount,
    newCustomersCount,
    followUpsRequiredCount,
  };

  // 4. Continuously Answer the 4 Core Questions
  let whatHappened = `In the last 7 days, your business generated ${quotesCreated} active quote(s) worth ${formatCurrency(
    quoteValue,
    currency
  )}. ${quotesApproved} quote(s) were approved, and you received ${formatCurrency(paymentsReceived, currency)} in settled payments.`;

  if (quotesDeleted > 0) {
    whatHappened += ` Note: ${quotesDeleted} quotation(s) were deleted during this period and are excluded from active counts.`;
  }

  const needsAttention: string[] = [];
  if (overdueInvoicesCount > 0) {
    needsAttention.push(`${overdueInvoicesCount} overdue invoice(s) totaling ${formatCurrency(overdueInvoicesAmount, currency)}.`);
  }
  if (expiringQuotes.length > 0) {
    needsAttention.push(`${expiringQuotes.length} quote(s) expiring within 48 hours.`);
  }
  if (unapprovedQuotes.length > 0) {
    needsAttention.push(`${unapprovedQuotes.length} quote(s) awaiting customer approval for 5+ days.`);
  }
  if (highInterestQuotes.length > 0) {
    needsAttention.push(`${highInterestQuotes.length} high-interest client(s) viewed quotes multiple times without signing.`);
  }
  if (needsAttention.length === 0) {
    needsAttention.push('All quotations, approvals, and invoices are up to date!');
  }

  const shouldDoNext: string[] = [
    ...(overdueInvoicesCount > 0 ? ['Send payment reminders to overdue accounts to protect cash flow.'] : []),
    ...(highInterestQuotes.length > 0 ? ['Reach out to high-interest leads while quote engagement is highest.'] : []),
    ...(unapprovedQuotes.length > 0 ? ['Dispatch 5-day follow-up reminders to waiting proposals.'] : []),
    'Review conversion rates and create fresh quotes for incoming leads.',
  ];

  const canDoForYou: Array<{ title: string; actionKey: string; description: string; payload?: any }> = [
    {
      title: 'Batch Send 5-Day Follow-ups',
      actionKey: 'review_batch',
      description: 'Prepare personalized WhatsApp and Email follow-up messages for approval.',
    },
    {
      title: 'Draft Invoice Reminders',
      actionKey: 'send_whatsapp',
      description: 'Prepare overdue payment notifications for delinquent invoices.',
    },
    {
      title: 'Draft Quotation from Text',
      actionKey: 'create_quote',
      description: 'Create new proposals with automated item, tax, and customer matching.',
    },
  ];

  const greetingName = firstName || 'there';
  const hour = typeof clientHour === 'number' && !isNaN(clientHour) ? clientHour : new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return {
    greeting: `${timeGreeting}, ${greetingName} 👋`,
    currency,
    metrics,
    comparison,
    attentionItems,
    fourQuestions: {
      whatHappened,
      needsAttention,
      shouldDoNext,
      canDoForYou,
    },
    recentActions,
    generatedAt: new Date().toISOString(),
  };
}
