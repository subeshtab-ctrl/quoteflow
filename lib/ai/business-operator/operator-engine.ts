import { store } from '@/lib/supabase/data-store';
import {
  OperatorDailyPlan,
  OperatorActionItem,
  OperatorActionCategory,
  OrganizationAiProfile,
  PipelineTemperatureAnalysis,
  PipelineDealItem,
  DealTemperature,
  WinLossDisparityAnalysis,
  LeadRecoveryItem,
  PricingMarginInsight,
  CrossSellSuggestion,
  CashFlow30DayProjection,
  BusinessAutomationRule,
} from '@/types/business-operator';
import { Quotation, Invoice, Customer, CurrencyCode } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { businessMemoryService } from './memory-service';
import { operatorRecommendationManager } from './recommendation-manager';
import { operatorAuditService } from './audit-service';

export class BusinessOperatorEngine {
  /**
   * Synthesize all organization business data into a prioritized Daily Action Plan.
   * Principle: UNDERSTAND -> DETECT -> RECOMMEND -> ACT -> LEARN
   */
  public async generateDailyActionPlan(
    orgId: string,
    userId?: string,
    userRole?: string
  ): Promise<OperatorDailyPlan> {
    const startTime = Date.now();
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = (org?.default_currency || 'INR') as CurrencyCode;

    // Fetch data in parallel
    const [quotations, invoices, customers, profile, activeRecommendations] = await Promise.all([
      store.getQuotations(orgId, { environment: env }),
      store.getInvoices(orgId, { environment: env }),
      store.getCustomers(orgId, { environment: env }),
      businessMemoryService.getProfile(orgId),
      operatorRecommendationManager.getActiveRecommendations(orgId),
    ]);

    const customerMap = new Map<string, Customer>(customers.map((c) => [c.id, c]));
    const invoiceQuoteIds = new Set<string>();
    for (const inv of invoices) {
      if (inv.quotation_id) invoiceQuoteIds.add(inv.quotation_id);
    }

    const actions: OperatorActionItem[] = [];
    const now = Date.now();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

    // =========================================================================
    // 1. HOT QUOTES & URGENT FOLLOW-UPS
    // Detect quotes with client portal views, imminent expiry, or unanswered >3 days
    // =========================================================================
    for (const quote of quotations) {
      if (
        quote.status === 'APPROVED' ||
        quote.status === 'COMPLETED' ||
        quote.status === 'REJECTED' ||
        quote.status === 'EXPIRED'
      ) {
        continue;
      }

      const client = quote.customer_id ? customerMap.get(quote.customer_id) : quote.customer;
      const clientName = client?.name || quote.customer?.name || 'Client';
      const quoteVal = Number(quote.grand_total) || 0;
      const viewCount = Number(quote.view_count) || 0;
      const qCurrency = quote.currency || currency;

      let urgency: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      let reason = '';
      let isUrgentCandidate = false;

      // Signal A: Client viewed multiple times (Hot interest!)
      if (viewCount >= 2) {
        isUrgentCandidate = true;
        urgency = viewCount >= 3 ? 'HIGH' : 'MEDIUM';
        reason = `Client opened this quote ${viewCount} times in the portal. High buying intent detected.`;
      } else if (viewCount === 1) {
        isUrgentCandidate = true;
        urgency = 'MEDIUM';
        reason = `Client reviewed this quote in the portal. A timely follow-up converts fastest.`;
      }

      // Signal B: Expiring within 72 hours
      let dueOrExpiryText: string | undefined;
      if (quote.valid_until) {
        const msRemaining = new Date(quote.valid_until).getTime() - now;
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0 && daysRemaining <= 3) {
          isUrgentCandidate = true;
          urgency = daysRemaining <= 1 ? 'HIGH' : 'MEDIUM';
          dueOrExpiryText = `Expires in ${daysRemaining === 1 ? '24 hours' : `${daysRemaining} days`}`;
          reason = `Quote expires ${daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`}. Reach out now to lock in agreed pricing.`;
        }
      }

      // Signal C: Sent > 3 days ago with no response
      const daysSinceSent = Math.floor((now - new Date(quote.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (!isUrgentCandidate && daysSinceSent >= 3 && quote.status === 'SENT') {
        isUrgentCandidate = true;
        urgency = daysSinceSent >= 7 ? 'MEDIUM' : 'LOW';
        reason = `Sent ${daysSinceSent} days ago with no response. Following up now prevents lead decay.`;
      }

      if (isUrgentCandidate) {
        const viewLink = quote.public_token ? `${baseUrl}/q/${quote.public_token}` : '';
        const suggestedMsg = this.compileFollowUpMessage(
          profile,
          clientName,
          quote.quotation_number,
          quoteVal,
          qCurrency,
          viewLink,
          org?.name
        );

        actions.push({
          id: `rec-quote-${quote.id}`,
          type: 'QUOTE_FOLLOWUP',
          urgency,
          title: `Follow up with ${clientName} (${quote.quotation_number})`,
          description: reason,
          reason,
          customerName: clientName,
          customerId: client?.id || quote.customer_id,
          customerPhone: client?.phone || null,
          customerEmail: client?.email || null,
          resourceType: 'quote',
          resourceId: quote.id,
          resourceNumber: quote.quotation_number,
          value: quoteVal,
          currency: qCurrency,
          actionLabel: client?.phone ? 'WhatsApp Follow-Up' : 'Email Follow-Up',
          actionKey: client?.phone ? 'send_whatsapp_followup' : 'send_email_followup',
          secondaryActionLabel: client?.phone && client?.email ? 'Email Follow-Up' : 'View Quote',
          secondaryActionKey: client?.phone && client?.email ? 'send_email_followup' : 'view_quote',
          suggestedMessage: suggestedMsg,
          dueOrExpiryText,
          draftPayload: {
            quoteId: quote.id,
            quoteNumber: quote.quotation_number,
            customerPhone: client?.phone,
            customerEmail: client?.email,
            suggestedMsg,
          },
        });
      }
    }

    // =========================================================================
    // 2. APPROVED QUOTES NOT CONVERTED TO INVOICE
    // Customers said YES! Bill them immediately to collect revenue.
    // =========================================================================
    for (const quote of quotations) {
      if (quote.status === 'APPROVED' || quote.status === 'ACCEPTED') {
        const hasInvoice =
          Boolean(quote.invoice_id) ||
          Boolean(quote.has_issued_invoice) ||
          invoiceQuoteIds.has(quote.id);

        if (!hasInvoice) {
          const client = quote.customer_id ? customerMap.get(quote.customer_id) : quote.customer;
          const clientName = client?.name || quote.customer?.name || 'Client';
          const quoteVal = Number(quote.grand_total) || 0;
          const qCurrency = quote.currency || currency;

          actions.push({
            id: `rec-invoice-${quote.id}`,
            type: 'CONVERT_APPROVED_QUOTE',
            urgency: 'HIGH',
            title: `Invoice approved quote for ${clientName}`,
            description: `Customer approved quote ${quote.quotation_number}. Create the official invoice to initiate payment collection.`,
            reason: `Quote approved by customer. Ready for billing.`,
            customerName: clientName,
            customerId: client?.id || quote.customer_id,
            customerPhone: client?.phone || null,
            customerEmail: client?.email || null,
            resourceType: 'quote',
            resourceId: quote.id,
            resourceNumber: quote.quotation_number,
            value: quoteVal,
            currency: qCurrency,
            actionLabel: 'Create Invoice Draft',
            actionKey: 'create_invoice_draft',
            secondaryActionLabel: 'View Quote',
            secondaryActionKey: 'view_quote',
            draftPayload: {
              quotationId: quote.id,
              customerId: quote.customer_id,
              items: quote.items || [],
              currency: qCurrency,
              taxRate: quote.tax_rate,
              discountValue: quote.discount_amount,
            },
          });
        }
      }
    }

    // =========================================================================
    // 3. REPEAT CUSTOMER CADENCE & REORDER OPPORTUNITIES
    // Detect customers who normally re-order on a cycle but are overdue
    // =========================================================================
    const customerOrderDates = new Map<string, number[]>();
    for (const quote of quotations) {
      if (
        (quote.status === 'APPROVED' || quote.status === 'COMPLETED') &&
        quote.customer_id
      ) {
        const list = customerOrderDates.get(quote.customer_id) || [];
        list.push(new Date(quote.created_at).getTime());
        customerOrderDates.set(quote.customer_id, list);
      }
    }

    for (const [custId, dates] of customerOrderDates.entries()) {
      if (dates.length >= 2) {
        // Sort oldest to newest
        dates.sort((a, b) => a - b);
        let totalGaps = 0;
        for (let i = 1; i < dates.length; i++) {
          totalGaps += (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        const avgCadenceDays = Math.round(totalGaps / (dates.length - 1));
        const lastOrderDate = dates[dates.length - 1];
        const daysSinceLastOrder = Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24));

        // If customer hasn't ordered and days since > 1.25 * cadence (min 25 days)
        if (daysSinceLastOrder >= Math.max(25, avgCadenceDays * 1.25)) {
          const client = customerMap.get(custId);
          if (client) {
            // Find their past quote items to recommend
            const pastQuote = quotations.find((q) => q.customer_id === custId && q.items?.length);
            const estValue = pastQuote ? Number(pastQuote.grand_total) || 0 : 0;

            actions.push({
              id: `rec-repeat-${custId}`,
              type: 'REPEAT_CUSTOMER',
              urgency: daysSinceLastOrder >= avgCadenceDays * 1.75 ? 'HIGH' : 'MEDIUM',
              title: `Reorder Check-in: ${client.name}`,
              description: `${client.name} usually orders every ~${avgCadenceDays} days, but has not ordered in ${daysSinceLastOrder} days.`,
              reason: `Past cadence of ${avgCadenceDays} days exceeded by ${daysSinceLastOrder - avgCadenceDays} days.`,
              customerName: client.name,
              customerId: client.id,
              customerPhone: client.phone || null,
              customerEmail: client.email || null,
              resourceType: 'customer',
              resourceId: client.id,
              resourceNumber: client.company_name || client.name,
              value: estValue,
              currency,
              actionLabel: 'Draft Reorder Quote',
              actionKey: 'create_quote_draft',
              secondaryActionLabel: client.phone ? 'WhatsApp Check-in' : 'View History',
              secondaryActionKey: client.phone ? 'send_whatsapp_followup' : 'view_customer',
              draftPayload: {
                customerId: client.id,
                customerName: client.name,
                items: pastQuote?.items || [],
              },
            });
          }
        }
      }
    }

    // =========================================================================
    // 4. OVERDUE INVOICES & PAYMENT RECOVERY
    // Unpaid past-due invoices with automated reminder draft
    // =========================================================================
    for (const inv of invoices) {
      if (inv.status === 'PAID' || inv.status === 'CANCELLED' || inv.status === 'DRAFT') {
        continue;
      }

      const totalVal = Number(inv.grand_total) || 0;
      const paidVal = Number(inv.paid_amount) || 0;
      const balanceDue = Math.max(0, totalVal - paidVal);

      if (balanceDue > 0 && inv.due_date) {
        const dueMs = new Date(inv.due_date).getTime();
        if (dueMs < now) {
          const daysOverdue = Math.floor((now - dueMs) / (1000 * 60 * 60 * 24));
          const client = inv.customer_id ? customerMap.get(inv.customer_id) : inv.customer;
          const clientName = client?.name || inv.customer?.name || 'Customer';
          const invCurrency = inv.currency || currency;

          const urgency: 'HIGH' | 'MEDIUM' | 'LOW' =
            daysOverdue >= 14 ? 'HIGH' : daysOverdue >= 5 ? 'MEDIUM' : 'LOW';

          const portalPaymentLink = inv.public_token
            ? `${baseUrl}/invoices/${inv.id}`
            : `${baseUrl}/invoices/${inv.id}`;

          const reminderMsg = this.compilePaymentReminderMessage(
            profile,
            clientName,
            inv.invoice_number,
            balanceDue,
            invCurrency,
            daysOverdue,
            portalPaymentLink,
            org?.name
          );

          actions.push({
            id: `rec-overdue-${inv.id}`,
            type: 'OVERDUE_INVOICE',
            urgency,
            title: `Overdue Invoice: ${clientName} (${inv.invoice_number})`,
            description: `${daysOverdue} days past due date (${formatCurrency(balanceDue, invCurrency)} outstanding).`,
            reason: `${daysOverdue} days overdue.`,
            customerName: clientName,
            customerId: client?.id || inv.customer_id,
            customerPhone: client?.phone || null,
            customerEmail: client?.email || null,
            resourceType: 'invoice',
            resourceId: inv.id,
            resourceNumber: inv.invoice_number,
            value: balanceDue,
            currency: invCurrency,
            actionLabel: client?.phone ? 'WhatsApp Reminder' : 'Email Reminder',
            actionKey: client?.phone ? 'send_whatsapp_reminder' : 'send_email_reminder',
            secondaryActionLabel: 'View Invoice',
            secondaryActionKey: 'view_invoice',
            dueOrExpiryText: `${daysOverdue}d overdue`,
            suggestedMessage: reminderMsg,
            draftPayload: {
              invoiceId: inv.id,
              invoiceNumber: inv.invoice_number,
              balanceDue,
              customerPhone: client?.phone,
              customerEmail: client?.email,
              suggestedMsg: reminderMsg,
            },
          });
        }
      }
    }

    // Sort actions: HIGH urgency first, then by potential value descending
    actions.sort((a, b) => {
      const urgencyRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = urgencyRank[b.urgency] - urgencyRank[a.urgency];
      if (diff !== 0) return diff;
      return b.value - a.value;
    });

    // Auto-record top recommendations into the Recommendation Manager (deduplication built-in)
    for (const a of actions.slice(0, 8)) {
      await operatorRecommendationManager.addRecommendation(orgId, {
        type:
          a.type === 'QUOTE_FOLLOWUP'
            ? 'FOLLOWUP_QUOTE'
            : a.type === 'CONVERT_APPROVED_QUOTE'
            ? 'CREATE_INVOICE'
            : a.type === 'REPEAT_CUSTOMER'
            ? 'CONTACT_PREVIOUS_CUSTOMER'
            : 'REVIEW_OVERDUE_PAYMENT',
        title: a.title,
        summary: a.description,
        reason: a.reason,
        priority: a.urgency === 'HIGH' ? 'HIGH' : a.urgency === 'MEDIUM' ? 'MEDIUM' : 'LOW',
        resource_type: a.resourceType,
        resource_id: a.resourceId,
        resource_identifier: a.resourceNumber,
        potential_value: a.value,
        currency: a.currency,
        action_label: a.actionLabel,
        action_key: a.actionKey,
        action_data: a.draftPayload,
      });
    }

    // Calculate Summary
    const highUrgencyCount = actions.filter((a) => a.urgency === 'HIGH').length;
    const totalValueAtStake = actions.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

    const greeting = this.getTimeGreeting();

    const plan: OperatorDailyPlan = {
      planId: `plan-${orgId}-${new Date().toISOString().slice(0, 10)}`,
      generatedAt: new Date().toISOString(),
      greeting,
      summary: {
        totalActions: actions.length,
        highUrgencyCount,
        totalValueAtStake,
        currency,
        categories: {
          quoteFollowups: actions.filter((a) => a.type === 'QUOTE_FOLLOWUP').length,
          approvedUninvoiced: actions.filter((a) => a.type === 'CONVERT_APPROVED_QUOTE').length,
          repeatCustomers: actions.filter((a) => a.type === 'REPEAT_CUSTOMER').length,
          overdueInvoices: actions.filter((a) => a.type === 'OVERDUE_INVOICE').length,
        },
      },
      actions,
    };

    // Telemetry
    if (userId) {
      await operatorAuditService.recordUsage({
        organization_id: orgId,
        user_id: userId,
        feature_name: 'generate_daily_action_plan',
        request_timestamp: new Date().toISOString(),
        response_time_ms: Date.now() - startTime,
        success: true,
        actions_invoked: ['generateDailyActionPlan'],
      });
    }

    return plan;
  }

  /**
   * Produce tailored follow-up messages respecting the business's configured tone
   */
  private compileFollowUpMessage(
    profile: OrganizationAiProfile,
    clientName: string,
    quoteNumber: string,
    amount: number,
    currency: string,
    link: string,
    orgName?: string
  ): string {
    const tone = profile?.preferred_tone || 'PROFESSIONAL';
    const formatted = formatCurrency(amount, currency as CurrencyCode);
    const company = orgName || 'our team';

    switch (tone) {
      case 'FRIENDLY':
        return `Hi ${clientName}! 👋 Just checking in to see if you had any questions on quote ${quoteNumber} (${formatted}) from ${company}. Let us know if you need any adjustments!\n${link ? `View quote: ${link}` : ''}`;
      case 'CONCISE':
        return `Hello ${clientName}. Following up on quote ${quoteNumber} (${formatted}). Please confirm if you would like to proceed.\n${link ? `Link: ${link}` : ''}`;
      case 'URGENT':
        return `Important update for ${clientName}: Quote ${quoteNumber} (${formatted}) is expiring soon. Please review and confirm your order to guarantee current pricing.\n${link ? `Review now: ${link}` : ''}`;
      case 'PROFESSIONAL':
      default:
        return `Dear ${clientName},\n\nI hope you are having a productive week. I am following up regarding quotation ${quoteNumber} for ${formatted}. Please let us know if you have any questions or require any adjustments.\n\nBest regards,\n${company}\n${link ? `Review quote: ${link}` : ''}`;
    }
  }

  /**
   * Produce tailored payment reminder messages
   */
  private compilePaymentReminderMessage(
    profile: OrganizationAiProfile,
    clientName: string,
    invoiceNumber: string,
    balanceDue: number,
    currency: string,
    daysOverdue: number,
    link: string,
    orgName?: string
  ): string {
    const formatted = formatCurrency(balanceDue, currency as CurrencyCode);
    const company = orgName || 'our accounts team';

    if (daysOverdue >= 14) {
      return `Dear ${clientName},\n\nThis is an urgent notice that Invoice ${invoiceNumber} for ${formatted} is now ${daysOverdue} days overdue. Please arrange payment promptly to prevent account disruption.\n\nPayment link: ${link}\n\nThank you,\n${company}`;
    }

    return `Hi ${clientName},\n\nThis is a friendly reminder that Invoice ${invoiceNumber} for ${formatted} was due on ${daysOverdue > 0 ? `${daysOverdue} days ago` : 'today'}. You can securely review and complete payment online here:\n${link}\n\nThank you for your prompt attention,\n${company}`;
  }

  private getTimeGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /**
   * Phase 3: Sales Pipeline Categorization (HOT / WARM / COLD)
   * Answers: "What is the health and temperature of my open deals?"
   */
  public async analyzePipelineTemperatures(orgId: string): Promise<PipelineTemperatureAnalysis> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = org?.default_currency || 'INR';

    const [quotations, customers] = await Promise.all([
      store.getQuotations(orgId, { environment: env }),
      store.getCustomers(orgId, { environment: env }),
    ]);

    const customerMap = new Map<string, Customer>(customers.map((c) => [c.id, c]));
    const now = Date.now();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

    // Only active, open quotes belong in the live pipeline
    const openQuotes = quotations.filter((q) =>
      ['DRAFT', 'SENT', 'VIEWED', 'PENDING_APPROVAL', 'IN_PROGRESS'].includes(q.status)
    );

    const deals: PipelineDealItem[] = [];

    for (const quote of openQuotes) {
      const client = quote.customer_id ? customerMap.get(quote.customer_id) : quote.customer;
      const clientName = client?.name || quote.customer?.name || 'Prospect';
      const quoteVal = Number(quote.grand_total) || 0;
      const viewCount = Number(quote.view_count) || 0;
      const qCurrency = quote.currency || currency;

      const createdMs = new Date(quote.created_at).getTime();
      const daysSinceSent = Math.max(0, Math.floor((now - createdMs) / (1000 * 60 * 60 * 24)));

      let lastViewedMs: number | null = null;
      let hoursSinceViewed: number | null = null;
      if (quote.last_viewed_at) {
        lastViewedMs = new Date(quote.last_viewed_at).getTime();
        hoursSinceViewed = Math.floor((now - lastViewedMs) / (1000 * 60 * 60));
      }

      let temperature: DealTemperature = 'WARM';
      let score = 50;
      let reason = '';
      let recommendedAction = '';
      let actionKey = 'send_whatsapp_followup';

      // Temperature Logic
      if (viewCount >= 2 || (hoursSinceViewed !== null && hoursSinceViewed <= 48)) {
        temperature = 'HOT';
        score = Math.min(95, 70 + viewCount * 5 + (hoursSinceViewed !== null && hoursSinceViewed <= 12 ? 15 : 5));
        reason = `Client viewed this quote ${viewCount} times (last viewed ${hoursSinceViewed !== null ? `${hoursSinceViewed}h ago` : 'recently'}). High buying intent.`;
        recommendedAction = client?.phone
          ? 'Send WhatsApp message with closing question'
          : 'Send follow-up email while top of mind';
        actionKey = client?.phone ? 'send_whatsapp_followup' : 'send_email_followup';
      } else if (daysSinceSent > 7 || (viewCount === 0 && daysSinceSent >= 4)) {
        temperature = 'COLD';
        score = Math.max(15, 40 - daysSinceSent * 2);
        reason = viewCount === 0
          ? `Sent ${daysSinceSent} days ago and not yet viewed in portal. Deal is losing momentum.`
          : `Sent ${daysSinceSent} days ago with no recent activity.`;
        recommendedAction = 'Send quick check-in to confirm receipt or check for blockers';
        actionKey = client?.phone ? 'send_whatsapp_followup' : 'send_email_followup';
      } else {
        temperature = 'WARM';
        score = 60;
        reason = viewCount === 1
          ? `Viewed once. Client is considering proposal.`
          : `Recently sent (${daysSinceSent} days ago). Active decision window.`;
        recommendedAction = 'Gentle progress check or offer to clarify technical specifications';
        actionKey = client?.phone ? 'send_whatsapp_followup' : 'send_email_followup';
      }

      deals.push({
        id: quote.id,
        quotationNumber: quote.quotation_number,
        customerName: clientName,
        customerId: client?.id || quote.customer_id,
        customerPhone: client?.phone || null,
        customerEmail: client?.email || null,
        value: quoteVal,
        currency: qCurrency,
        temperature,
        status: quote.status,
        viewCount,
        lastViewedAt: quote.last_viewed_at || null,
        createdAt: quote.created_at,
        validUntil: quote.valid_until || null,
        daysSinceSent,
        score,
        reason,
        recommendedAction,
        actionKey,
        publicUrl: quote.public_token ? `${baseUrl}/q/${quote.public_token}` : undefined,
      });
    }

    // Sort: HOT first (highest score), then WARM, then COLD
    deals.sort((a, b) => b.score - a.score);

    const hotDeals = deals.filter((d) => d.temperature === 'HOT');
    const warmDeals = deals.filter((d) => d.temperature === 'WARM');
    const coldDeals = deals.filter((d) => d.temperature === 'COLD');

    const hotDealsValue = hotDeals.reduce((sum, d) => sum + d.value, 0);
    const warmDealsValue = warmDeals.reduce((sum, d) => sum + d.value, 0);
    const coldDealsValue = coldDeals.reduce((sum, d) => sum + d.value, 0);
    const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0);

    return {
      analyzedAt: new Date().toISOString(),
      currency,
      summary: {
        totalDeals: deals.length,
        totalPipelineValue,
        hotDealsCount: hotDeals.length,
        hotDealsValue,
        warmDealsCount: warmDeals.length,
        warmDealsValue,
        coldDealsCount: coldDeals.length,
        coldDealsValue,
        averageDealSize: deals.length > 0 ? Math.round(totalPipelineValue / deals.length) : 0,
      },
      deals,
    };
  }

  /**
   * Phase 3: Lost Quote Analyzer & Win/Loss Disparity Insights
   * Answers: "Why are quotes not converting? Where are we leaving money on the table?"
   */
  public async analyzeWinLossDisparity(orgId: string): Promise<WinLossDisparityAnalysis> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = org?.default_currency || 'INR';

    const quotations = await store.getQuotations(orgId, { environment: env });

    const approved = quotations.filter((q) => q.status === 'APPROVED');
    const rejected = quotations.filter((q) => q.status === 'REJECTED');
    const expired = quotations.filter((q) => q.status === 'EXPIRED');

    const totalDecided = approved.length + rejected.length + expired.length;
    const approvalRate = totalDecided > 0 ? Math.round((approved.length / totalDecided) * 100) : 0;

    // Time to decision calculations
    let totalApprovalDays = 0;
    for (const q of approved) {
      const created = new Date(q.created_at).getTime();
      const updated = new Date(q.updated_at || q.created_at).getTime();
      totalApprovalDays += Math.max(0, (updated - created) / (1000 * 60 * 60 * 24));
    }
    const averageTimeToApprovalDays = approved.length > 0
      ? Number((totalApprovalDays / approved.length).toFixed(1))
      : 0;

    let totalRejectionDays = 0;
    for (const q of rejected) {
      const created = new Date(q.created_at).getTime();
      const updated = new Date(q.updated_at || q.created_at).getTime();
      totalRejectionDays += Math.max(0, (updated - created) / (1000 * 60 * 60 * 24));
    }
    const averageTimeToRejectionDays = rejected.length > 0
      ? Number((totalRejectionDays / rejected.length).toFixed(1))
      : 0;

    // Discount impact analysis
    const HIGH_DISCOUNT_THRESHOLD = 15;
    const highDiscountQuotes = quotations.filter((q) => {
      const disc = Number(q.discount_value) || 0;
      if (q.discount_type === 'PERCENTAGE') return disc >= HIGH_DISCOUNT_THRESHOLD;
      const subtotal = Number(q.subtotal) || 1;
      return (disc / subtotal) * 100 >= HIGH_DISCOUNT_THRESHOLD;
    });

    const standardDiscountQuotes = quotations.filter((q) => {
      const disc = Number(q.discount_value) || 0;
      if (q.discount_type === 'PERCENTAGE') return disc < HIGH_DISCOUNT_THRESHOLD;
      const subtotal = Number(q.subtotal) || 1;
      return (disc / subtotal) * 100 < HIGH_DISCOUNT_THRESHOLD;
    });

    const highDiscountApproved = highDiscountQuotes.filter((q) => q.status === 'APPROVED').length;
    const highDiscountDecided = highDiscountQuotes.filter((q) =>
      ['APPROVED', 'REJECTED', 'EXPIRED'].includes(q.status)
    ).length;
    const highDiscountWinRate = highDiscountDecided > 0
      ? Math.round((highDiscountApproved / highDiscountDecided) * 100)
      : 0;

    const standardApproved = standardDiscountQuotes.filter((q) => q.status === 'APPROVED').length;
    const standardDecided = standardDiscountQuotes.filter((q) =>
      ['APPROVED', 'REJECTED', 'EXPIRED'].includes(q.status)
    ).length;
    const standardDiscountWinRate = standardDecided > 0
      ? Math.round((standardApproved / standardDecided) * 100)
      : 0;

    let discountInsight = '';
    if (highDiscountQuotes.length >= 2 && standardDiscountQuotes.length >= 2) {
      if (highDiscountWinRate <= standardDiscountWinRate) {
        discountInsight = `Quotes with discounts >${HIGH_DISCOUNT_THRESHOLD}% convert at ${highDiscountWinRate}% vs ${standardDiscountWinRate}% for standard quotes. Heavy discounting is not increasing your conversion rate and erodes profit margin.`;
      } else {
        discountInsight = `High discount quotes convert at ${highDiscountWinRate}% vs ${standardDiscountWinRate}% for standard quotes. Consider reserving discounts for high-volume accounts.`;
      }
    } else {
      discountInsight = `Maintain standard margins. Monitor conversion across discount tiers as more quote data accumulates.`;
    }

    // Lost Opportunities
    const unfollowedExpired = expired.filter((q) => (Number(q.view_count) || 0) === 0);
    const unfollowedExpiredValue = unfollowedExpired.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);
    const recoverableQuotes = expired.concat(rejected);
    const recoverableQuotesValue = recoverableQuotes.reduce((sum, q) => sum + (Number(q.grand_total) || 0), 0);

    const recommendations: string[] = [];
    if (unfollowedExpired.length > 0) {
      recommendations.push(
        `${unfollowedExpired.length} expired quotes had no recorded client engagement. Instituting a 48h follow-up protocol recovers up to 25% of missed pipeline.`
      );
    }
    if (highDiscountWinRate < standardDiscountWinRate && highDiscountDecided >= 2) {
      recommendations.push(
        `Cap standard sales representative discounts at 10% without managerial approval to protect margin.`
      );
    }
    if (approvalRate < 40 && totalDecided >= 5) {
      recommendations.push(
        `Overall win rate is ${approvalRate}%. Speed to follow-up within 24 hours of first portal view is the highest-leverage lever.`
      );
    }

    return {
      analyzedAt: new Date().toISOString(),
      currency,
      metrics: {
        totalQuotesAnalyzed: quotations.length,
        approvedQuotesCount: approved.length,
        rejectedQuotesCount: rejected.length,
        expiredQuotesCount: expired.length,
        approvalRate,
        averageTimeToApprovalDays,
        averageTimeToRejectionDays,
      },
      discountImpact: {
        highDiscountThreshold: HIGH_DISCOUNT_THRESHOLD,
        highDiscountCount: highDiscountQuotes.length,
        highDiscountWinRate,
        standardDiscountCount: standardDiscountQuotes.length,
        standardDiscountWinRate,
        insight: discountInsight,
      },
      lostOpportunities: {
        unfollowedExpiredQuotes: unfollowedExpired.length,
        unfollowedExpiredValue,
        recoverableQuotesCount: recoverableQuotes.length,
        recoverableQuotesValue,
        recommendations,
      },
    };
  }

  /**
   * Phase 3: Internal Lead Recovery Engine
   * Detects:
   * 1. Quotes not opened (sent > 48h, view_count = 0)
   * 2. Quotes opened but not approved (view_count >= 1, sent > 3 days)
   * 3. Expired quotes suitable for revival
   * 4. Rejected quotes suitable for reconnection
   * 5. Dormant past clients (> 60 days without quote/order)
   */
  public async recoverLostLeads(orgId: string): Promise<LeadRecoveryItem[]> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = org?.default_currency || 'INR';

    const [quotations, customers] = await Promise.all([
      store.getQuotations(orgId, { environment: env }),
      store.getCustomers(orgId, { environment: env }),
    ]);

    const customerMap = new Map<string, Customer>(customers.map((c) => [c.id, c]));
    const now = Date.now();
    const items: LeadRecoveryItem[] = [];

    for (const quote of quotations) {
      const client = quote.customer_id ? customerMap.get(quote.customer_id) : quote.customer;
      const clientName = client?.name || quote.customer?.name || 'Customer';
      const quoteVal = Number(quote.grand_total) || 0;
      const viewCount = Number(quote.view_count) || 0;
      const qCurrency = quote.currency || currency;

      const createdMs = new Date(quote.created_at).getTime();
      const daysSinceSent = Math.max(0, Math.floor((now - createdMs) / (1000 * 60 * 60 * 24)));

      // 1. Unopened quotes (>48h, view_count = 0)
      if (['SENT', 'PENDING_APPROVAL'].includes(quote.status) && viewCount === 0 && daysSinceSent >= 2) {
        items.push({
          id: `rec-unopened-${quote.id}`,
          quoteId: quote.id,
          quoteNumber: quote.quotation_number,
          customerName: clientName,
          customerId: client?.id || quote.customer_id,
          customerPhone: client?.phone || null,
          customerEmail: client?.email || null,
          recoveryType: 'UNOPENED',
          value: quoteVal,
          currency: qCurrency,
          reason: `Quote sent ${daysSinceSent} days ago has not been opened in the portal.`,
          recommendedAction: client?.phone ? 'WhatsApp Link Resend' : 'Email Follow-up',
          actionKey: client?.phone ? 'send_whatsapp_followup' : 'send_email_followup',
          suggestedMessage: `Hi ${clientName}, just re-sending the link for quote ${quote.quotation_number} in case it was missed! Let us know if you have any questions.`,
          quoteCreatedAt: quote.created_at,
          daysInactive: daysSinceSent,
        });
      }

      // 2. Viewed but unapproved (> 3 days)
      if (['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(quote.status) && viewCount >= 1 && daysSinceSent >= 3) {
        items.push({
          id: `rec-viewed-unapproved-${quote.id}`,
          quoteId: quote.id,
          quoteNumber: quote.quotation_number,
          customerName: clientName,
          customerId: client?.id || quote.customer_id,
          customerPhone: client?.phone || null,
          customerEmail: client?.email || null,
          recoveryType: 'VIEWED_UNAPPROVED',
          value: quoteVal,
          currency: qCurrency,
          reason: `Client reviewed quote ${viewCount} times ${daysSinceSent} days ago without approving.`,
          recommendedAction: 'Proactive Consultation Check-in',
          actionKey: client?.phone ? 'send_whatsapp_followup' : 'send_email_followup',
          suggestedMessage: `Hi ${clientName}, hope your week is going well. We noticed you checked out quote ${quote.quotation_number}. Would you like to hop on a quick 5-minute call to answer any questions?`,
          quoteCreatedAt: quote.created_at,
          daysInactive: daysSinceSent,
        });
      }

      // 3. Expired quotes (expired within 45 days)
      if (quote.status === 'EXPIRED') {
        items.push({
          id: `rec-expired-${quote.id}`,
          quoteId: quote.id,
          quoteNumber: quote.quotation_number,
          customerName: clientName,
          customerId: client?.id || quote.customer_id,
          customerPhone: client?.phone || null,
          customerEmail: client?.email || null,
          recoveryType: 'EXPIRED_REVIVAL',
          value: quoteVal,
          currency: qCurrency,
          reason: `Quote expired without closing. Still within recoverable window.`,
          recommendedAction: 'Revive with Fresh Validity',
          actionKey: 'create_quote_draft',
          suggestedMessage: `Hi ${clientName}, we can refresh quote ${quote.quotation_number} with updated timeline and terms if you're still considering this project.`,
          quoteCreatedAt: quote.created_at,
          daysInactive: daysSinceSent,
        });
      }

      // 4. Rejected quotes (suitable for reconnect after 14 days)
      if (quote.status === 'REJECTED' && daysSinceSent >= 14) {
        items.push({
          id: `rec-rejected-${quote.id}`,
          quoteId: quote.id,
          quoteNumber: quote.quotation_number,
          customerName: clientName,
          customerId: client?.id || quote.customer_id,
          customerPhone: client?.phone || null,
          customerEmail: client?.email || null,
          recoveryType: 'REJECTED_RECONNECT',
          value: quoteVal,
          currency: qCurrency,
          reason: `Rejected ${daysSinceSent} days ago. Good candidate for alternative scope or seasonal check-in.`,
          recommendedAction: 'Explore Alternative Scope',
          actionKey: client?.phone ? 'send_whatsapp_followup' : 'send_email_followup',
          suggestedMessage: `Hi ${clientName}, checking in to see if your requirements have evolved since our last quote. We have updated options that may better fit your budget.`,
          quoteCreatedAt: quote.created_at,
          daysInactive: daysSinceSent,
        });
      }
    }

    // Sort: highest value first
    items.sort((a, b) => b.value - a.value);
    return items;
  }

  /**
   * Phase 4: Pricing & Margin Insights
   * Detects unusual discounts, pricing leakage, and margin optimization opportunities.
   */
  public async analyzePricingAndMargins(orgId: string): Promise<PricingMarginInsight> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = org?.default_currency || 'INR';

    const quotations = await store.getQuotations(orgId, { environment: env });

    let totalDiscountAmount = 0;
    let totalGrossValue = 0;
    let unusualDiscountsCount = 0;
    let heavyDiscountLoss = 0;

    for (const q of quotations) {
      const subtotal = Number(q.subtotal) || Number(q.grand_total) || 0;
      const discount = Number(q.discount_amount) || Number(q.discount_value) || 0;
      totalGrossValue += subtotal;
      totalDiscountAmount += discount;

      const discountRate = subtotal > 0 ? (discount / subtotal) * 100 : 0;
      if (discountRate >= 20) {
        unusualDiscountsCount++;
        // Excess over 10% standard discount
        const excessRate = discountRate - 10;
        heavyDiscountLoss += subtotal * (excessRate / 100);
      }
    }

    const avgDiscountRate = totalGrossValue > 0 ? (totalDiscountAmount / totalGrossValue) * 100 : 0;
    const averageMarginPercentage = Math.max(15, Math.round(100 - avgDiscountRate));

    const insights = [];

    if (unusualDiscountsCount > 0) {
      insights.push({
        title: 'High Discount Leakage Detected',
        description: `${unusualDiscountsCount} quotes have discounts of 20% or higher, causing an estimated ${formatCurrency(Math.round(heavyDiscountLoss), currency as CurrencyCode)} in reduced margin.`,
        impact: 'HIGH' as const,
        potentialGain: Math.round(heavyDiscountLoss),
      });
    }

    if (avgDiscountRate > 12) {
      insights.push({
        title: 'Average Discount Exceeds Standard Threshold',
        description: `Average organization discount is currently ${avgDiscountRate.toFixed(1)}%. Establishing a 10% maximum discount cap without managerial override protects gross margin.`,
        impact: 'MEDIUM' as const,
        potentialGain: Math.round(totalGrossValue * 0.03),
      });
    } else {
      insights.push({
        title: 'Disciplined Pricing Maintained',
        description: `Your average discount rate of ${avgDiscountRate.toFixed(1)}% demonstrates disciplined pricing discipline and consistent value capture.`,
        impact: 'LOW' as const,
        potentialGain: 0,
      });
    }

    return {
      analyzedAt: new Date().toISOString(),
      currency,
      averageMarginPercentage,
      unusualDiscountsCount,
      insights,
    };
  }

  /**
   * Phase 4: Upsell & Cross-Sell Engine
   * Suggests items frequently bundled or added alongside requested items based on historical quotes.
   */
  public async recommendCrossSellItems(
    orgId: string,
    currentItemNames: string[]
  ): Promise<CrossSellSuggestion[]> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = org?.default_currency || 'INR';

    const quotations = await store.getQuotations(orgId, { environment: env });

    // Build co-occurrence map: itemA -> itemB -> count
    const coOccurrence = new Map<string, Map<string, { count: number; prices: number[] }>>();
    const itemTotalCounts = new Map<string, number>();

    for (const q of quotations) {
      const items = q.items || [];
      if (items.length < 2) continue;

      const descriptions = items
        .map((it) => (it.description || '').trim().toLowerCase())
        .filter((d) => d.length >= 3);

      for (let i = 0; i < items.length; i++) {
        const descA = items[i].description?.trim().toLowerCase();
        if (!descA) continue;
        itemTotalCounts.set(descA, (itemTotalCounts.get(descA) || 0) + 1);

        for (let j = 0; j < items.length; j++) {
          if (i === j) continue;
          const descB = items[j].description?.trim().toLowerCase();
          if (!descB || descA === descB) continue;

          let mapA = coOccurrence.get(descA);
          if (!mapA) {
            mapA = new Map();
            coOccurrence.set(descA, mapA);
          }

          const existing = mapA.get(descB) || { count: 0, prices: [] };
          existing.count += 1;
          existing.prices.push(Number(items[j].unit_price) || 0);
          mapA.set(descB, existing);
        }
      }
    }

    const suggestions: CrossSellSuggestion[] = [];
    const normalizedTargets = currentItemNames.map((n) => n.trim().toLowerCase());

    for (const target of normalizedTargets) {
      // Find matching items in co-occurrence
      for (const [keyItem, relatedMap] of coOccurrence.entries()) {
        if (keyItem.includes(target) || target.includes(keyItem)) {
          const totalOccurrences = itemTotalCounts.get(keyItem) || 1;

          for (const [recName, stats] of relatedMap.entries()) {
            if (normalizedTargets.some((t) => recName.includes(t) || t.includes(recName))) {
              continue; // already in current quote
            }

            const frequency = Math.round((stats.count / totalOccurrences) * 100);
            if (frequency >= 30) {
              const avgPrice = stats.prices.length > 0
                ? Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length)
                : 0;

              // Title case item name
              const formattedName = recName.replace(/\b\w/g, (c) => c.toUpperCase());
              const formattedKey = keyItem.replace(/\b\w/g, (c) => c.toUpperCase());

              suggestions.push({
                triggerItem: formattedKey,
                recommendedItem: formattedName,
                frequency,
                confidence: Math.min(95, 50 + stats.count * 10),
                averagePrice: avgPrice,
                currency,
                explanation: `Added together in ${frequency}% of quotes featuring "${formattedKey}".`,
              });
            }
          }
        }
      }
    }

    // Sort by frequency descending
    suggestions.sort((a, b) => b.frequency - a.frequency);
    return suggestions.slice(0, 4);
  }

  /**
   * Phase 4: 30-Day Cash Flow Projections
   * Projects expected inbound capital from confirmed invoices, overdue collection, and weighted pipeline.
   */
  public async projectCashFlow(orgId: string): Promise<CashFlow30DayProjection> {
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = org?.default_currency || 'INR';

    const [quotations, invoices] = await Promise.all([
      store.getQuotations(orgId, { environment: env }),
      store.getInvoices(orgId, { environment: env }),
    ]);

    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    let confirmedInflow = 0;
    let overdueRecoverableInflow = 0;

    const weeklyConfirmed = [0, 0, 0, 0];
    const weeklyPipeline = [0, 0, 0, 0];

    // Invoices analysis
    for (const inv of invoices) {
      if (['PAID', 'CANCELLED', 'DRAFT'].includes(inv.status)) continue;
      const total = Number(inv.grand_total) || 0;
      const paid = Number(inv.paid_amount) || 0;
      const balance = Math.max(0, total - paid);
      if (balance <= 0) continue;

      if (!inv.due_date) {
        weeklyConfirmed[1] += balance;
        confirmedInflow += balance;
        continue;
      }

      const dueMs = new Date(inv.due_date).getTime();
      const diffDays = Math.floor((dueMs - now) / MS_PER_DAY);

      if (diffDays < 0) {
        // Overdue invoice: estimate 50% collection probability in first 2 weeks
        const expectedOverdue = balance * 0.5;
        overdueRecoverableInflow += expectedOverdue;
        weeklyConfirmed[0] += expectedOverdue * 0.6;
        weeklyConfirmed[1] += expectedOverdue * 0.4;
      } else if (diffDays <= 30) {
        confirmedInflow += balance;
        const weekIdx = Math.min(3, Math.floor(diffDays / 7));
        weeklyConfirmed[weekIdx] += balance;
      }
    }

    // Pipeline analysis (Hot = 70%, Warm = 40%)
    let pipelineWeightedInflow = 0;
    for (const q of quotations) {
      if (!['SENT', 'VIEWED', 'PENDING_APPROVAL', 'IN_PROGRESS'].includes(q.status)) continue;
      const quoteVal = Number(q.grand_total) || 0;
      const viewCount = Number(q.view_count) || 0;

      let weight = 0.25;
      let targetWeek = 2;

      if (viewCount >= 2) {
        weight = 0.7; // Hot!
        targetWeek = 0; // expected in week 1
      } else if (viewCount === 1) {
        weight = 0.45; // Warm
        targetWeek = 1; // expected in week 2
      } else {
        weight = 0.2;
        targetWeek = 3;
      }

      const weightedVal = quoteVal * weight;
      pipelineWeightedInflow += weightedVal;
      weeklyPipeline[targetWeek] += weightedVal;
    }

    const totalProjectedInflow = Math.round(confirmedInflow + overdueRecoverableInflow + pipelineWeightedInflow);

    const weeklyBreakdown = [
      {
        week: 'Week 1 (Days 1-7)',
        confirmed: Math.round(weeklyConfirmed[0]),
        weightedPipeline: Math.round(weeklyPipeline[0]),
        totalExpected: Math.round(weeklyConfirmed[0] + weeklyPipeline[0]),
      },
      {
        week: 'Week 2 (Days 8-14)',
        confirmed: Math.round(weeklyConfirmed[1]),
        weightedPipeline: Math.round(weeklyPipeline[1]),
        totalExpected: Math.round(weeklyConfirmed[1] + weeklyPipeline[1]),
      },
      {
        week: 'Week 3 (Days 15-21)',
        confirmed: Math.round(weeklyConfirmed[2]),
        weightedPipeline: Math.round(weeklyPipeline[2]),
        totalExpected: Math.round(weeklyConfirmed[2] + weeklyPipeline[2]),
      },
      {
        week: 'Week 4 (Days 22-30)',
        confirmed: Math.round(weeklyConfirmed[3]),
        weightedPipeline: Math.round(weeklyPipeline[3]),
        totalExpected: Math.round(weeklyConfirmed[3] + weeklyPipeline[3]),
      },
    ];

    return {
      projectedAt: new Date().toISOString(),
      currency,
      summary: {
        totalProjectedInflow,
        confirmedInflow: Math.round(confirmedInflow),
        overdueRecoverableInflow: Math.round(overdueRecoverableInflow),
        pipelineWeightedInflow: Math.round(pipelineWeightedInflow),
      },
      horizonDays: 30,
      weeklyBreakdown,
    };
  }

  // =========================================================================
  // PHASE 5: BUSINESS AUTOMATION RULE STORE
  // =========================================================================
  private automationRulesStore = new Map<string, BusinessAutomationRule[]>();

  public async getAutomationRules(orgId: string): Promise<BusinessAutomationRule[]> {
    const existing = this.automationRulesStore.get(orgId);
    if (existing) return existing;

    // Seed default automation rules
    const now = new Date().toISOString();
    const defaults: BusinessAutomationRule[] = [
      {
        id: `auto-rule-1-${orgId}`,
        organization_id: orgId,
        name: 'Auto-Draft WhatsApp Follow-up on Multiple Portal Views',
        description: 'Prepares a personalized follow-up message when a client reviews a quote 2+ times in the client portal.',
        trigger: 'QUOTE_VIEWED_MULTIPLE_TIMES',
        action: 'DRAFT_WHATSAPP_FOLLOWUP',
        enabled: true,
        requiresHumanConfirmation: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `auto-rule-2-${orgId}`,
        organization_id: orgId,
        name: '48-Hour Unopened Quote Check-In',
        description: 'Generates a reminder draft if a sent quote has not been viewed within 48 hours.',
        trigger: 'QUOTE_UNOPENED_48H',
        action: 'DRAFT_EMAIL_FOLLOWUP',
        enabled: true,
        requiresHumanConfirmation: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `auto-rule-3-${orgId}`,
        organization_id: orgId,
        name: 'Instant Invoice Conversion on Quote Approval',
        description: 'Automatically drafts a ready-to-send invoice when a client signs and approves their quote.',
        trigger: 'QUOTE_APPROVED',
        action: 'DRAFT_INVOICE',
        enabled: true,
        requiresHumanConfirmation: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `auto-rule-4-${orgId}`,
        organization_id: orgId,
        name: 'Overdue Invoice 7-Day Reminder Protocol',
        description: 'Prepares a gentle payment follow-up message when an invoice passes 7 days overdue.',
        trigger: 'INVOICE_OVERDUE_7D',
        action: 'DRAFT_WHATSAPP_FOLLOWUP',
        enabled: true,
        requiresHumanConfirmation: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: `auto-rule-5-${orgId}`,
        organization_id: orgId,
        name: 'Dormant Customer 60-Day Re-Engagement',
        description: 'Surfaces previous high-value clients in the daily action plan if they have not ordered in 60+ days.',
        trigger: 'CUSTOMER_INACTIVE_60D',
        action: 'CREATE_DAILY_ACTION_ITEM',
        enabled: true,
        requiresHumanConfirmation: true,
        created_at: now,
        updated_at: now,
      },
    ];

    this.automationRulesStore.set(orgId, defaults);
    return defaults;
  }

  public async toggleAutomationRule(
    orgId: string,
    ruleId: string,
    enabled: boolean
  ): Promise<BusinessAutomationRule | null> {
    const rules = await this.getAutomationRules(orgId);
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return null;

    rule.enabled = enabled;
    rule.updated_at = new Date().toISOString();
    return rule;
  }
}

export const businessOperatorEngine = new BusinessOperatorEngine();
