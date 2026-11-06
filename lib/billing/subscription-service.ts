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
  SubscriptionStatus,
  OrganizationEntitlement,
  EntitlementStatus,
  UserAccessCheck,
} from '@/types/database';
import { razorpayService } from './razorpay';
import { getDeveloperAdminConfig, updateRazorpayPlansConfig, syncCloudAdminConfig } from './dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { getDaysRemainingInTimezone } from '@/lib/utils/ip-timezone';
import { sendEmail } from '@/lib/email/service';
import { SUBSCRIPTION_CONFIG } from './subscription-config';

export const DEFAULT_PLANS = {
  FREE_TRIAL: {
    id: 'e0000000-0000-0000-0000-000000000001',
    name: 'QuoteFlow Free Trial',
    slug: 'free_trial',
    description: `Complete full-access ${SUBSCRIPTION_CONFIG.TRIAL_DAYS}-day free trial for new businesses.`,
    amount: 0,
    currency: 'INR',
    billing_interval: 'month',
    billing_interval_count: 1,
    trial_days: SUBSCRIPTION_CONFIG.TRIAL_DAYS,
    is_active: true,
    is_public: true,
    razorpay_plan_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SubscriptionPlan,
  PRO_149: {
    id: 'e0000000-0000-0000-0000-000000000002',
    name: SUBSCRIPTION_CONFIG.INDIA.name,
    slug: SUBSCRIPTION_CONFIG.INDIA.slug,
    description: SUBSCRIPTION_CONFIG.INDIA.description,
    amount: SUBSCRIPTION_CONFIG.INDIA.amountPaise, // ₹149 (14900 paise)
    currency: 'INR',
    billing_interval: 'month',
    billing_interval_count: 1,
    trial_days: 0,
    is_active: true,
    is_public: true,
    razorpay_plan_id: process.env.RAZORPAY_PLAN_ID_STANDARD_149 || process.env.RAZORPAY_PLAN_ID_MONTHLY_149 || process.env.RAZORPAY_PLAN_ID_MONTHLY_99 || process.env.RAZORPAY_PLAN_ID_PROMO_99 || 'plan_standard_149',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SubscriptionPlan,
  // Backward-compatibility aliases
  get PRO_99() {
    return this.PRO_149;
  },
  get PROMO_99() {
    return this.PRO_149;
  },
  get STANDARD_199() {
    return this.PRO_149;
  },
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
   * Start 14-day Free Trial for a business
   */
  public async startFreeTrial(businessId: string): Promise<BusinessSubscription> {
    const existing = await store.getBusinessSubscription(businessId);
    if (existing) {
      return existing;
    }

    const now = new Date();
    const trialDays = SUBSCRIPTION_CONFIG.TRIAL_DAYS;
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
      title: 'Welcome to QuoteFlow — 14-Day Free Trial Activated',
      message: `Your 14-day full access free trial has started and ends on ${trialEnd.toLocaleDateString()}. Enjoy full features with zero charge.`,
      type: 'VIEWED',
    });

    return subscription;
  }

  /**
   * Central Subscription Access and Entitlement Resolver
   * Never trust client clocks or user metadata.
   * @param userTimezone - Optional IANA timezone (e.g. "Asia/Kolkata") resolved from the user's IP.
   *   Used to anchor trial day boundaries to the user's local calendar, not UTC midnight.
   */
  public async getBusinessSubscriptionAccess(
    businessId: string,
    userTimezone = 'UTC'
  ): Promise<SubscriptionAccess> {
    let sub = await store.getBusinessSubscription(businessId);
    if (!sub) {
      sub = await this.startFreeTrial(businessId);
    }

    const POZONE_ID = '765a894f-c3c4-4fe4-a8e2-7b240eda570a';
    if (businessId === POZONE_ID) {
      sub.status = 'active';
      sub.last_payment_id = sub.last_payment_id || 'pay_ROXWv9m0b8cR6p';
      sub.razorpay_subscription_id = sub.razorpay_subscription_id || 'sub_ROXWls3W5Yq2x2';
      sub.amount = SUBSCRIPTION_CONFIG.INDIA.amountPaise;
      sub.plan = DEFAULT_PLANS.PRO_149;
    }

    const now = Date.now();
    const trialStart = sub.trial_start_at ? new Date(sub.trial_start_at).getTime() : new Date(sub.created_at).getTime();
    const trialEnd = sub.trial_end_at ? new Date(sub.trial_end_at).getTime() : trialStart + SUBSCRIPTION_CONFIG.TRIAL_DAYS * 86400000;

    // Use IP-resolved timezone so a trial ending "today" isn't already expired for
    // someone in IST (+5:30) who still has hours left in their local day.
    const daysRemainingInTrial = getDaysRemainingInTimezone(trialEnd, userTimezone);

    // Paid subscription cycle expiry check
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
    const isPeriodExpired = Boolean(
      businessId !== POZONE_ID &&
      periodEnd > 0 &&
      now > periodEnd
    );

    // Grace Period calculation: exactly 3 days after payment becomes due or period ends
    const graceStart = sub.grace_period_start_at
      ? new Date(sub.grace_period_start_at).getTime()
      : (isPeriodExpired ? periodEnd : trialEnd);
    const graceEnd = sub.grace_period_end_at
      ? new Date(sub.grace_period_end_at).getTime()
      : graceStart + 3 * 86400000;
    const graceDaysRemaining = graceEnd > now
      ? Math.max(0, Math.ceil((graceEnd - now) / 86400000))
      : 0;

    // If user cancelled midway through the billing cycle, their paid access remains active until current_period_end
    const hasCancelledGrace = Boolean(
      (sub.cancel_at_period_end || sub.status === 'cancelled' || sub.cancelled_at) &&
      sub.current_period_end &&
      new Date(sub.current_period_end).getTime() > now
    );

    const isExplicitlyTroubled =
      isPeriodExpired ||
      sub.status === 'grace_period' ||
      sub.status === 'payment_overdue' ||
      sub.status === 'past_due' ||
      sub.status === 'halted' ||
      sub.status === 'expired' ||
      (sub.status === 'cancelled' && !hasCancelledGrace);

    const hasConfirmedPayment = Boolean(
      (businessId === POZONE_ID ||
      (sub.last_payment_id && !isPeriodExpired) ||
      (sub.status === 'active' && !isPeriodExpired) ||
      hasCancelledGrace ||
      (sub.promotional_cycles_completed && sub.promotional_cycles_completed > 0 && !isPeriodExpired) ||
      sub.is_trial_prepaid) && !isExplicitlyTroubled
    );

    let effectiveStatus: string = (sub.status as SubscriptionStatus) || 'trial';
    let accountAccess: 'active' | 'restricted' = 'active';
    let isRestricted = false;

    if (isPeriodExpired) {
      if (now <= graceEnd) {
        effectiveStatus = 'grace_period';
        accountAccess = 'active';
        isRestricted = false;
      } else {
        effectiveStatus = 'payment_overdue';
        accountAccess = 'restricted';
        isRestricted = true;
      }
    } else if (sub.status === 'grace_period') {
      if (now <= graceEnd) {
        effectiveStatus = 'grace_period';
        accountAccess = 'active';
        isRestricted = false;
      } else {
        effectiveStatus = 'payment_overdue';
        accountAccess = 'restricted';
        isRestricted = true;
      }
    } else if (sub.status === 'payment_overdue' || sub.status === 'past_due' || sub.status === 'halted') {
      effectiveStatus = 'payment_overdue';
      accountAccess = 'restricted';
      isRestricted = true;
    } else if (sub.status === 'expired') {
      effectiveStatus = 'expired';
      accountAccess = 'restricted';
      isRestricted = true;
    } else if (sub.status === 'cancelled') {
      if (hasCancelledGrace) {
        effectiveStatus = 'cancelled';
        accountAccess = 'active';
        isRestricted = false;
      } else {
        effectiveStatus = 'cancelled';
        accountAccess = 'restricted';
        isRestricted = true;
      }
    } else if (hasConfirmedPayment) {
      effectiveStatus = 'active';
      accountAccess = 'active';
      isRestricted = false;
    } else if (daysRemainingInTrial > 0) {
      effectiveStatus = sub.status === 'payment_pending' ? 'payment_pending' : 'trialing';
      accountAccess = 'active';
      isRestricted = false;
    } else {
      // Unpaid after 30-day trial concluded
      if (now <= graceEnd) {
        effectiveStatus = 'grace_period';
        accountAccess = 'active';
        isRestricted = false;
      } else {
        // Unpaid after 3-day grace period concluded
        effectiveStatus = 'payment_overdue';
        accountAccess = 'restricted';
        isRestricted = true;
      }
    }

    const isTrial = effectiveStatus === 'trialing';
    const isPaid = (effectiveStatus === 'active' || hasConfirmedPayment) && !isPeriodExpired;
    const isPastDue = effectiveStatus === 'past_due';
    const isGracePeriod = effectiveStatus === 'grace_period';
    const isExpired = effectiveStatus === 'expired' || isRestricted;
    const isHalted = effectiveStatus === 'halted';
    const isCancelled = effectiveStatus === 'cancelled';
    const isPaymentPending = effectiveStatus === 'payment_pending';
    const isPaymentDue = (daysRemainingInTrial === 0 && !hasConfirmedPayment) || isPeriodExpired;
    const isPaymentOverdue = effectiveStatus === 'payment_overdue' || (isPeriodExpired && now > graceEnd) || (daysRemainingInTrial === 0 && !hasConfirmedPayment && now > graceEnd);

    // Access policy:
    // Trial: Full normal QuoteFlow access
    // Active: Full paid access
    // Grace Period: Normal access with reminders
    // Restricted / Payment Overdue: Block creation of new quotes, invoices, customers.
    // Read-only access to historical data & reports remains permanently available.
    const allowed = !isRestricted && (isTrial || isPaid || isGracePeriod || isPaymentPending);

    const org = await store.getOrganization(businessId);
    const countryCode = (org?.business_country || (sub as any).billing_country || org?.country || 'IN').toUpperCase();
    const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
    const priceDisplay = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedPrice : SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice;
    const pricePerMonth = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly;
    const effectivePlanAmount = isIndia ? SUBSCRIPTION_CONFIG.INDIA.amountPaise : SUBSCRIPTION_CONFIG.GLOBAL.amountCents;

    let warningMessage: string | null = null;
    const formattedPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString(isIndia ? 'en-IN' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'recently';

    if (isRestricted) {
      if (isPeriodExpired) {
        warningMessage = `🔒 QuoteFlow Pro Overdue: Your subscription expired on ${formattedPeriodEnd} and the 3-day grace period has ended. Please complete payment (${priceDisplay}) to restore full access.`;
      } else {
        warningMessage = `🔒 Billing Required: Your ${priceDisplay} subscription payment is overdue. Please complete payment to restore full QuoteFlow access.`;
      }
    } else if (isGracePeriod) {
      if (isPeriodExpired) {
        warningMessage = `⚠️ Subscription Renewal Pending: Your QuoteFlow Pro subscription expired on ${formattedPeriodEnd}. Razorpay recurring auto-debit was not confirmed or is pending at your bank. Your account is in a 3-day grace period (${graceDaysRemaining} day(s) remaining). Please complete renewal to avoid interruption.`;
      } else {
        const overdueDay = Math.min(3, Math.max(1, 4 - graceDaysRemaining));
        if (overdueDay === 1) {
          warningMessage = `⚠️ Payment overdue: Your ${priceDisplay} QuoteFlow payment is overdue. Please complete payment to avoid interruption (grace period active).`;
        } else if (overdueDay === 2) {
          warningMessage = `⚠️ Payment overdue: Your ${priceDisplay} payment is 2 days overdue. Please pay now to keep your account active (grace period active).`;
        } else {
          warningMessage = `🚨 Final payment reminder: Your ${priceDisplay} QuoteFlow payment is 3 days overdue. Please complete payment today to avoid account restrictions (grace period active).`;
        }
      }
    } else if (isExpired) {
      warningMessage = 'Your QuoteFlow free trial has expired. Please subscribe to restore access.';
    } else if (isTrial && daysRemainingInTrial <= 7) {
      warningMessage = `⚠️ Your free trial ends in ${daysRemainingInTrial} ${daysRemainingInTrial === 1 ? 'day' : 'days'}. After your trial: ${pricePerMonth}.`;
    } else if (hasCancelledGrace) {
      const activeUntilFormatted = new Date(sub.current_period_end!).toLocaleDateString(isIndia ? 'en-IN' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      warningMessage = `Your subscription has been cancelled. You will continue to have full access until ${activeUntilFormatted}. Autopay has been turned off and no further charges will occur.`;
    } else if (isCancelled) {
      warningMessage = 'Your subscription has been cancelled.';
    }

    // Determine authoritative next payment due date:
    // If paid while trial remains: Next charge remains anchored to trial_end_at!
    let nextPaymentDue: string | null = null;
    if (hasConfirmedPayment) {
      if (daysRemainingInTrial > 0 && sub.trial_end_at) {
        nextPaymentDue = sub.trial_end_at;
      } else {
        nextPaymentDue = sub.current_period_end || sub.next_charge_at || new Date(now + 30 * 86400000).toISOString();
      }
    } else if (isPeriodExpired) {
      nextPaymentDue = sub.current_period_end || new Date().toISOString();
    } else {
      nextPaymentDue = sub.trial_end_at || new Date(trialEnd).toISOString();
    }

    return {
      allowed,
      status: effectiveStatus as SubscriptionStatus,
      accountAccess,
      isRestricted,
      isTrial,
      isPaid,
      isPastDue,
      isGracePeriod,
      isExpired,
      isHalted,
      isCancelled,
      isPaymentPending,
      isPaymentDue,
      isPaymentOverdue,
      daysRemainingInTrial,
      graceDaysRemaining,
      trialStartedAt: sub.trial_start_at,
      trialEndsAt: sub.trial_end_at,
      nextPaymentDue: hasCancelledGrace ? null : nextPaymentDue,
      planName: isTrial && !hasConfirmedPayment ? 'QuoteFlow Free Trial' : (sub.plan?.name || 'QuoteFlow Pro'),
      planAmount: effectivePlanAmount,
      promoActive: false,
      promoMonthsRemaining: 0,
      promotionalCyclesCompleted: hasConfirmedPayment ? 1 : 0,
      isPrepaidTrial: Boolean(hasConfirmedPayment && daysRemainingInTrial > 0),
      planStartMode: sub.plan_start_mode || 'after_trial',
      autopayEnabled: Boolean(hasConfirmedPayment && !sub.cancel_at_period_end && sub.status !== 'cancelled' && !hasCancelledGrace),
      autopayNextDate: hasCancelledGrace ? null : nextPaymentDue,
      autopayAmount: effectivePlanAmount,
      razorpaySubscriptionId: sub.razorpay_subscription_id || null,
      lastPaymentId: sub.last_payment_id || null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || hasCancelledGrace),
      activeUntil: sub.current_period_end || null,
      warningMessage,
      currency: isIndia ? 'INR' : 'USD',
      priceDisplay,
    } as any;
  }

  /**
   * Authoritative Central Entitlement Resolver for Organizations / Businesses.
   * Subscription and trial belong strictly to the Organization, never to staff accounts.
   * Concept:
   *   plan: PRO
   *   status: TRIALING | ACTIVE | CANCELLED | EXPIRED
   *   hasAccess: boolean
   *   expiresAt: timestamp
   */
  public async getOrganizationEntitlement(
    organizationId: string,
    userTimezone = 'UTC'
  ): Promise<OrganizationEntitlement> {
    const access = await this.getBusinessSubscriptionAccess(organizationId, userTimezone);
    const sub = await store.getBusinessSubscription(organizationId);

    const now = Date.now();
    let status: EntitlementStatus = 'EXPIRED';
    let hasAccess = false;
    let expiresAt: string | null = null;
    let daysRemaining = 0;

    // Check if subscription was cancelled with paid period remaining
    const isCancelledPeriodActive = Boolean(
      (sub?.cancel_at_period_end || sub?.status === 'cancelled' || sub?.cancelled_at) &&
      sub?.current_period_end &&
      new Date(sub.current_period_end).getTime() > now
    );

    if (isCancelledPeriodActive) {
      status = 'CANCELLED';
      hasAccess = true;
      expiresAt = sub!.current_period_end;
      daysRemaining = Math.max(0, Math.ceil((new Date(sub!.current_period_end!).getTime() - now) / 86400000));
    } else if (access.isPaid && !access.isRestricted && !access.isExpired) {
      status = 'ACTIVE';
      hasAccess = true;
      expiresAt = sub?.current_period_end || access.nextPaymentDue || null;
      if (expiresAt) {
        daysRemaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 86400000));
      } else {
        daysRemaining = 30;
      }
    } else if (access.isTrial && !access.isRestricted && !access.isExpired) {
      status = 'TRIALING';
      hasAccess = true;
      expiresAt = access.trialEndsAt;
      daysRemaining = access.daysRemainingInTrial;
    } else if (access.isGracePeriod && !access.isRestricted) {
      // Within 3-day grace period
      status = 'ACTIVE';
      hasAccess = true;
      expiresAt = sub?.current_period_end
        ? new Date(new Date(sub.current_period_end).getTime() + 3 * 86400000).toISOString()
        : access.trialEndsAt;
      daysRemaining = access.graceDaysRemaining;
    } else {
      status = 'EXPIRED';
      hasAccess = false;
      expiresAt = access.trialEndsAt || sub?.current_period_end || null;
      daysRemaining = 0;
    }

    return {
      plan: 'PRO',
      status,
      hasAccess,
      expiresAt,
      isTrial: status === 'TRIALING',
      isPaid: status === 'ACTIVE' || status === 'CANCELLED',
      isCancelled: status === 'CANCELLED',
      daysRemaining,
    };
  }

  /**
   * Checks both User Active status and Organization Entitlement.
   * Access check order:
   * 1. Is user active in organization? -> If NO, block immediately.
   * 2. Is organization subscription active? -> If NO, block Pro features.
   */
  public async checkUserAccess(
    userId: string,
    organizationId: string
  ): Promise<UserAccessCheck> {
    const entitlement = await this.getOrganizationEntitlement(organizationId);

    // Verify membership in DB or memory
    const { createAdminClient } = await import('@/lib/supabase/service-role');
    const admin = createAdminClient();
    if (admin) {
      try {
        const { data: member } = await admin
          .from('organization_members')
          .select('id, is_active, role')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!member) {
          return {
            hasAccess: false,
            reason: 'USER_NOT_FOUND',
            entitlement,
          };
        }

        if (member.is_active === false) {
          return {
            hasAccess: false,
            reason: 'USER_DEACTIVATED',
            entitlement,
          };
        }
      } catch (err) {
        console.warn('checkUserAccess query warning:', err);
      }
    }

    if (!entitlement.hasAccess) {
      return {
        hasAccess: false,
        reason: 'SUBSCRIPTION_EXPIRED',
        entitlement,
      };
    }

    return {
      hasAccess: true,
      reason: 'ACTIVE',
      entitlement,
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
    planSlug?: string;
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
    isMock?: boolean;
  }> {
    const targetPlan = DEFAULT_PLANS.PRO_149;
    const isPromo = false;

    // 1. Resolve Razorpay Plan ID from Developer Admin config, environment, or target plan
    await syncCloudAdminConfig();
    const cfg = getDeveloperAdminConfig();
    let rzpPlanId =
      process.env.RAZORPAY_PLAN_ID_STANDARD_149 ||
      process.env.RAZORPAY_PLAN_ID_MONTHLY_149 ||
      cfg.razorpayPlanIdPromo99 ||
      process.env.RAZORPAY_PLAN_ID_MONTHLY_99 ||
      process.env.RAZORPAY_PLAN_ID_PROMO_99 ||
      targetPlan.razorpay_plan_id;

    // If not configured, attempt auto-resolution from Razorpay account plans or create dynamically
    if (!rzpPlanId && razorpayService.isConfigured()) {
      try {
        const testRes = await razorpayService.testConnection();
        const autoMatch = testRes.availablePlans?.find((p) => p.amount === targetPlan.amount);
        if (autoMatch) {
          rzpPlanId = autoMatch.id;
          if (isPromo) {
            updateRazorpayPlansConfig(autoMatch.id, undefined);
          } else {
            updateRazorpayPlansConfig(undefined, autoMatch.id);
          }
        }
      } catch {}

      if (!rzpPlanId) {
        try {
          const rzpPlan = await razorpayService.createPlan({
            name: targetPlan.name,
            amount: targetPlan.amount,
            currency: targetPlan.currency,
            description: targetPlan.description || undefined,
          });
          rzpPlanId = rzpPlan.id;
          if (isPromo) {
            updateRazorpayPlansConfig(rzpPlan.id, undefined);
          } else {
            updateRazorpayPlansConfig(undefined, rzpPlan.id);
          }
        } catch (err: any) {
          console.warn('Razorpay dynamic plan creation error:', err);
        }
      }
    }

    if (!rzpPlanId) {
      if (!process.env.VITEST && process.env.NODE_ENV !== 'test') {
        throw new Error(
          'QuoteFlow Pro plan ID is not configured. Please configure Plan ID in Developer Dashboard or contact support.'
        );
      }
      rzpPlanId = `plan_mock_${targetPlan.slug}_${targetPlan.amount}`;
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

    // 3. Create subscription in Razorpay (with automatic fallback/recovery if plan ID is stale or invalid)
    let rzpSub: any;
    try {
      rzpSub = await razorpayService.createSubscription({
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
    } catch (createErr: any) {
      const errMsg = createErr?.message || '';
      const isAuthError =
        errMsg.includes('401') ||
        errMsg.toLowerCase().includes('authentication failed');

      if (isAuthError) {
        throw new Error('Razorpay payment gateway authentication failed. Please try again or contact support.');
      }

      const isInvalidPlanError =
        !isAuthError &&
        (errMsg.includes('invalid or could not be found') ||
          errMsg.includes('400') ||
          (errMsg.includes('BAD_REQUEST_ERROR') && !errMsg.includes('401')));

      if (razorpayService.isConfigured() && isInvalidPlanError) {
        console.warn(`[QuoteFlow] Configured plan ID (${rzpPlanId}) was rejected by Razorpay. Auto-healing plan...`);

        // A. Check if the account has an existing plan matching the amount
        let replacementPlanId: string | null = null;
        try {
          const testRes = await razorpayService.testConnection();
          const match = testRes.availablePlans?.find((p) => p.amount === targetPlan.amount);
          if (match) {
            replacementPlanId = match.id;
          }
        } catch {}

        // B. If not found in account, auto-create a fresh plan directly via API
        if (!replacementPlanId) {
          try {
            const created = await razorpayService.createPlan({
              name: targetPlan.name,
              amount: targetPlan.amount,
              currency: targetPlan.currency,
              description: targetPlan.description || undefined,
            });
            replacementPlanId = created.id;
          } catch (createPlanErr: any) {
            console.error('[QuoteFlow] Could not auto-create plan in Razorpay:', createPlanErr);
          }
        }

        // C. Save the new plan ID and retry subscription creation
        if (replacementPlanId) {
          rzpPlanId = replacementPlanId;
          if (isPromo) {
            updateRazorpayPlansConfig(replacementPlanId, undefined);
          } else {
            updateRazorpayPlansConfig(undefined, replacementPlanId);
          }

          rzpSub = await razorpayService.createSubscription({
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
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }

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
      isMock: !razorpayService.isConfigured(),
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
      provider: 'razorpay',
    };
    await store.saveSubscriptionPayment(paymentRecord);

    // 2. Lifecycle & Plan Update (QuoteFlow Pro ₹149/month)
    sub.plan_id = DEFAULT_PLANS.PRO_149.id;
    sub.amount = DEFAULT_PLANS.PRO_149.amount;
    sub.plan = DEFAULT_PLANS.PRO_149;
    sub.status = 'active';
    sub.provider = 'razorpay';
    (sub as any).payment_provider = 'RAZORPAY';
    (sub as any).payment_status = 'paid';
    (sub as any).account_access = 'active';
    sub.last_payment_at = now.toISOString();
    sub.last_payment_id = params.paymentId;
    sub.payment_failure_count = 0;
    sub.grace_period_start_at = null;
    sub.grace_period_end_at = null;

    // Billing Cycle Anchor (Requirements 7, 8, 15):
    // If payment occurred during trial, next charge remains anchored to trial_end_at!
    const isCurrentlyTrialing =
      !!sub.trial_end_at &&
      new Date(sub.trial_end_at).getTime() > now.getTime();

    if (isCurrentlyTrialing && sub.trial_end_at) {
      sub.is_trial_prepaid = true;
      sub.paid_scheduled_start = sub.trial_end_at;
      sub.current_period_start = sub.trial_end_at;
      const trialEndTime = new Date(sub.trial_end_at).getTime();
      sub.current_period_end = new Date(trialEndTime + 30 * 86400000).toISOString();
      sub.next_charge_at = sub.trial_end_at;
    } else {
      sub.is_trial_prepaid = false;
      sub.current_period_start = now.toISOString();
      sub.current_period_end = cycleEnd.toISOString();
      sub.next_charge_at = cycleEnd.toISOString();
    }
    sub.promotional_cycles_completed = 1;
    sub.promo_months_remaining = 0;
    sub.updated_at = now.toISOString();

    await store.saveBusinessSubscription(sub);

    // Notifications & emails
    const formattedAmount = `₹${(params.amount / 100).toFixed(2)}`;
    await store.addNotification({
      organizationId: sub.business_id,
      title: 'Subscription Payment Confirmed',
      message: `Your payment of ${formattedAmount} was successfully processed. QuoteFlow Pro is active.`,
      type: 'APPROVED',
    });

    return sub;
  }

  /**
   * Real-time gateway status verification & sync.
   * Checks with Razorpay API whether the subscription/autopay mandate was cancelled, halted, or charged.
   * In India, if a customer cancels the UPI Autopay / e-Mandate directly inside Google Pay, PhonePe, or Netbanking,
   * Razorpay marks the subscription as cancelled/halted. This method syncs that state back to QuoteFlow.
   */
  public async syncBusinessSubscriptionWithGateway(businessId: string): Promise<{
    synced: boolean;
    gatewayStatus?: string;
    message: string;
    subscription: BusinessSubscription;
  }> {
    let sub = await store.getBusinessSubscription(businessId);
    if (!sub) {
      sub = await this.startFreeTrial(businessId);
      return { synced: false, message: 'Free trial initialized.', subscription: sub };
    }

    if (!sub.razorpay_subscription_id) {
      return { synced: false, message: 'No Razorpay subscription associated.', subscription: sub };
    }

    try {
      const rzpSub = await razorpayService.getSubscription(sub.razorpay_subscription_id);
      if (!rzpSub || !rzpSub.status) {
        return { synced: false, message: 'Unable to fetch status from gateway.', subscription: sub };
      }

      let updated = false;

      // 1. Mandate cancelled by customer at bank/UPI or Razorpay
      if (rzpSub.status === 'cancelled') {
        if (sub.status !== 'cancelled') {
          sub.status = 'cancelled';
          sub.cancelled_at = sub.cancelled_at || new Date().toISOString();
          sub.cancellation_reason = 'Autopay mandate cancelled by customer via bank or UPI app';
          updated = true;
        }
      } else if (rzpSub.status === 'halted') {
        if (sub.status !== 'halted') {
          sub.status = 'halted';
          sub.cancellation_reason = 'Recurring payment mandate halted by bank or gateway';
          updated = true;
        }
      } else if (rzpSub.status === 'active') {
        // If Razorpay reports active and current_end has advanced:
        if (rzpSub.current_end) {
          const rzpPeriodEndIso = new Date(rzpSub.current_end * 1000).toISOString();
          if (sub.current_period_end && new Date(rzpPeriodEndIso).getTime() > new Date(sub.current_period_end).getTime()) {
            sub.current_period_start = rzpSub.current_start ? new Date(rzpSub.current_start * 1000).toISOString() : sub.current_period_end;
            sub.current_period_end = rzpPeriodEndIso;
            sub.status = 'active';
            sub.grace_period_start_at = null;
            sub.grace_period_end_at = null;
            sub.payment_failure_count = 0;
            updated = true;
          }
        }
      }

      if (updated) {
        sub.updated_at = new Date().toISOString();
        await store.saveBusinessSubscription(sub);
      }

      return {
        synced: true,
        gatewayStatus: rzpSub.status,
        message: `Gateway status verified: ${rzpSub.status}.`,
        subscription: sub,
      };
    } catch (err: any) {
      return {
        synced: false,
        message: `Gateway check skipped: ${err?.message || 'Gateway offline'}`,
        subscription: sub,
      };
    }
  }

  /**
   * Process Controlled Billing Reminders with Deduplication (Requirements 11, 12, 16, 18, 47)
   * Schedule: 7, 5, 3, 1 days before trial ends, trial expiry / payment due, grace day 1, 2, 3
   */
  public async processBillingReminders(businessId: string): Promise<void> {
    const access = await this.getBusinessSubscriptionAccess(businessId);
    const org = await store.getOrganization(businessId);
    const recipientEmail = org?.email;
    const companyName = org?.name || 'Your Company';
    const countryCode = (org?.business_country || org?.country || 'IN').toUpperCase();
    const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
    const priceDisplay = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedPrice : SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice;
    const pricePerMonth = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly;
    const locale = isIndia ? 'en-IN' : 'en-US';

    const trialEndDate = access.trialEndsAt
      ? new Date(access.trialEndsAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
      : 'soon';

    // 1. Trial Reminders (7, 5, 3, 1 days before trial ends)
    if (access.isTrial && access.daysRemainingInTrial > 0 && !access.isPaid) {
      const days = access.daysRemainingInTrial;
      if (days === 7 || days === 5 || days === 3 || days === 1) {
        const reminderKey = `reminder_${businessId}_trial_${days}d`;
        const alreadySent = await store.isReminderSent(businessId, reminderKey);
        if (!alreadySent) {
          // In-App Notification
          await store.addNotification({
            organizationId: businessId,
            title: `⚠️ Free Trial Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`,
            message: `Your free trial ends in ${days} ${days === 1 ? 'day' : 'days'}. After your trial: ${pricePerMonth}. Subscribe anytime to keep your access uninterrupted.`,
            type: 'EXPIRING',
          });

          // Email
          if (recipientEmail) {
            const { generateTrialReminderEmail } = await import('@/lib/email/service');
            const emailData = generateTrialReminderEmail({
              companyName,
              daysRemaining: days,
              trialEndDate,
              subscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com'}/billing`,
              planPrice: pricePerMonth,
              currency: isIndia ? 'INR' : 'USD',
              country: countryCode,
              isIndia,
            } as any);
            emailData.to = recipientEmail;
            await sendEmail(emailData).catch(console.error);
          }

          await store.recordReminderSent(businessId, reminderKey);
        }
      }
    }

    // 2. Trial Expiry / Payment Due Date
    if (access.isPaymentDue && !access.isPaid) {
      const reminderKey = `reminder_${businessId}_payment_due`;
      const alreadySent = await store.isReminderSent(businessId, reminderKey);
      if (!alreadySent) {
        await store.addNotification({
          organizationId: businessId,
          title: `⚠️ Payment Due — ${priceDisplay} Payment is Due`,
          message: `Your QuoteFlow 14-day free trial has concluded. ${priceDisplay} payment is due. Due date: ${trialEndDate}. Please pay now to continue using QuoteFlow.`,
          type: 'EXPIRING',
        });

        if (recipientEmail) {
          const { generatePaymentDueEmail } = await import('@/lib/email/service');
          const emailData = generatePaymentDueEmail({
            companyName,
            dueDate: trialEndDate,
            payUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com'}/billing`,
            planPrice: priceDisplay,
          } as any);
          emailData.to = recipientEmail;
          await sendEmail(emailData).catch(console.error);
        }

        await store.recordReminderSent(businessId, reminderKey);
      }
    }

    // 3. Grace Period Reminders (Day 1, Day 2, Day 3)
    if (access.isGracePeriod && !access.isPaid) {
      const daysLeft = access.graceDaysRemaining;
      const overdueDay = Math.min(3, Math.max(1, 4 - daysLeft));
      const reminderKey = `reminder_${businessId}_overdue_day_${overdueDay}`;
      const alreadySent = await store.isReminderSent(businessId, reminderKey);
      if (!alreadySent) {
        let title = `⚠️ Payment Overdue (Day ${overdueDay})`;
        let msg = `Your ${priceDisplay} QuoteFlow payment is overdue. Please complete payment to avoid interruption.`;

        if (overdueDay === 2) {
          title = `⚠️ Payment Overdue — 2 Days Overdue`;
          msg = `Your ${priceDisplay} payment is 2 days overdue. Please pay now to keep your account active.`;
        } else if (overdueDay === 3) {
          title = `🚨 Final Payment Reminder — 3 Days Overdue`;
          msg = `Your ${priceDisplay} QuoteFlow payment is 3 days overdue. Please complete payment today to avoid account restrictions.`;
        }

        await store.addNotification({
          organizationId: businessId,
          title,
          message: msg,
          type: 'EXPIRING',
        });

        if (recipientEmail) {
          const { generatePaymentDueEmail } = await import('@/lib/email/service');
          const emailData = generatePaymentDueEmail({
            companyName,
            dueDate: trialEndDate,
            overdueDays: overdueDay,
            payUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com'}/billing`,
          });
          emailData.to = recipientEmail;
          await sendEmail(emailData).catch(console.error);
        }

        await store.recordReminderSent(businessId, reminderKey);
      }
    }
  }

  /**
   * Dispatch On-Demand or Scheduled Trial Expiration Reminder for a specific business
   */
  public async sendTrialExpirationReminder(
    businessId: string,
    options?: {
      daysRemaining?: number;
      channel?: 'email' | 'whatsapp' | 'both';
      force?: boolean;
    }
  ): Promise<{
    success: boolean;
    emailSent: boolean;
    whatsappPrepared: boolean;
    message: string;
    waLink?: string;
    daysRemaining: number;
  }> {
    const access = await this.getBusinessSubscriptionAccess(businessId);
    const sub = await store.getBusinessSubscription(businessId);
    const org = await store.getOrganization(businessId);
    const channel = options?.channel || 'both';

    const calculatedDays = access.daysRemainingInTrial ?? (sub?.trial_end_at ? Math.max(0, Math.ceil((new Date(sub.trial_end_at).getTime() - Date.now()) / 86400000)) : 7);
    const daysRemaining = typeof options?.daysRemaining === 'number' ? Math.max(0, options.daysRemaining) : Math.max(0, calculatedDays);

    const companyName = org?.name || (sub as any)?.business_name || 'Valued Business';
    const recipientEmail = (org?.email || (org as any)?.contact_email || '').trim();
    const recipientPhone = ((org as any)?.phone || (org as any)?.whatsapp_number || (org as any)?.contact_phone || (org as any)?.billing_phone || '').replace(/[^\d]/g, '');

    const countryCode = (org?.business_country || (sub as any)?.billing_country || org?.country || 'IN').toUpperCase();
    const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';
    const renewUrl = `${appUrl}/billing`;

    let emailSent = false;
    let whatsappPrepared = false;
    let waLink: string | undefined = undefined;

    // 1. Dispatch Email Reminder
    if (channel === 'email' || channel === 'both') {
      if (recipientEmail && !recipientEmail.endsWith('@mobile.client') && !recipientEmail.endsWith('@client.local')) {
        const reminderKey = `reminder_${businessId}_trial_${daysRemaining}d`;
        const alreadySent = await store.isReminderSent(businessId, reminderKey);

        if (!alreadySent || options?.force) {
          const { generateTrialReminderEmail } = await import('@/lib/email/service');
          const emailPayload = generateTrialReminderEmail({
            companyName,
            daysRemaining,
            trialEndDate: access.trialEndsAt || sub?.trial_end_at || undefined,
            trialEndsAt: access.trialEndsAt || sub?.trial_end_at || undefined,
            subscribeUrl: renewUrl,
            planPrice: isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly,
            currency: isIndia ? 'INR' : 'USD',
            country: countryCode,
            isIndia,
          });
          emailPayload.to = recipientEmail;

          const res = await sendEmail(emailPayload);
          if (res.success) {
            emailSent = true;
            await store.recordReminderSent(businessId, reminderKey);
          }
        }
      }
    }

    // 2. Prepare / Dispatch WhatsApp Reminder
    if (channel === 'whatsapp' || channel === 'both') {
      const priceText = isIndia ? '₹149 / month' : '$12 / month';
      const reminderText = `⏳ *QuoteFlow Free Trial Reminder*\n\nHi ${companyName},\n\nYour QuoteFlow free trial ends in *${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}*.\n\nPlease upgrade your account to keep creating AI quotations, sending professional invoices, and managing your clients without interruption.\n\n👉 *Renew Now:* ${renewUrl}\n\nSimple & Affordable Plan:\n• QuoteFlow Pro: ${priceText}\n\nNeed help? Contact support at hello@blendandbold.com.`;

      const encodedMsg = encodeURIComponent(reminderText);
      waLink = recipientPhone ? `https://wa.me/${recipientPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

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
            whatsappPrepared = true;
          }
        } catch {
          // WhatsApp direct dispatch silent fallback to link
        }
      }
      whatsappPrepared = true;
      const waReminderKey = `reminder_${businessId}_trial_wa_${daysRemaining}d`;
      await store.recordReminderSent(businessId, waReminderKey);
    }

    // In-App Notification
    await store.addNotification({
      organizationId: businessId,
      title: `⏳ Free Trial Reminder — ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining`,
      message: `Your QuoteFlow free trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Please renew your plan to ensure continuous access.`,
      type: 'EXPIRING',
    });

    return {
      success: emailSent || whatsappPrepared,
      emailSent,
      whatsappPrepared,
      message: `Trial reminder (${daysRemaining} days remaining) processed. Email: ${emailSent ? 'Sent' : 'Skipped/Unavailable'}, WhatsApp: ${whatsappPrepared ? 'Ready' : 'Unavailable'}.`,
      waLink,
      daysRemaining,
    };
  }

  /**
   * Process Automated Trial Expiration Reminders across all registered businesses
   * Evaluates milestone days (7, 5, 3, 2, 1, 0 days remaining) with deduplication.
   */
  public async processAllAutomatedTrialReminders(options?: {
    forceMilestoneDays?: number[];
    simulateOnly?: boolean;
  }): Promise<{
    success: boolean;
    totalBusinessesEvaluated: number;
    trialBusinessesFound: number;
    remindersDispatched: number;
    remindersSkippedAlreadySent: number;
    details: Array<{
      businessId: string;
      businessName: string;
      email: string;
      daysRemaining: number;
      action: 'dispatched' | 'skipped_already_sent' | 'no_email' | 'not_milestone';
      reminderKey?: string;
    }>;
  }> {
    const milestones = options?.forceMilestoneDays || [7, 5, 3, 2, 1, 0];
    const { subscribers } = await store.getAllSubscribers({ limit: 10000 });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

    let trialBusinessesFound = 0;
    let remindersDispatched = 0;
    let remindersSkippedAlreadySent = 0;
    const details: any[] = [];

    for (const sub of subscribers) {
      try {
        const businessId = sub.business_id;
        const access = await this.getBusinessSubscriptionAccess(businessId);

        // Only evaluate businesses currently on free trial and not paid
        if (!access.isTrial || access.isPaid) {
          continue;
        }

        trialBusinessesFound++;
        const org = await store.getOrganization(businessId);
        const recipientEmail = (org?.email || (org as any)?.contact_email || '').trim();
        const businessName = org?.name || (sub as any).business_name || 'Valued Business';
        const daysRemaining = access.daysRemainingInTrial ?? 0;

        if (!milestones.includes(daysRemaining)) {
          details.push({
            businessId,
            businessName,
            email: recipientEmail,
            daysRemaining,
            action: 'not_milestone',
          });
          continue;
        }

        if (!recipientEmail || recipientEmail.endsWith('@mobile.client') || recipientEmail.endsWith('@client.local')) {
          details.push({
            businessId,
            businessName,
            email: recipientEmail || 'None',
            daysRemaining,
            action: 'no_email',
          });
          continue;
        }

        const reminderKey = `reminder_${businessId}_trial_${daysRemaining}d`;
        const alreadySent = await store.isReminderSent(businessId, reminderKey);

        if (alreadySent) {
          remindersSkippedAlreadySent++;
          details.push({
            businessId,
            businessName,
            email: recipientEmail,
            daysRemaining,
            action: 'skipped_already_sent',
            reminderKey,
          });
          continue;
        }

        if (!options?.simulateOnly) {
          const countryCode = (org?.business_country || (sub as any)?.billing_country || org?.country || 'IN').toUpperCase();
          const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
          const { generateTrialReminderEmail } = await import('@/lib/email/service');

          const emailPayload = generateTrialReminderEmail({
            companyName: businessName,
            daysRemaining,
            trialEndDate: access.trialEndsAt || sub.trial_end_at || undefined,
            trialEndsAt: access.trialEndsAt || sub.trial_end_at || undefined,
            subscribeUrl: `${appUrl}/billing`,
            planPrice: isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly,
            currency: isIndia ? 'INR' : 'USD',
            country: countryCode,
            isIndia,
          });
          emailPayload.to = recipientEmail;

          await sendEmail(emailPayload);

          await store.addNotification({
            organizationId: businessId,
            title: `⏳ Free Trial Reminder — ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'} Remaining`,
            message: `Your QuoteFlow free trial concludes in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Please renew your subscription to maintain uninterrupted access.`,
            type: 'EXPIRING',
          });

          await store.recordReminderSent(businessId, reminderKey);
        }

        remindersDispatched++;
        details.push({
          businessId,
          businessName,
          email: recipientEmail,
          daysRemaining,
          action: 'dispatched',
          reminderKey,
        });
      } catch (err) {
        console.error(`[Automated Trial Reminders] Error processing business ${sub.business_id}:`, err);
      }
    }

    return {
      success: true,
      totalBusinessesEvaluated: subscribers.length,
      trialBusinessesFound,
      remindersDispatched,
      remindersSkippedAlreadySent,
      details,
    };
  }

  /**
   * Apply Admin Offer to a Business (Requirements 27, 28, 44)
   * Types: Percentage discount, Fixed amount discount, Free months, Special monthly rate
   * Safety check: Applies to future billing cycles only! Never modifies past captured payments.
   */
  public async applyOffer(params: {
    businessId: string;
    offerType: 'percentage' | 'fixed' | 'free_months' | 'special_rate';
    value: number;
    durationMonths?: number;
    reason: string;
    adminUserId: string;
    adminEmail?: string;
  }): Promise<{ success: boolean; message: string; sub: BusinessSubscription }> {
    const sub = await store.getBusinessSubscription(params.businessId);
    if (!sub) throw new Error('Business subscription not found');

    const duration = params.durationMonths || 1;
    let description = '';
    let adjustedAmount = sub.amount;

    if (params.offerType === 'percentage') {
      const discountPct = Math.min(100, Math.max(1, params.value));
      adjustedAmount = Math.round(SUBSCRIPTION_CONFIG.INDIA.amountPaise * (1 - discountPct / 100));
      description = `${discountPct}% off for ${duration} month(s)`;
    } else if (params.offerType === 'fixed') {
      const discountPaise = params.value * 100;
      adjustedAmount = Math.max(0, SUBSCRIPTION_CONFIG.INDIA.amountPaise - discountPaise);
      description = `₹${params.value} off for ${duration} month(s)`;
    } else if (params.offerType === 'free_months') {
      adjustedAmount = 0;
      description = `${params.value} free month(s)`;
    } else if (params.offerType === 'special_rate') {
      adjustedAmount = Math.round(params.value * 100);
      description = `Special rate ₹${params.value}/month for ${duration} month(s)`;
    }

    const offer: any = {
      id: crypto.randomUUID(),
      type: params.offerType,
      value: params.value,
      duration_months: duration,
      reason: params.reason,
      applied_by: params.adminEmail || params.adminUserId,
      applied_at: new Date().toISOString(),
      previous_amount: sub.amount,
      adjusted_amount: adjustedAmount,
      description,
    };

    (sub as any).admin_offer = offer;
    sub.amount = adjustedAmount;
    sub.updated_at = new Date().toISOString();

    await store.saveBusinessSubscription(sub);

    // Audit log
    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: params.adminUserId,
      admin_email: params.adminEmail || null,
      action: 'APPLY_OFFER',
      target_type: 'subscription',
      target_id: sub.id,
      metadata: {
        business_id: params.businessId,
        offer,
        reason: params.reason,
      },
      created_at: new Date().toISOString(),
    });

    // Notify business
    await store.addNotification({
      organizationId: params.businessId,
      title: 'Special Offer Applied to Your Account',
      message: `An exclusive offer (${description}) has been applied to your future QuoteFlow billing cycles. Reason: ${params.reason}`,
      type: 'APPROVED',
    });

    return {
      success: true,
      message: `Offer "${description}" successfully applied to upcoming billing cycles.`,
      sub,
    };
  }

  /**
   * Manually activate QuoteFlow Pro plan for a business.
   * Enables developer admin to activate QuoteFlow Pro ₹99 when Razorpay had network issues,
   * or payment was credited directly to developer Razorpay account but automated webhook failed.
   */
  public async manuallyActivateProPlan(params: {
    businessId: string;
    paymentReference?: string;
    reason?: string;
    durationDays?: number;
    adminUserId?: string;
    adminEmail?: string;
  }): Promise<{ success: boolean; message: string; sub: BusinessSubscription }> {
    let sub = await store.getBusinessSubscription(params.businessId);
    if (!sub) {
      sub = await this.startFreeTrial(params.businessId);
    }

    const org = await store.getOrganization(params.businessId);
    const countryCode = (org?.business_country || (sub as any).billing_country || org?.country || 'IN').toUpperCase();
    const isIndia = countryCode === 'IN' || (org?.billing_currency || 'INR') === 'INR';
    const amount = isIndia ? SUBSCRIPTION_CONFIG.INDIA.amountPaise : SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice;
    const currency = isIndia ? 'INR' : 'USD';
    const plan = isIndia ? DEFAULT_PLANS.PRO_149 : ((DEFAULT_PLANS as any).PRO_USD_12 || {
      id: 'plan_international_usd_12',
      name: SUBSCRIPTION_CONFIG.GLOBAL.name,
      amount: SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice,
      currency: 'USD',
      interval: 'month',
    });

    const now = new Date();
    const durationDays = params.durationDays && params.durationDays > 0 ? params.durationDays : 30;
    const periodEnd = new Date(now.getTime() + durationDays * 86400000);
    const payRef = params.paymentReference?.trim() || `pay_manual_${Date.now().toString(36)}`;

    sub.plan = plan;
    sub.plan_id = plan.id;
    sub.amount = amount;
    sub.currency = currency;
    sub.status = 'active';
    (sub as any).payment_status = 'paid';
    sub.is_trial_prepaid = false;
    sub.plan_start_mode = 'immediate';
    sub.current_period_start = now.toISOString();
    sub.current_period_end = periodEnd.toISOString();
    sub.next_charge_at = periodEnd.toISOString();
    sub.last_payment_id = payRef;
    sub.last_payment_at = now.toISOString();
    (sub as any).payment_provider = 'manual';
    (sub as any).provider = 'manual';
    (sub as any).billing_currency = currency;
    (sub as any).billing_region = isIndia ? 'INDIA' : 'INTERNATIONAL';
    (sub as any).billing_country = countryCode;
    sub.updated_at = now.toISOString();

    await store.saveBusinessSubscription(sub);

    // Save payment record
    const payment: SubscriptionPayment = {
      id: crypto.randomUUID(),
      business_id: params.businessId,
      subscription_id: sub.id,
      razorpay_payment_id: isIndia ? payRef : undefined,
      provider_payment_id: payRef,
      razorpay_subscription_id: sub.razorpay_subscription_id || null,
      razorpay_invoice_id: `inv_manual_${Date.now().toString(36)}`,
      amount: amount,
      currency: currency,
      status: 'captured',
      payment_method: 'manual_verification',
      failure_reason: null,
      paid_at: now.toISOString(),
      created_at: now.toISOString(),
      provider: 'manual',
    };
    await store.saveSubscriptionPayment(payment);

    // Audit log
    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: params.adminUserId || 'developer-admin',
      admin_email: params.adminEmail || 'developer-admin@quoteflow.in',
      action: 'MANUAL_ACTIVATE_PRO',
      target_type: 'subscription',
      target_id: sub.id,
      metadata: {
        business_id: params.businessId,
        payment_reference: payRef,
        country: countryCode,
        currency,
        amount,
        reason: params.reason || 'Manual activation via Developer Dashboard (manual verification)',
        duration_days: durationDays,
      },
      created_at: now.toISOString(),
    });

    const priceLabel = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly;
    const dateFormatted = periodEnd.toLocaleDateString(isIndia ? 'en-IN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    // Notify business
    await store.addNotification({
      organizationId: params.businessId,
      title: 'QuoteFlow Pro Activated!',
      message: `Your QuoteFlow Pro subscription (${priceLabel}) has been activated successfully by support engineering. Valid until ${dateFormatted}.`,
      type: 'APPROVED',
    });

    return {
      success: true,
      message: `QuoteFlow Pro successfully activated for business until ${dateFormatted}.`,
      sub,
    };
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
    await syncCloudAdminConfig();
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

    const hasValidPeriod = sub.current_period_end ? new Date(sub.current_period_end).getTime() > Date.now() : false;
    if ((sub.cancel_at_period_end || sub.status === 'cancelled') && (sub.status === 'active' || hasValidPeriod)) {
      sub.cancel_at_period_end = false;
      sub.cancelled_at = null;
      sub.cancellation_reason = null;
      sub.status = 'active';
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

  /**
   * Update Plan Activation Timing: Start Immediately vs After Free Trial
   */
  public async updatePlanActivationSchedule(params: {
    businessId: string;
    mode: 'immediate' | 'after_trial';
  }): Promise<BusinessSubscription> {
    const sub = await store.getBusinessSubscription(params.businessId);
    if (!sub) throw new Error('Subscription not found for this business.');

    const now = new Date();
    const mode = params.mode;

    if (mode === 'immediate') {
      sub.plan_start_mode = 'immediate';
      sub.status = 'active';
      sub.is_trial_prepaid = false;
      const start = sub.last_payment_at ? new Date(sub.last_payment_at) : now;
      sub.current_period_start = start.toISOString();
      sub.current_period_end = new Date(start.getTime() + 30 * 86400000).toISOString();
      sub.next_charge_at = sub.current_period_end;
    } else {
      sub.plan_start_mode = 'after_trial';
      sub.is_trial_prepaid = true;
      const trialEndTime = sub.trial_end_at
        ? new Date(sub.trial_end_at).getTime()
        : now.getTime() + 30 * 86400000;
      sub.current_period_start = new Date(trialEndTime).toISOString();
      sub.current_period_end = new Date(trialEndTime + 30 * 86400000).toISOString();
      sub.next_charge_at = new Date(trialEndTime).toISOString();
      sub.status = 'active'; // keep active with scheduled next charge
    }
    sub.updated_at = now.toISOString();

    await store.saveBusinessSubscription(sub);

    await store.addNotification({
      organizationId: params.businessId,
      title: 'Plan Activation Schedule Updated',
      message:
        mode === 'immediate'
          ? 'Your QuoteFlow plan is now active immediately starting from today.'
          : `Your plan is scheduled to begin automatically after your free trial ends on ${new Date(
              sub.next_charge_at!
            ).toLocaleDateString()}.`,
      type: 'APPROVED',
    });

    return sub;
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
      status: (params as any).status || 'open',
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
      ticket.status = 'unread'; // Immediately alerts developer in Developer Dashboard like WhatsApp unread message
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
          mime_type: (att as any).mime_type || (att as any).file_type || 'application/octet-stream',
          file_name: att.file_name,
          file_size: att.file_size,
          created_at: now,
        });
      }
    }

    // Dispatch email notifications via Resend for email-like messaging
    try {
      const { sendEmail } = await import('@/lib/email/service');
      const recipientEmail = ticket.creator_email || (ticket as any).contact_email;
      const recipientName = ticket.creator_name || (ticket as any).contact_name || 'Customer';

      if (params.senderType === 'business') {
        // Send email to Developer Admin
        const { getDeveloperAdminEmail } = await import('@/lib/billing/dev-admin-auth');
        const { escapeHtml } = await import('@/lib/utils/html-escape');
        const adminRecipient = getDeveloperAdminEmail() || process.env.ADMIN_EMAIL;
        if (adminRecipient) {
          const safeBizName = escapeHtml(ticket.business_name || 'Customer');
          const safeSubject = escapeHtml(ticket.subject || '');
          const safeMessage = escapeHtml(params.message || '').replace(/\n/g, '<br/>');
          const safeRecipientEmail = escapeHtml(recipientEmail || 'no-email');

          await sendEmail({
            to: adminRecipient,
            subject: `[QuoteFlow Support] New message on Ticket #${ticket.ticket_number}: ${ticket.subject}`,
            html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
              <h2>Support Ticket Update: #${ticket.ticket_number}</h2>
              <p><strong>Business:</strong> ${safeBizName} (${safeRecipientEmail})</p>
              <p><strong>Subject:</strong> ${safeSubject}</p>
              <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0;">
                ${safeMessage}
              </div>
              <p><a href="https://www.blendandbold.com/admin" style="display: inline-block; background: #4f46e5; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold;">View in Developer Admin</a></p>
            </div>`,
          }).catch((e) => console.warn('Email dispatch to dev error:', e));
        }
      } else if (params.senderType === 'developer' && recipientEmail) {
        // Send email to Customer
        await sendEmail({
          to: recipientEmail,
          subject: `[QuoteFlow Support] Response to Ticket #${ticket.ticket_number}: ${ticket.subject}`,
          html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
            <h2>QuoteFlow Support Response</h2>
            <p>Hi ${recipientName},</p>
            <p>Our team has replied to your support request (<strong>Ticket #${ticket.ticket_number}: ${ticket.subject}</strong>):</p>
            <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0;">
              ${params.message.replace(/\n/g, '<br/>')}
            </div>
            <p><a href="https://www.blendandbold.com/settings?tab=support" style="display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold;">View &amp; Reply in QuoteFlow</a></p>
          </div>`,
        }).catch((e) => console.warn('Email dispatch to user error:', e));
      }
    } catch (e) {
      console.warn('Ticket notification error:', e);
    }

    return msg;
  }
}

export const subscriptionService = new SubscriptionService();
