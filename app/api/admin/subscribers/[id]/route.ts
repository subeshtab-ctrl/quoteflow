import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  isAuthorizedDeveloperAdmin,
  getAdminActorContext,
  hasAdminPermission,
  getAdminOpsStore,
  saveAdminOpsStore,
  recordAdminSecurityEvent,
} from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { getBillingDetailsForCountry } from '@/lib/billing/country-rules';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: businessId } = await params;
    const ops = getAdminOpsStore();

    const [org, sub, payments, access, quotes, invoices, customers, tickets] = await Promise.all([
      store.getOrganization(businessId),
      store.getBusinessSubscription(businessId),
      store.getSubscriptionPayments(businessId),
      subscriptionService.getBusinessSubscriptionAccess(businessId),
      store.getQuotations(businessId),
      store.getInvoices(businessId),
      store.getCustomers(businessId),
      store.getSupportTickets({ businessId }),
    ]);

    const now = Date.now();
    const countWithinDays = (items: Array<{ created_at: string }>, days: number) =>
      items.filter((i) => now - new Date(i.created_at).getTime() <= days * 86400000).length;

    const approvedQuotes = quotes.filter((q) => (q.status as string) === 'APPROVED' || (q.status as string) === 'COMPLETED' || (q.status as string) === 'CONVERTED');
    const sentQuotes = quotes.filter((q) => q.status !== 'DRAFT');
    const paidInvoices = invoices.filter((inv) => inv.is_paid || (inv.status as string) === 'PAID');
    const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
    const totalCollectedAmount = paidInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);

    let lastActiveAt = org?.updated_at || sub?.updated_at || sub?.created_at || new Date().toISOString();
    for (const q of quotes) {
      if (new Date(q.created_at).getTime() > new Date(lastActiveAt).getTime()) lastActiveAt = q.created_at;
    }
    for (const inv of invoices) {
      if (new Date(inv.created_at).getTime() > new Date(lastActiveAt).getTime()) lastActiveAt = inv.created_at;
    }

    const buildPeriodUsage = (days?: number) => ({
      quotesCount: days ? countWithinDays(quotes, days) : quotes.length,
      invoicesCount: days ? countWithinDays(invoices, days) : invoices.length,
      customersCount: days ? countWithinDays(customers, days) : customers.length,
      itemsCount: quotes.length * 2,
      paymentsCount: days ? countWithinDays(paidInvoices, days) : paidInvoices.length,
    });

    const usage = {
      customersCount: customers.length,
      quotesCount: quotes.length,
      sentQuotesCount: sentQuotes.length,
      approvedQuotesCount: approvedQuotes.length,
      invoicesCount: invoices.length,
      paidInvoicesCount: paidInvoices.length,
      totalInvoicedAmount,
      totalCollectedAmount,
      staffCount: Array.isArray((org as any)?.members) ? (org as any).members.length : 1,
      branchesCount: 1,
      aiRequestsCount: quotes.length * 2,
      pdfsGeneratedCount: quotes.length + invoices.length,
      lastActiveAt,
      today: buildPeriodUsage(1),
      days7: buildPeriodUsage(7),
      days30: buildPeriodUsage(30),
      days90: buildPeriodUsage(90),
      allTime: buildPeriodUsage(),
      byPeriod: {
        today: buildPeriodUsage(1),
        days7: buildPeriodUsage(7),
        days30: buildPeriodUsage(30),
        days90: buildPeriodUsage(90),
        allTime: buildPeriodUsage(),
      },
    };

    // Build Customer Journey Timeline
    const sortedQuotes = [...quotes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const sortedInvoices = [...invoices].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const sortedCustomers = [...customers].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const firstSentQuote = sortedQuotes.find((q) => q.status !== 'DRAFT');
    const firstApprovedQuote = sortedQuotes.find((q) => (q.status as string) === 'APPROVED' || (q.status as string) === 'COMPLETED' || (q.status as string) === 'CONVERTED');
    const firstPaidInvoice = sortedInvoices.find((i) => i.is_paid || (i.status as string) === 'PAID');

    const customerJourney = [
      {
        step: 'Account Created',
        completed: true,
        timestamp: org?.created_at || sub?.created_at || null,
        detail: `${org?.name || 'Business'} registered on QuoteFlow`,
      },
      {
        step: 'Business Profile Setup',
        completed: Boolean(org?.name && (org?.phone || org?.address_line1 || (org as any)?.address || org?.gst_vat_number)),
        timestamp: org?.updated_at || org?.created_at || null,
        detail: org?.country ? `${org.country} (${org.default_currency || 'INR'})` : 'Profile configured',
      },
      {
        step: 'First Customer Added',
        completed: sortedCustomers.length > 0,
        timestamp: sortedCustomers[0]?.created_at || null,
        detail: sortedCustomers[0] ? `Added ${sortedCustomers[0].name}` : 'No customers added yet',
      },
      {
        step: 'First Quotation Created',
        completed: sortedQuotes.length > 0,
        timestamp: sortedQuotes[0]?.created_at || null,
        detail: sortedQuotes[0] ? `Created ${sortedQuotes[0].quotation_number}` : 'No quotations created yet',
      },
      {
        step: 'First Quotation Sent',
        completed: Boolean(firstSentQuote),
        timestamp: firstSentQuote?.created_at || null,
        detail: firstSentQuote ? `Sent ${firstSentQuote.quotation_number}` : 'No quotation sent yet',
      },
      {
        step: 'First Quotation Approved',
        completed: Boolean(firstApprovedQuote),
        timestamp: firstApprovedQuote?.approved_at || firstApprovedQuote?.updated_at || null,
        detail: firstApprovedQuote ? `Approved ${firstApprovedQuote.quotation_number}` : 'Pending customer approval',
      },
      {
        step: 'First Invoice Generated',
        completed: sortedInvoices.length > 0,
        timestamp: sortedInvoices[0]?.created_at || null,
        detail: sortedInvoices[0] ? `Generated ${sortedInvoices[0].invoice_number}` : 'No invoices generated yet',
      },
      {
        step: 'First Payment Recorded',
        completed: Boolean(firstPaidInvoice),
        timestamp: firstPaidInvoice?.paid_at || firstPaidInvoice?.updated_at || null,
        detail: firstPaidInvoice ? `Paid ${firstPaidInvoice.invoice_number}` : 'No invoice payments recorded yet',
      },
      {
        step: 'Subscription Activated (QuoteFlow Pro)',
        completed: sub?.status === 'active' || Boolean(sub?.is_trial_prepaid),
        timestamp: sub?.last_payment_at || (sub?.status === 'active' ? sub?.updated_at : null) || null,
        detail:
          sub?.status === 'active'
            ? `Active Pro Plan (${sub.last_payment_id || 'Verified'})`
            : 'Currently on Free Trial',
      },
    ];

    // Subscription Timeline
    const subscriptionTimeline: Array<{ title: string; timestamp: string; detail: string; type: string }> = [];
    if (sub?.trial_start_at) {
      subscriptionTimeline.push({
        title: '14-Day Free Trial Started',
        timestamp: sub.trial_start_at,
        detail: `Trial valid until ${sub.trial_end_at ? new Date(sub.trial_end_at).toLocaleDateString() : 'N/A'}`,
        type: 'trial',
      });
    }
    for (const p of payments) {
      subscriptionTimeline.push({
        title: p.status === 'captured' ? 'Subscription Payment Captured' : `Payment ${p.status.toUpperCase()}`,
        timestamp: p.paid_at || p.created_at,
        detail: `₹${((p.amount || 0) / 100).toFixed(0)} via ${p.payment_method || 'Razorpay'} (${p.razorpay_payment_id || p.id})`,
        type: p.status === 'captured' ? 'payment_success' : 'payment_failed',
      });
    }
    if ((sub as any)?.admin_offer) {
      const off = (sub as any).admin_offer;
      subscriptionTimeline.push({
        title: 'Promotional Offer Applied',
        timestamp: off.applied_at || sub?.updated_at || new Date().toISOString(),
        detail: `${off.description} — Reason: ${off.reason}`,
        type: 'promo',
      });
    }
    if (sub?.cancelled_at) {
      subscriptionTimeline.push({
        title: 'Subscription Cancelled',
        timestamp: sub.cancelled_at,
        detail: sub.cancellation_reason || 'Cancelled',
        type: 'cancelled',
      });
    }
    subscriptionTimeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const rawSuspension = ops.suspendedBusinesses[businessId];
    const suspension = rawSuspension
      ? { ...rawSuspension, active: rawSuspension.status !== 'active', type: rawSuspension.status }
      : {
          orgId: businessId,
          status: 'active',
          active: false,
          type: 'none',
          reason: '',
          suspendedBy: '',
          suspendedAt: '',
        };
    const adminNotes = ops.businessNotes[businessId] || [];
    const securityEvents = ops.securityEvents.filter(
      (e) => e.targetOrgId === businessId || (org?.email && e.actorEmail.toLowerCase() === org.email.toLowerCase())
    );

    // Mask sensitive fields by default in overview
    const sanitizedOrg = org
      ? {
          ...org,
          portal_pin: (org as any).portal_pin ? '•••• (PIN Configured)' : null,
        }
      : null;

    return NextResponse.json({
      success: true,
      business: sanitizedOrg,
      subscription: sub,
      payments,
      access,
      usage,
      customerJourney,
      subscriptionTimeline,
      suspension,
      adminNotes,
      supportTickets: tickets,
      securityEvents,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getAdminActorContext(req);
    if (!actor.authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: businessId } = await params;
    const body = await req.json();
    const ops = getAdminOpsStore();
    const now = new Date().toISOString();

    if (body.action === 'apply_offer') {
      const { allowed } = await hasAdminPermission(req, 'manage_promotions');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing manage_promotions permission' }, { status: 403 });
      }
      const result = await subscriptionService.applyOffer({
        businessId,
        offerType: body.offerType,
        value: Number(body.value),
        durationMonths: body.durationMonths ? Number(body.durationMonths) : 1,
        reason: body.reason || 'Developer Admin promotional incentive',
        adminUserId: actor.email,
        adminEmail: actor.email,
      });
      return NextResponse.json(result);
    }

    if (body.action === 'manual_activate_pro') {
      const { allowed } = await hasAdminPermission(req, 'manage_subscriptions');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing manage_subscriptions permission' }, { status: 403 });
      }
      const result = await subscriptionService.manuallyActivateProPlan({
        businessId,
        paymentReference: body.paymentReference,
        reason: body.reason,
        durationDays: body.durationDays ? Number(body.durationDays) : 30,
        adminUserId: actor.email,
        adminEmail: actor.email,
      });
      return NextResponse.json(result);
    }

    if (body.action === 'extend_trial') {
      const { allowed } = await hasAdminPermission(req, 'extend_trials');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing extend_trials permission' }, { status: 403 });
      }
      const days = Number(body.days) || 7;
      const reason = (body.reason || '').trim();
      if (!reason) {
        return NextResponse.json({ error: 'A reason is required to extend a business trial.' }, { status: 400 });
      }

      let sub = await store.getBusinessSubscription(businessId);
      if (!sub) {
        sub = await subscriptionService.startFreeTrial(businessId);
      }
      const prevEnd = sub.trial_end_at ? new Date(sub.trial_end_at).getTime() : Date.now();
      const baseTime = Math.max(Date.now(), prevEnd);
      const newEnd = new Date(baseTime + days * 86400000).toISOString();
      const beforeEnd = sub.trial_end_at;

      sub.trial_end_at = newEnd;
      if (sub.status === 'expired' || sub.status === 'past_due' || sub.status === 'grace_period') {
        sub.status = 'trialing';
      }
      sub.current_period_end = newEnd;
      sub.updated_at = now;
      await store.saveBusinessSubscription(sub);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'EXTEND_TRIAL',
        target_type: 'subscription',
        target_id: sub.id,
        metadata: {
          business_id: businessId,
          days_added: days,
          reason,
          before_trial_end: beforeEnd,
          after_trial_end: newEnd,
        },
        created_at: now,
      });

      await store.addNotification({
        organizationId: businessId,
        title: `Free Trial Extended (+${days} Days)`,
        message: `Your QuoteFlow Free Trial has been extended by ${days} days until ${new Date(newEnd).toLocaleDateString()}.`,
        type: 'APPROVED',
      });

      return NextResponse.json({
        success: true,
        message: `Trial extended by +${days} days until ${new Date(newEnd).toLocaleDateString()}.`,
        subscription: sub,
      });
    }

    if (body.action === 'cancel_subscription') {
      const { allowed } = await hasAdminPermission(req, 'manage_subscriptions');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing manage_subscriptions permission' }, { status: 403 });
      }
      const reason = (body.reason || '').trim();
      if (!reason) {
        return NextResponse.json({ error: 'Cancellation reason is required.' }, { status: 400 });
      }
      const atPeriodEnd = Boolean(body.atPeriodEnd);
      const sub = await store.getBusinessSubscription(businessId);
      if (!sub) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      const beforeStatus = sub.status;
      if (atPeriodEnd) {
        sub.cancel_at_period_end = true;
        sub.cancellation_reason = reason;
      } else {
        sub.status = 'cancelled';
        sub.cancelled_at = now;
        sub.cancellation_reason = reason;
      }
      sub.updated_at = now;
      await store.saveBusinessSubscription(sub);

      ops.cancellationReasons[businessId] = {
        orgId: businessId,
        reason,
        cancelledAt: now,
      };
      saveAdminOpsStore(ops);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: atPeriodEnd ? 'SCHEDULE_CANCELLATION' : 'CANCEL_SUBSCRIPTION',
        target_type: 'subscription',
        target_id: sub.id,
        metadata: { business_id: businessId, reason, before_status: beforeStatus, after_status: sub.status },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: atPeriodEnd
          ? 'Subscription scheduled for cancellation at period end.'
          : 'Subscription cancelled immediately.',
        subscription: sub,
      });
    }

    if (body.action === 'reactivate_subscription') {
      const { allowed } = await hasAdminPermission(req, 'manage_subscriptions');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing manage_subscriptions permission' }, { status: 403 });
      }
      const reason = (body.reason || 'Admin reactivation').trim();
      const sub = await store.getBusinessSubscription(businessId);
      if (!sub) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      const beforeStatus = sub.status;
      sub.status = 'active';
      sub.cancel_at_period_end = false;
      sub.cancelled_at = null;
      sub.updated_at = now;
      await store.saveBusinessSubscription(sub);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'REACTIVATE_SUBSCRIPTION',
        target_type: 'subscription',
        target_id: sub.id,
        metadata: { business_id: businessId, reason, before_status: beforeStatus, after_status: 'active' },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated successfully.',
        subscription: sub,
      });
    }

    if (body.action === 'change_plan') {
      const { allowed } = await hasAdminPermission(req, 'manage_subscriptions');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing manage_subscriptions permission' }, { status: 403 });
      }
      const targetPlan = body.planSlug || 'monthly_99';
      const reason = (body.reason || 'Admin plan update').trim();
      let sub = await store.getBusinessSubscription(businessId);
      if (!sub) {
        sub = await subscriptionService.startFreeTrial(businessId);
      }
      const beforePlan = sub.plan_id;
      if (targetPlan === 'free_trial') {
        sub.plan = DEFAULT_PLANS.FREE_TRIAL;
        sub.plan_id = DEFAULT_PLANS.FREE_TRIAL.id;
        sub.status = 'trialing';
        sub.amount = 0;
      } else {
        sub.plan = DEFAULT_PLANS.PRO_99;
        sub.plan_id = DEFAULT_PLANS.PRO_99.id;
        sub.status = 'active';
        sub.amount = 9900;
      }
      sub.updated_at = now;
      await store.saveBusinessSubscription(sub);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'CHANGE_PLAN',
        target_type: 'subscription',
        target_id: sub.id,
        metadata: { business_id: businessId, reason, before_plan: beforePlan, after_plan: sub.plan_id },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: `Plan updated to ${sub.plan?.name || targetPlan}.`,
        subscription: sub,
      });
    }

    if (body.action === 'change_country') {
      const { allowed } = await hasAdminPermission(req, 'manage_subscriptions');
      if (!allowed && !actor.authorized) {
        return NextResponse.json({ error: 'Forbidden: Missing manage_subscriptions permission' }, { status: 403 });
      }
      const newCountryCode = (body.countryCode || '').trim().toUpperCase();
      const reason = (body.reason || 'Admin manual country correction').trim();
      if (!newCountryCode || newCountryCode.length !== 2) {
        return NextResponse.json({ error: 'Valid 2-letter ISO country code required' }, { status: 400 });
      }

      const org = await store.getOrganization(businessId);
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const oldCountry = org.business_country || 'IN';
      const billingDetails = await getBillingDetailsForCountry(newCountryCode);

      await store.updateOrganization(businessId, {
        business_country: newCountryCode,
        business_country_name: billingDetails.countryName,
        billing_region: billingDetails.billingRegion,
        billing_currency: billingDetails.billingCurrency,
        payment_provider: billingDetails.paymentProvider,
        country_locked: true,
      });

      const sub = await store.getBusinessSubscription(businessId);
      if (sub) {
        sub.billing_country = newCountryCode;
        sub.billing_region = billingDetails.billingRegion;
        sub.billing_currency = billingDetails.billingCurrency;
        sub.currency = billingDetails.billingCurrency;
        sub.amount = billingDetails.planAmount;
        sub.provider = billingDetails.paymentProvider.toLowerCase() as any;
        sub.updated_at = now;
        await store.saveBusinessSubscription(sub);
      }

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'CHANGE_BUSINESS_COUNTRY',
        target_type: 'organization',
        target_id: businessId,
        metadata: {
          business_id: businessId,
          business_name: org.name,
          old_country: oldCountry,
          new_country: newCountryCode,
          new_country_name: billingDetails.countryName,
          billing_region: billingDetails.billingRegion,
          billing_currency: billingDetails.billingCurrency,
          reason,
        },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: `Business country changed from ${oldCountry} to ${newCountryCode} (${billingDetails.countryName}) successfully.`,
      });
    }

    if (body.action === 'suspend_account' || body.action === 'unsuspend_account') {
      const { allowed } = await hasAdminPermission(req, 'suspend_business');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing suspend_business permission' }, { status: 403 });
      }
      const reason = (body.reason || '').trim();
      if (!reason) {
        return NextResponse.json({ error: 'Reason is required for account suspension/restoration.' }, { status: 400 });
      }
      const isUnsuspend = body.action === 'unsuspend_account';
      const status = isUnsuspend
        ? 'active'
        : body.suspensionType === 'permanent'
        ? 'suspended_perm'
        : 'suspended_temp';

      ops.suspendedBusinesses[businessId] = {
        orgId: businessId,
        status,
        reason,
        suspendedBy: actor.email,
        suspendedAt: now,
      };
      saveAdminOpsStore(ops);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: isUnsuspend ? 'UNSUSPEND_BUSINESS' : 'SUSPEND_BUSINESS',
        target_type: 'business',
        target_id: businessId,
        metadata: { status, reason },
        created_at: now,
      });

      recordAdminSecurityEvent({
        eventType: isUnsuspend ? 'Business Account Restored' : 'Business Account Suspended',
        severity: isUnsuspend ? 'low' : 'high',
        actorEmail: actor.email,
        targetOrgId: businessId,
        details: `${isUnsuspend ? 'Restored' : `Suspended (${status})`} business ${businessId}. Reason: ${reason}`,
      });

      return NextResponse.json({
        success: true,
        message: isUnsuspend ? 'Business account restored to active.' : 'Business account suspended.',
        suspension: ops.suspendedBusinesses[businessId],
      });
    }

    if (body.action === 'add_note') {
      const noteText = (body.note || '').trim();
      if (!noteText) {
        return NextResponse.json({ error: 'Note content is required.' }, { status: 400 });
      }
      const note = {
        id: `note_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        orgId: businessId,
        note: noteText,
        authorEmail: actor.email,
        authorName: actor.name,
        createdAt: now,
      };
      ops.businessNotes[businessId] = [note, ...(ops.businessNotes[businessId] || [])];
      saveAdminOpsStore(ops);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'ADD_BUSINESS_NOTE',
        target_type: 'business',
        target_id: businessId,
        metadata: { note_id: note.id },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        adminNotes: ops.businessNotes[businessId],
      });
    }

    if (body.action === 'access_customer_data') {
      const { allowed } = await hasAdminPermission(req, 'access_customer_data');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing access_customer_data permission' }, { status: 403 });
      }
      const reason = (body.reason || '').trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'A valid support/troubleshooting reason is required before viewing customer records.' },
          { status: 400 }
        );
      }

      const [quotes, invoices, customers, org] = await Promise.all([
        store.getQuotations(businessId),
        store.getInvoices(businessId),
        store.getCustomers(businessId),
        store.getOrganization(businessId),
      ]);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'ACCESS_CUSTOMER_DATA',
        target_type: 'business',
        target_id: businessId,
        metadata: {
          reason,
          role: actor.role,
          records_viewed: { quotes: quotes.length, invoices: invoices.length, customers: customers.length },
        },
        created_at: now,
      });

      recordAdminSecurityEvent({
        eventType: 'Just-In-Time Customer Data Access',
        severity: 'medium',
        actorEmail: actor.email,
        targetOrgId: businessId,
        details: `Admin ${actor.email} accessed customer records for ${org?.name || businessId}. Reason: ${reason}`,
      });

      return NextResponse.json({
        success: true,
        customerData: {
          unmaskedEmail: org?.email || '',
          unmaskedPhone: org?.phone || '',
          gstin: org?.gstin || '',
          quotes: quotes.slice(0, 20).map((q) => ({
            id: q.id,
            quotation_number: q.quotation_number,
            status: q.status,
            grand_total: q.grand_total,
            currency: q.currency,
            created_at: q.created_at,
          })),
          invoices: invoices.slice(0, 20).map((inv) => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            status: inv.status,
            grand_total: inv.grand_total,
            currency: inv.currency,
            is_paid: inv.is_paid,
            created_at: inv.created_at,
          })),
          customers: customers.slice(0, 20).map((c) => ({
            id: c.id,
            name: c.name,
            company_name: c.company_name,
            email: c.email,
            phone: c.phone,
          })),
        },
      });
    }

    if (body.action === 'start_support_session') {
      const { allowed } = await hasAdminPermission(req, 'impersonate_read_only');
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden: Missing impersonate_read_only permission' }, { status: 403 });
      }
      const reason = (body.reason || '').trim();
      if (!reason) {
        return NextResponse.json(
          { error: 'Please provide a support ticket or troubleshooting reason to start View-as-Customer mode.' },
          { status: 400 }
        );
      }
      const org = await store.getOrganization(businessId);
      const session = {
        id: `supsess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        adminEmail: actor.email,
        adminName: actor.name,
        orgId: businessId,
        businessName: org?.name || businessId,
        reason,
        mode: 'read_only' as const,
        startedAt: now,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        active: true,
      };
      ops.supportSessions = [session, ...ops.supportSessions.slice(0, 49)];
      saveAdminOpsStore(ops);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'START_SUPPORT_IMPERSONATION',
        target_type: 'business',
        target_id: businessId,
        metadata: { session_id: session.id, reason, mode: 'read_only' },
        created_at: now,
      });

      recordAdminSecurityEvent({
        eventType: 'Support Read-Only Session Started',
        severity: 'medium',
        actorEmail: actor.email,
        targetOrgId: businessId,
        details: `Started Read-Only View-as-Customer session for ${org?.name || businessId}. Reason: ${reason}`,
      });

      return NextResponse.json({
        success: true,
        supportSession: session,
      });
    }

    if (body.action === 'end_support_session') {
      ops.supportSessions = ops.supportSessions.map((s) =>
        s.orgId === businessId && s.active ? { ...s, active: false, endedAt: now } : s
      );
      saveAdminOpsStore(ops);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'END_SUPPORT_IMPERSONATION',
        target_type: 'business',
        target_id: businessId,
        metadata: { ended_at: now },
        created_at: now,
      });

      return NextResponse.json({ success: true });
    }

    if (body.action === 'issue_refund') {
      const { allowed } = await hasAdminPermission(req, 'issue_refunds');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Forbidden: Only Billing Admin or Super Admin can issue refunds.' },
          { status: 403 }
        );
      }
      const reason = (body.reason || '').trim();
      const amount = Number(body.amount) || 149;
      if (!reason) {
        return NextResponse.json({ error: 'Refund reason is required.' }, { status: 400 });
      }
      const org = await store.getOrganization(businessId);
      const refund = {
        id: `rfnd_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
        paymentId: body.paymentId || `pay_${Date.now().toString(36)}`,
        orgId: businessId,
        businessName: org?.name || businessId,
        amount,
        currency: body.currency || 'INR',
        reason,
        status: 'processed' as const,
        processedBy: actor.email,
        createdAt: now,
      };
      ops.refunds = [refund, ...ops.refunds];
      saveAdminOpsStore(ops);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'ISSUE_REFUND',
        target_type: 'payment',
        target_id: refund.paymentId,
        metadata: { business_id: businessId, amount, reason, refund_id: refund.id },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: `Refund of ₹${amount} processed and logged.`,
        refund,
      });
    }

    if (body.action === 'send_whatsapp') {
      const message = (body.message || '').trim();
      if (!message) {
        return NextResponse.json({ error: 'WhatsApp message content is required.' }, { status: 400 });
      }

      const org = await store.getOrganization(businessId);
      const recipientPhone = (body.phone || (org as any)?.phone || (org as any)?.contact_phone || (org as any)?.billing_phone || '').replace(/[^\d]/g, '');

      if (!recipientPhone) {
        return NextResponse.json({ error: 'No valid phone number found for this business.' }, { status: 400 });
      }

      const { sendAdminOutreachWhatsAppMessage } = await import('@/lib/whatsapp/admin-whatsapp-service');
      const waRes = await sendAdminOutreachWhatsAppMessage({
        recipientPhone,
        businessName: org?.name || 'Valued Business',
        businessId,
        message,
        portalLink: body.portalLink || 'https://www.blendandbold.com/billing',
        useTemplate: Boolean(body.useTemplate),
      });

      if (!waRes.success) {
        return NextResponse.json({ error: waRes.error || 'Failed to dispatch WhatsApp message.' }, { status: 500 });
      }

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'SEND_WHATSAPP_OUTREACH',
        target_type: 'business',
        target_id: businessId,
        metadata: { business_id: businessId, recipientPhone, messageId: waRes.messageId, messagePreview: message.slice(0, 100) },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp message sent to business successfully.',
        messageId: waRes.messageId,
      });
    }

    if (body.action === 'send_trial_email_reminder') {
      const org = await store.getOrganization(businessId);
      const sub = await store.getBusinessSubscription(businessId);
      const access = await subscriptionService.getBusinessSubscriptionAccess(businessId);

      const recipientEmail = (body.email || org?.email || (org as any)?.contact_email || '').trim();
      if (!recipientEmail) {
        return NextResponse.json({ error: 'No recipient email found for this business.' }, { status: 400 });
      }

      const calculatedDays = access.daysRemainingInTrial ?? (sub?.trial_end_at ? Math.max(0, Math.ceil((new Date(sub.trial_end_at).getTime() - Date.now()) / 86400000)) : 7);
      const daysRemaining = typeof body.daysRemaining === 'number' ? Math.max(0, body.daysRemaining) : Math.max(0, calculatedDays);

      const trialEndDate = access.trialEndsAt || sub?.trial_end_at;
      const countryCode = (org?.business_country || (sub as any)?.billing_country || org?.country || 'IN').toUpperCase();
      const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

      const { generateTrialReminderEmail } = await import('@/lib/email/service');
      const emailPayload = generateTrialReminderEmail({
        companyName: org?.name || 'Valued Business',
        daysRemaining,
        trialEndDate: trialEndDate || undefined,
        trialEndsAt: trialEndDate || undefined,
        subscribeUrl: `${appUrl}/billing`,
        planPrice: isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly,
        currency: isIndia ? 'INR' : 'USD',
        country: countryCode,
        isIndia,
      });
      emailPayload.to = recipientEmail;

      const { sendEmail } = await import('@/lib/email/service');
      const sendRes = await sendEmail(emailPayload);
      if (!sendRes.success) {
        return NextResponse.json({ error: sendRes.error || 'Failed to dispatch trial reminder email.' }, { status: 500 });
      }

      const reminderKey = `reminder_${businessId}_trial_${daysRemaining}d`;
      await store.recordReminderSent(businessId, reminderKey);

      await store.addNotification({
        organizationId: businessId,
        title: `⏳ Free Trial Reminder — ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining`,
        message: `Your QuoteFlow free trial concludes in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Please renew your subscription to maintain uninterrupted access.`,
        type: 'EXPIRING',
      });

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'SEND_TRIAL_EMAIL_REMINDER',
        target_type: 'subscription',
        target_id: sub?.id || businessId,
        metadata: {
          business_id: businessId,
          recipientEmail,
          daysRemaining,
          trialEndDate,
        },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: `Trial reminder email (${daysRemaining} days remaining) dispatched to ${recipientEmail} successfully.`,
      });
    }

    if (body.action === 'send_trial_whatsapp_reminder') {
      const org = await store.getOrganization(businessId);
      const sub = await store.getBusinessSubscription(businessId);
      const access = await subscriptionService.getBusinessSubscriptionAccess(businessId);

      const calculatedDays = access.daysRemainingInTrial ?? (sub?.trial_end_at ? Math.max(0, Math.ceil((new Date(sub.trial_end_at).getTime() - Date.now()) / 86400000)) : 7);
      const daysRemaining = typeof body.daysRemaining === 'number' ? Math.max(0, body.daysRemaining) : Math.max(0, calculatedDays);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';
      const renewUrl = `${appUrl}/billing`;
      const companyName = org?.name || 'Valued Business';
      const countryCode = (org?.business_country || (sub as any)?.billing_country || org?.country || 'IN').toUpperCase();
      const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
      const priceText = isIndia ? '₹149 / month' : '$12 / month';

      const reminderText = `⏳ *QuoteFlow Free Trial Reminder*\n\nHi ${companyName},\n\nYour QuoteFlow free trial ends in *${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}*.\n\nPlease upgrade your account to keep creating AI quotations, sending professional invoices, and managing your clients without interruption.\n\n👉 *Renew Now:* ${renewUrl}\n\nSimple & Affordable Plan:\n• QuoteFlow Pro: ${priceText}\n\nNeed help? Contact support at hello@blendandbold.com.`;

      const recipientPhone = (body.phone || (org as any)?.phone || (org as any)?.whatsapp_number || (org as any)?.contact_phone || (org as any)?.billing_phone || '').replace(/[^\d]/g, '');

      let dispatchedViaApi = false;
      let waMessageId: string | undefined = undefined;

      if (recipientPhone) {
        try {
          const { sendAdminOutreachWhatsAppMessage } = await import('@/lib/whatsapp/admin-whatsapp-service');
          const waRes = await sendAdminOutreachWhatsAppMessage({
            recipientPhone,
            businessName: companyName,
            businessId,
            message: reminderText,
            portalLink: renewUrl,
          });
          if (waRes.success) {
            dispatchedViaApi = true;
            waMessageId = waRes.messageId;
          }
        } catch (e) {
          console.warn('[Trial WhatsApp Dispatch Notice]', e);
        }
      }

      const encodedMsg = encodeURIComponent(reminderText);
      const waLink = recipientPhone 
        ? `https://wa.me/${recipientPhone}?text=${encodedMsg}`
        : `https://wa.me/?text=${encodedMsg}`;

      const waReminderKey = `reminder_${businessId}_trial_wa_${daysRemaining}d`;
      await store.recordReminderSent(businessId, waReminderKey);

      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: actor.email,
        admin_email: actor.email,
        action: 'SEND_TRIAL_WHATSAPP_REMINDER',
        target_type: 'subscription',
        target_id: sub?.id || businessId,
        metadata: {
          business_id: businessId,
          recipientPhone,
          daysRemaining,
          dispatchedViaApi,
          waMessageId,
        },
        created_at: now,
      });

      return NextResponse.json({
        success: true,
        message: dispatchedViaApi
          ? `Trial reminder WhatsApp message dispatched to +${recipientPhone} successfully.`
          : recipientPhone 
            ? `WhatsApp link prepared for +${recipientPhone}. Opening WhatsApp chat...`
            : 'WhatsApp message template generated. Opening WhatsApp...',
        waLink,
        reminderText,
        recipientPhone,
        dispatchedViaApi,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: businessId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'AI / Synthetic test account cleanup';

    const result = await store.softDeleteTestBusiness(businessId, 'developer-admin', reason);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
