import {
  BusinessSubscription,
  SubscriptionPlan,
  SubscriptionPayment,
  SubscriptionEvent,
  SubscriptionAccess,
  Promotion,
  PromotionAssignment,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketAttachment,
  AdminAuditLog,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@/types/database';
import { razorpayService } from './razorpay';
import { store } from '@/lib/supabase/data-store';
import { sendEmail } from '@/lib/email/service';

export const DEFAULT_PLANS = {
  FREE_TRIAL: {
    id: 'e0000000-0000-0000-0000-000000000001',
    name: 'QuoteFlow Free Trial',
    slug: 'free_trial',
    description: 'Complete full-access 30-day free trial for new businesses.',
    amount: 0,
    currency: 'INR',
    billing_interval: 'month',
    billing_interval_count: 1,
    trial_days: 30,
    is_active: true,
    is_public: true,
    razorpay_plan_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SubscriptionPlan,
  PROMO_99: {
    id: 'e0000000-0000-0000-0000-000000000002',
    name: 'QuoteFlow Special Offer',
    slug: 'promo_99',
    description: 'Promotional subscription at ₹99/month for the first 3 successful billing cycles, transitioning automatically to ₹199/month thereafter.',
    amount: 9900, // ₹99
    currency: 'INR',
    billing_interval: 'month',
    billing_interval_count: 1,
    trial_days: 0,
    is_active: true,
    is_public: false,
    razorpay_plan_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SubscriptionPlan,
  STANDARD_199: {
    id: 'e0000000-0000-0000-0000-000000000003',
    name: 'QuoteFlow Standard',
    slug: 'monthly_199',
    description: 'Standard recurring monthly subscription with full access to estimates, quotes, invoicing, and client portal.',
    amount: 19900, // ₹199
    currency: 'INR',
    billing_interval: 'month',
    billing_interval_count: 1,
    trial_days: 0,
    is_active: true,
    is_public: true,
    razorpay_plan_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SubscriptionPlan,
};

export const DEFAULT_PROMOTION: Promotion = {
  id: 'f0000000-0000-0000-0000-000000000001',
  name: '₹99 for 3 Months Special Offer',
  code: 'WELCOME99',
  description: 'Exclusive introductory pricing: ₹99/month for 3 successful billing cycles, automatically transitioning to ₹199/month.',
  discount_type: 'FIXED',
  discount_value: 100,
  promotional_price: 9900,
  currency: 'INR',
  duration_months: 3,
  max_redemptions: null,
  redemption_count: 0,
  starts_at: null,
  ends_at: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export class SubscriptionService {
  /**
   * Start 30-day Free Trial for a business
   */
  public async startFreeTrial(businessId: string): Promise<BusinessSubscription> {
    const existing = await store.getBusinessSubscription(businessId);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const trialDays = 30;
    const trialEnd = new Date(now.getTime() + trialDays * 86400000);

    const subscription: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: businessId,
      plan_id: DEFAULT_PLANS.FREE_TRIAL.id,
      status: 'trialing',
      provider: 'razorpay',
      razorpay_customer_id: null,
      razorpay_subscription_id: null,
      razorpay_plan_id: null,
      amount: 0,
      currency: 'INR',
      trial_start_at: now.toISOString(),
      trial_end_at: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      next_charge_at: null,
      promo_id: null,
      promo_months_remaining: 0,
      promotional_cycles_completed: 0,
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
      grace_period_start_at: null,
      grace_period_end_at: null,
      last_payment_at: null,
      last_payment_id: null,
      payment_failure_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      plan: DEFAULT_PLANS.FREE_TRIAL,
    };

    await store.saveBusinessSubscription(subscription);

    // Auto-assign Welcome Promotion eligibility
    await store.assignPromotion({
      id: crypto.randomUUID(),
      promotion_id: DEFAULT_PROMOTION.id,
      business_id: businessId,
      status: 'eligible',
      assigned_at: now.toISOString(),
      redeemed_at: null,
      expires_at: null,
      created_by: 'system',
    });

    // Notify business
    await store.addNotification({
      organizationId: businessId,
      title: 'Welcome to QuoteFlow — 30-Day Free Trial Activated',
      message: `Your 30-day full access free trial has started and ends on ${trialEnd.toLocaleDateString()}. Enjoy full features with zero charge.`,
      type: 'VIEWED',
    });

    return subscription;
  }

  /**
   * Central Subscription Access and Entitlement Resolver
   * Never trust client clocks or user metadata.
   */
  public async getBusinessSubscriptionAccess(businessId: string): Promise<SubscriptionAccess> {
    let sub = await store.getBusinessSubscription(businessId);
    if (!sub) {
      sub = await this.startFreeTrial(businessId);
    }

    const now = Date.now();
    const trialEnd = sub.trial_end_at ? new Date(sub.trial_end_at).getTime() : 0;
    const graceEnd = sub.grace_period_end_at ? new Date(sub.grace_period_end_at).getTime() : 0;

    const daysRemainingInTrial = trialEnd > now
      ? Math.max(0, Math.ceil((trialEnd - now) / 86400000))
      : 0;

    const graceDaysRemaining = graceEnd > now
      ? Math.max(0, Math.ceil((graceEnd - now) / 86400000))
      : 0;

    let effectiveStatus = sub.status;

    // Check if trial has expired
    if (effectiveStatus === 'trialing' && daysRemainingInTrial === 0) {
      if (sub.is_trial_prepaid) {
        effectiveStatus = 'active';
        sub.status = 'active';
        sub.updated_at = new Date().toISOString();
        await store.saveBusinessSubscription(sub);

        await store.addNotification({
          organizationId: businessId,
          title: 'QuoteFlow Trial Ended — Paid Plan Active',
          message: 'Your 30-day free trial has concluded and your pre-paid subscription is now active.',
          type: 'APPROVED',
        });
      } else {
        effectiveStatus = 'expired';
        sub.status = 'expired';
        sub.updated_at = new Date().toISOString();
        await store.saveBusinessSubscription(sub);

        await store.addNotification({
          organizationId: businessId,
          title: 'QuoteFlow Trial Expired',
          message: 'Your 30-day free trial has concluded. Subscribe to continue sending quotes and invoices.',
          type: 'EXPIRING',
        });
      }
    }

    // Check if grace period has expired
    if (effectiveStatus === 'grace_period' && graceDaysRemaining === 0) {
      effectiveStatus = 'halted';
      sub.status = 'halted';
      sub.updated_at = new Date().toISOString();
      await store.saveBusinessSubscription(sub);
    }

    const isTrial = effectiveStatus === 'trialing';
    const isPaid = effectiveStatus === 'active';
    const isPastDue = effectiveStatus === 'past_due';
    const isGracePeriod = effectiveStatus === 'grace_period';
    const isExpired = effectiveStatus === 'expired';
    const isHalted = effectiveStatus === 'halted';
    const isCancelled = effectiveStatus === 'cancelled';

    // Access policy:
    // Trial: Full normal QuoteFlow access
    // Active: Full paid access
    // Past Due / Grace: Normal access with warning
    // Expired / Halted / Cancelled: Restricted paid-only functionality
    const allowed = isTrial || isPaid || isPastDue || isGracePeriod;

    let warningMessage: string | null = null;
    if (isTrial) {
      if (daysRemainingInTrial <= 7) {
        warningMessage = `Your QuoteFlow trial ends in ${daysRemainingInTrial} ${daysRemainingInTrial === 1 ? 'day' : 'days'}. Subscribe to avoid interruption.`;
      }
    } else if (isPastDue) {
      warningMessage = 'Your recent subscription payment failed. Please update your payment method.';
    } else if (isGracePeriod) {
      warningMessage = `Your account is in a payment grace period. Please complete payment within ${graceDaysRemaining} days to avoid suspension.`;
    } else if (isExpired) {
      warningMessage = 'Your QuoteFlow free trial has expired. Subscribe to unlock document creation.';
    } else if (isHalted) {
      warningMessage = 'Your subscription is halted due to unpaid invoices. Please reactivate your plan.';
    } else if (isCancelled) {
      warningMessage = 'Your subscription has been cancelled.';
    }

    const planName = sub.plan?.name || (sub.amount === 9900 ? 'QuoteFlow Special Offer' : sub.amount === 19900 ? 'QuoteFlow Standard' : 'QuoteFlow Free Trial');

    return {
      allowed,
      status: effectiveStatus,
      isTrial,
      isPaid,
      isPastDue,
      isGracePeriod,
      isExpired,
      isHalted,
      isCancelled,
      daysRemainingInTrial,
      graceDaysRemaining,
      trialEndsAt: sub.trial_end_at,
      planName,
      planAmount: sub.amount,
      promoActive: sub.promo_months_remaining > 0,
      promoMonthsRemaining: sub.promo_months_remaining,
      promotionalCyclesCompleted: sub.promotional_cycles_completed,
      warningMessage,
    };
  }

  /**
   * Determine whether a business is eligible for the ₹99 promotional plan
   */
  public async isEligibleForPromotion(businessId: string): Promise<boolean> {
    const assignment = await store.getPromotionAssignment(businessId, DEFAULT_PROMOTION.id);
    if (assignment && assignment.status === 'eligible') {
      return true;
    }

    // Check if business has already completed promotional cycles
    const sub = await store.getBusinessSubscription(businessId);
    if (!sub) return true;
    if (sub.promotional_cycles_completed > 0 || (sub.promo_months_remaining === 0 && sub.plan_id === DEFAULT_PLANS.STANDARD_199.id)) {
      return false; // already used
    }
    return !assignment || assignment.status === 'eligible';
  }

  /**
   * Create Razorpay Subscription checkout session server-side
   */
  public async createSubscriptionCheckout(params: {
    businessId: string;
    planSlug: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
  }): Promise<{
    subscriptionId: string;
    keyId: string;
    amount: number;
    currency: string;
    planName: string;
    planSlug: string;
    isTrialScheduled?: boolean;
    trialEndAt?: string | null;
  }> {
    const isPromo = params.planSlug === 'promo_99';
    let targetPlan: SubscriptionPlan;

    if (isPromo) {
      const eligible = await this.isEligibleForPromotion(params.businessId);
      if (!eligible) {
        throw new Error('This business is not eligible for the promotional ₹99 offer. Please choose the Standard Plan.');
      }
      targetPlan = DEFAULT_PLANS.PROMO_99;
    } else {
      targetPlan = DEFAULT_PLANS.STANDARD_199;
    }

    // 1. Create or retrieve plan in Razorpay
    let rzpPlanId = targetPlan.razorpay_plan_id;
    if (!rzpPlanId) {
      try {
        const rzpPlan = await razorpayService.createPlan({
          name: targetPlan.name,
          amount: targetPlan.amount,
          currency: targetPlan.currency,
          description: targetPlan.description || undefined,
        });
        rzpPlanId = rzpPlan.id;
      } catch (err) {
        console.warn('Razorpay plan creation error, using fallback ID:', err);
        rzpPlanId = `plan_${targetPlan.slug}_${targetPlan.amount}`;
      }
    }

    // 2. Check if customer is in active free trial and schedule start if applicable
    const existing = await store.getBusinessSubscription(params.businessId);
    const now = Date.now();
    const isCurrentlyTrialing =
      existing?.status === 'trialing' &&
      existing?.trial_end_at &&
      new Date(existing.trial_end_at).getTime() > now;

    let startAtUnix: number | undefined;
    if (isCurrentlyTrialing && existing?.trial_end_at) {
      startAtUnix = Math.floor(new Date(existing.trial_end_at).getTime() / 1000);
    }

    // 3. Create subscription in Razorpay
    const rzpSub = await razorpayService.createSubscription({
      planId: rzpPlanId,
      totalCount: 60,
      customerNotify: 1,
      startAt: startAtUnix,
      notes: {
        business_id: params.businessId,
        plan_slug: targetPlan.slug,
        is_promo: isPromo ? 'true' : 'false',
        scheduled_after_trial: isCurrentlyTrialing ? 'true' : 'false',
        trial_end_at: existing?.trial_end_at || '',
      },
    });

    // 4. Record pending/scheduled subscription in store
    const subRecord: BusinessSubscription = {
      id: existing?.id || crypto.randomUUID(),
      business_id: params.businessId,
      plan_id: targetPlan.id,
      status: isCurrentlyTrialing ? 'trialing' : 'pending',
      provider: 'razorpay',
      razorpay_customer_id: existing?.razorpay_customer_id || null,
      razorpay_subscription_id: rzpSub.id,
      razorpay_plan_id: rzpPlanId,
      amount: targetPlan.amount,
      currency: targetPlan.currency,
      trial_start_at: existing?.trial_start_at || null,
      trial_end_at: existing?.trial_end_at || null,
      current_period_start: existing?.current_period_start || null,
      current_period_end: existing?.current_period_end || null,
      next_charge_at: isCurrentlyTrialing ? existing?.trial_end_at : (existing?.next_charge_at || null),
      promo_id: isPromo ? DEFAULT_PROMOTION.id : null,
      promo_months_remaining: isPromo ? 3 : 0,
      promotional_cycles_completed: 0,
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
      grace_period_start_at: null,
      grace_period_end_at: null,
      last_payment_at: existing?.last_payment_at || null,
      last_payment_id: existing?.last_payment_id || null,
      payment_failure_count: 0,
      is_trial_prepaid: existing?.is_trial_prepaid || false,
      scheduled_plan_id: isCurrentlyTrialing ? targetPlan.id : null,
      scheduled_subscription_id: isCurrentlyTrialing ? rzpSub.id : null,
      paid_scheduled_start: isCurrentlyTrialing ? existing?.trial_end_at : null,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan: targetPlan,
    };

    await store.saveBusinessSubscription(subRecord);

    return {
      subscriptionId: rzpSub.id,
      keyId: razorpayService.getKeyId(),
      amount: targetPlan.amount,
      currency: targetPlan.currency,
      planName: targetPlan.name,
      planSlug: targetPlan.slug,
      isTrialScheduled: Boolean(isCurrentlyTrialing),
      trialEndAt: existing?.trial_end_at || null,
    };
  }

  /**
   * Process Server-Confirmed Successful Recurring Payment
   * Advances promotional cycles: ₹99 for 3 cycles -> automatically ₹199!
   */
  public async handleSuccessfulPayment(params: {
    subscriptionId: string;
    paymentId: string;
    invoiceId?: string | null;
    amount: number;
    currency?: string;
    paymentMethod?: string | null;
    businessId?: string;
  }): Promise<BusinessSubscription> {
    let sub = await store.getSubscriptionByRazorpayId(params.subscriptionId);
    if (!sub && params.businessId) {
      sub = await store.getBusinessSubscription(params.businessId);
    }
    if (!sub) {
      throw new Error(`Subscription not found for Razorpay ID: ${params.subscriptionId}`);
    }

    const now = new Date();
    const cycleEnd = new Date(now.getTime() + 30 * 86400000);

    // 1. Record payment history
    const paymentRecord: SubscriptionPayment = {
      id: crypto.randomUUID(),
      business_id: sub.business_id,
      subscription_id: sub.id,
      razorpay_payment_id: params.paymentId,
      razorpay_subscription_id: params.subscriptionId,
      razorpay_invoice_id: params.invoiceId || null,
      amount: params.amount,
      currency: params.currency || 'INR',
      status: 'captured',
      payment_method: params.paymentMethod || 'card',
      failure_reason: null,
      paid_at: now.toISOString(),
      created_at: now.toISOString(),
    };
    await store.saveSubscriptionPayment(paymentRecord);

    // 2. Lifecycle & Promotional Cycle Logic
    let newCompletedCycles = sub.promotional_cycles_completed;
    let newMonthsRemaining = sub.promo_months_remaining;
    let transitionedToStandard = false;

    if (sub.promo_months_remaining > 0 || sub.plan_id === DEFAULT_PLANS.PROMO_99.id) {
      newCompletedCycles += 1;
      newMonthsRemaining = Math.max(0, sub.promo_months_remaining - 1);

      // Transition check: After 3 successful ₹99 cycles, automatic conversion to ₹199/month!
      if (newCompletedCycles >= 3 || newMonthsRemaining === 0) {
        sub.plan_id = DEFAULT_PLANS.STANDARD_199.id;
        sub.amount = DEFAULT_PLANS.STANDARD_199.amount;
        sub.plan = DEFAULT_PLANS.STANDARD_199;
        transitionedToStandard = true;

        // Update Razorpay plan schedule for future cycles
        try {
          let standardRzpPlanId = DEFAULT_PLANS.STANDARD_199.razorpay_plan_id;
          if (!standardRzpPlanId) {
            const plan = await razorpayService.createPlan({
              name: DEFAULT_PLANS.STANDARD_199.name,
              amount: DEFAULT_PLANS.STANDARD_199.amount,
              currency: 'INR',
            });
            standardRzpPlanId = plan.id;
          }
          await razorpayService.updateSubscriptionPlan(sub.razorpay_subscription_id!, standardRzpPlanId, 'cycle_end');
        } catch (err) {
          console.warn('Could not update Razorpay recurring plan schedule (mock mode active):', err);
        }

        // Mark promotion assignment redeemed
        await store.updatePromotionAssignmentStatus(sub.business_id, DEFAULT_PROMOTION.id, 'redeemed');
      }
    }

    const isCurrentlyTrialing =
      sub.status === 'trialing' &&
      !!sub.trial_end_at &&
      new Date(sub.trial_end_at).getTime() > now.getTime();

    if (isCurrentlyTrialing && sub.trial_end_at) {
      sub.is_trial_prepaid = true;
      sub.paid_scheduled_start = sub.trial_end_at;
      sub.last_payment_at = now.toISOString();
      sub.last_payment_id = params.paymentId;
      sub.current_period_start = sub.trial_end_at;
      const trialEndTime = new Date(sub.trial_end_at).getTime();
      sub.current_period_end = new Date(trialEndTime + 30 * 86400000).toISOString();
      sub.next_charge_at = sub.trial_end_at;
      sub.status = 'trialing'; // Full trial days preserved
    } else {
      sub.status = 'active';
      sub.last_payment_at = now.toISOString();
      sub.last_payment_id = params.paymentId;
      sub.current_period_start = now.toISOString();
      sub.current_period_end = cycleEnd.toISOString();
      sub.next_charge_at = cycleEnd.toISOString();
    }
    sub.promotional_cycles_completed = newCompletedCycles;
    sub.promo_months_remaining = newMonthsRemaining;
    sub.payment_failure_count = 0;
    sub.grace_period_start_at = null;
    sub.grace_period_end_at = null;
    sub.updated_at = now.toISOString();

    await store.saveBusinessSubscription(sub);

    // Notifications & emails
    const formattedAmount = `₹${(params.amount / 100).toFixed(2)}`;
    await store.addNotification({
      organizationId: sub.business_id,
      title: 'Subscription Payment Confirmed',
      message: `Your payment of ${formattedAmount} was successfully processed. Your QuoteFlow subscription is active.`,
      type: 'APPROVED',
    });

    if (transitionedToStandard) {
      await store.addNotification({
        organizationId: sub.business_id,
        title: 'Promotion Completed — Converted to QuoteFlow Standard',
        message: 'Your 3 promotional cycles at ₹99/mo have completed. Your subscription has automatically transitioned to the QuoteFlow Standard Plan (₹199/mo).',
        type: 'VIEWED',
      });
    }

    return sub;
  }

  /**
   * Process Recurring Payment Failure with Grace Period
   */
  public async handlePaymentFailure(params: {
    subscriptionId: string;
    paymentId?: string;
    failureReason: string;
  }): Promise<BusinessSubscription> {
    const sub = await store.getSubscriptionByRazorpayId(params.subscriptionId);
    if (!sub) {
      throw new Error(`Subscription not found for Razorpay ID: ${params.subscriptionId}`);
    }

    const now = new Date();
    const graceDays = razorpayService.getGracePeriodDays();
    const graceEnd = new Date(now.getTime() + graceDays * 86400000);

    const failCount = (sub.payment_failure_count || 0) + 1;
    sub.payment_failure_count = failCount;
    sub.status = 'grace_period';

    if (!sub.grace_period_start_at) {
      sub.grace_period_start_at = now.toISOString();
      sub.grace_period_end_at = graceEnd.toISOString();
    }
    sub.updated_at = now.toISOString();

    await store.saveBusinessSubscription(sub);

    // Record failure in payments table
    if (params.paymentId) {
      await store.saveSubscriptionPayment({
        id: crypto.randomUUID(),
        business_id: sub.business_id,
        subscription_id: sub.id,
        razorpay_payment_id: params.paymentId,
        razorpay_subscription_id: params.subscriptionId,
        razorpay_invoice_id: null,
        amount: sub.amount,
        currency: sub.currency,
        status: 'failed',
        payment_method: null,
        failure_reason: params.failureReason,
        paid_at: null,
        created_at: now.toISOString(),
      });
    }

    // Send urgent notification
    await store.addNotification({
      organizationId: sub.business_id,
      title: 'Payment Failed — Grace Period Active',
      message: `Your subscription payment could not be processed (${params.failureReason}). Please update your payment method within ${graceDays} days to prevent service interruption.`,
      type: 'EXPIRING',
    });

    return sub;
  }

  /**
   * Cancel Subscription
   */
  public async cancelSubscription(params: {
    businessId: string;
    reason?: string;
    cancelAtPeriodEnd?: boolean;
    cancelledByUserId?: string;
  }): Promise<BusinessSubscription> {
    const sub = await store.getBusinessSubscription(params.businessId);
    if (!sub) throw new Error('No active subscription found for this business.');

    const cancelAtPeriodEnd = params.cancelAtPeriodEnd !== false;

    if (sub.razorpay_subscription_id) {
      try {
        await razorpayService.cancelSubscription(sub.razorpay_subscription_id, cancelAtPeriodEnd);
      } catch (err) {
        console.warn('Razorpay cancel subscription error (mock mode active):', err);
      }
    }

    sub.cancel_at_period_end = cancelAtPeriodEnd;
    sub.cancelled_at = new Date().toISOString();
    sub.cancellation_reason = params.reason || 'User requested cancellation';
    if (!cancelAtPeriodEnd) {
      sub.status = 'cancelled';
    }
    sub.updated_at = new Date().toISOString();

    await store.saveBusinessSubscription(sub);

    // Log admin audit
    if (params.cancelledByUserId) {
      await store.logAdminAudit({
        id: crypto.randomUUID(),
        admin_user_id: params.cancelledByUserId,
        admin_email: null,
        action: 'CANCEL_SUBSCRIPTION',
        target_type: 'subscription',
        target_id: sub.id,
        metadata: {
          business_id: params.businessId,
          reason: params.reason,
          cancel_at_period_end: cancelAtPeriodEnd,
        },
        created_at: new Date().toISOString(),
      });
    }

    return sub;
  }

  /**
   * Resume/Reactivate Subscription
   */
  public async reactivateSubscription(params: {
    businessId: string;
    planSlug?: string;
  }): Promise<{ checkoutUrl?: string; subscription: BusinessSubscription }> {
    const sub = await store.getBusinessSubscription(params.businessId);
    if (!sub) throw new Error('Subscription record not found');

    if (sub.cancel_at_period_end && sub.status === 'active') {
      sub.cancel_at_period_end = false;
      sub.cancelled_at = null;
      sub.cancellation_reason = null;
      sub.updated_at = new Date().toISOString();
      await store.saveBusinessSubscription(sub);
      return { subscription: sub };
    }

    const planSlug = params.planSlug || 'monthly_199';
    await this.createSubscriptionCheckout({
      businessId: params.businessId,
      planSlug,
    });
    const refreshed = (await store.getBusinessSubscription(params.businessId))!;
    return { subscription: refreshed };
  }

  // ==============================================================================
  // SUPPORT TICKETS DOMAIN METHODS
  // ==============================================================================

  public async createSupportTicket(params: {
    businessId: string;
    userId: string;
    creatorEmail?: string;
    creatorName?: string;
    subject: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    description: string;
    attachments?: Array<{
      file_name: string;
      file_size: number;
      mime_type: string;
      storage_path: string;
    }>;
    callbackRequested?: boolean;
    callbackPhone?: string;
  }): Promise<SupportTicket> {
    const counter = await store.getNextTicketNumber();
    const year = new Date().getFullYear();
    const ticketNumber = `QF-${year}-${counter.toString().padStart(6, '0')}`;

    const now = new Date().toISOString();
    const ticketId = crypto.randomUUID();

    const ticket: SupportTicket = {
      id: ticketId,
      business_id: params.businessId,
      created_by_user_id: params.userId,
      ticket_number: ticketNumber,
      subject: params.subject,
      category: params.category,
      priority: params.priority,
      status: 'open',
      description: params.description,
      assigned_to: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      callback_requested: Boolean(params.callbackRequested),
      callback_phone: params.callbackPhone || undefined,
      creator_email: params.creatorEmail,
      creator_name: params.creatorName,
    };

    await store.saveSupportTicket(ticket);

    // Initial message
    const messageId = crypto.randomUUID();
    const message: SupportTicketMessage = {
      id: messageId,
      ticket_id: ticketId,
      sender_user_id: params.userId,
      sender_type: 'business',
      sender_name: params.creatorName || 'Customer',
      message: params.description,
      created_at: now,
    };
    await store.saveSupportTicketMessage(message);

    // Save attachments
    if (params.attachments && params.attachments.length > 0) {
      for (const att of params.attachments) {
        await store.saveSupportTicketAttachment({
          id: crypto.randomUUID(),
          ticket_id: ticketId,
          message_id: messageId,
          uploaded_by_user_id: params.userId,
          storage_path: att.storage_path,
          file_name: att.file_name,
          file_size: att.file_size,
          mime_type: att.mime_type,
          created_at: now,
        });
      }
    }

    // Notify organization
    await store.addNotification({
      organizationId: params.businessId,
      title: `Support Ticket Created: ${ticketNumber}`,
      message: `Your ticket "${params.subject}" has been received. Our developer support engineering team is reviewing it.`,
      type: 'VIEWED',
    });

    return ticket;
  }

  public async addTicketMessage(params: {
    ticketId: string;
    senderUserId?: string;
    senderType: 'business' | 'developer' | 'system';
    senderName?: string;
    message: string;
    attachments?: Array<{
      file_name: string;
      file_size: number;
      mime_type: string;
      storage_path: string;
    }>;
  }): Promise<SupportTicketMessage> {
    const ticket = await store.getSupportTicket(params.ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date().toISOString();
    const msgId = crypto.randomUUID();

    const msg: SupportTicketMessage = {
      id: msgId,
      ticket_id: params.ticketId,
      sender_user_id: params.senderUserId || null,
      sender_type: params.senderType,
      sender_name: params.senderName || (params.senderType === 'developer' ? 'QuoteFlow Engineer' : 'Customer'),
      message: params.message,
      created_at: now,
    };
    await store.saveSupportTicketMessage(msg);

    // Update ticket status
    if (params.senderType === 'developer') {
      ticket.status = 'waiting_for_customer';
    } else if (params.senderType === 'business') {
      ticket.status = 'in_progress';
    }
    ticket.updated_at = now;
    await store.saveSupportTicket(ticket);

    // Save attachments
    if (params.attachments && params.attachments.length > 0) {
      for (const att of params.attachments) {
        await store.saveSupportTicketAttachment({
          id: crypto.randomUUID(),
          ticket_id: params.ticketId,
          message_id: msgId,
          uploaded_by_user_id: params.senderUserId || 'system',
          storage_path: att.storage_path,
          file_name: att.file_name,
          file_size: att.file_size,
          mime_type: att.mime_type,
          created_at: now,
        });
      }
    }

    return msg;
  }
}

export const subscriptionService = new SubscriptionService();
