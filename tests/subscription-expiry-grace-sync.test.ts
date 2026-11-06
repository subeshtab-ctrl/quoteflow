import { describe, it, expect } from 'vitest';
import { subscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';

describe('Subscription Expiry, Grace Period & Bank Autopay Revocation Sync Tests', () => {
  it('detects cycle expiration and transitions from active to grace_period with 3-day grace', async () => {
    const bizId = crypto.randomUUID();
    await subscriptionService.startFreeTrial(bizId);

    // Simulate an active subscription that expired yesterday (4 Nov 2026)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const lastMonth = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();

    const sub = (await store.getBusinessSubscription(bizId))!;
    sub.status = 'active';
    sub.last_payment_id = 'pay_test_past_month';
    sub.last_payment_at = lastMonth;
    sub.current_period_start = lastMonth;
    sub.current_period_end = yesterday;
    await store.saveBusinessSubscription(sub);

    // Evaluate subscription access
    const access = await subscriptionService.getBusinessSubscriptionAccess(bizId);

    // Pro access should still be allowed during the 3-day grace period
    expect(access.allowed).toBe(true);
    expect(access.isGracePeriod).toBe(true);
    expect(access.isPaid).toBe(false);
    expect(access.isRestricted).toBe(false);
    expect(access.graceDaysRemaining).toBeGreaterThanOrEqual(1);
    expect(access.graceDaysRemaining).toBeLessThanOrEqual(3);
    expect(access.warningMessage).toContain('Subscription Renewal Pending');
    expect(access.warningMessage).toContain('grace period');
  });

  it('restricts access to payment_overdue when past the 3-day grace period', async () => {
    const bizId = crypto.randomUUID();
    await subscriptionService.startFreeTrial(bizId);

    // Simulate an active subscription that expired 5 days ago (beyond 3-day grace)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    const lastMonth = new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString();

    const sub = (await store.getBusinessSubscription(bizId))!;
    sub.status = 'active';
    sub.last_payment_id = 'pay_test_overdue';
    sub.last_payment_at = lastMonth;
    sub.current_period_start = lastMonth;
    sub.current_period_end = fiveDaysAgo;
    await store.saveBusinessSubscription(sub);

    const access = await subscriptionService.getBusinessSubscriptionAccess(bizId);

    expect(access.allowed).toBe(false);
    expect(access.isGracePeriod).toBe(false);
    expect(access.isPaymentOverdue).toBe(true);
    expect(access.isRestricted).toBe(true);
    expect(access.accountAccess).toBe('restricted');
    expect(access.warningMessage).toContain('QuoteFlow Pro Overdue');
  });

  it('restores full active access when renewal payment succeeds', async () => {
    const bizId = crypto.randomUUID();
    await subscriptionService.startFreeTrial(bizId);

    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const sub = (await store.getBusinessSubscription(bizId))!;
    sub.status = 'active';
    sub.last_payment_id = 'pay_old';
    sub.current_period_end = yesterday;
    sub.razorpay_subscription_id = 'sub_test_renewal';
    await store.saveBusinessSubscription(sub);

    // Process renewal payment
    await subscriptionService.handleSuccessfulPayment({
      subscriptionId: 'sub_test_renewal',
      paymentId: 'pay_renewed_now',
      amount: 14900,
      businessId: bizId,
    });

    const access = await subscriptionService.getBusinessSubscriptionAccess(bizId);

    expect(access.allowed).toBe(true);
    expect(access.isGracePeriod).toBe(false);
    expect(access.isPaid).toBe(true);
    expect(access.status).toBe('active');
    expect(new Date(access.activeUntil!).getTime()).toBeGreaterThan(Date.now());
  });

  it('updates subscription when bank mandate is cancelled via gateway sync', async () => {
    const bizId = crypto.randomUUID();
    await subscriptionService.startFreeTrial(bizId);

    const sub = (await store.getBusinessSubscription(bizId))!;
    sub.status = 'active';
    sub.razorpay_subscription_id = 'sub_mock_cancelled_at_bank';
    await store.saveBusinessSubscription(sub);

    // Mock Razorpay returning cancelled
    const { razorpayService } = await import('@/lib/billing/razorpay');
    const origGetSub = razorpayService.getSubscription;
    (razorpayService as any).getSubscription = async () => ({
      id: 'sub_mock_cancelled_at_bank',
      status: 'cancelled',
      current_end: Math.floor(Date.now() / 1000) - 100,
    });

    try {
      const syncResult = await subscriptionService.syncBusinessSubscriptionWithGateway(bizId);
      expect(syncResult.synced).toBe(true);
      expect(syncResult.gatewayStatus).toBe('cancelled');

      const updatedSub = await store.getBusinessSubscription(bizId);
      expect(updatedSub?.status).toBe('cancelled');
      expect(updatedSub?.cancellation_reason).toContain('bank or UPI app');
    } finally {
      (razorpayService as any).getSubscription = origGetSub;
    }
  });
});
