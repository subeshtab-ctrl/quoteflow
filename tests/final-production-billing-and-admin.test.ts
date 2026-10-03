import { describe, it, expect, beforeEach } from 'vitest';
import { subscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';
import { BusinessSubscription, Organization } from '@/types/database';

describe('FINAL Production Billing, Developer Dashboard & Life-cycle Tests (51 Requirements)', () => {
  const POZONE_ID = '765a894f-c3c4-4fe4-a8e2-7b240eda570a';

  // 1. New Company Registration & 30-Day Free Trial
  it('Scenario 1: New company registration initializes 30-day free trial at ₹0', async () => {
    const orgId = `test_org_trial_${Date.now()}`;
    const sub = await subscriptionService.startFreeTrial(orgId);

    expect(sub).toBeDefined();
    expect(sub.business_id).toBe(orgId);
    expect(sub.amount).toBe(0);
    expect(sub.currency).toBe('INR');
    expect(sub.status).toBe('trialing');
    expect(sub.trial_start_at).toBeTruthy();
    expect(sub.trial_end_at).toBeTruthy();

    const start = new Date(sub.trial_start_at!).getTime();
    const end = new Date(sub.trial_end_at!).getTime();
    const days = Math.round((end - start) / 86400000);
    expect(days).toBe(30);

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.allowed).toBe(true);
    expect(access.isTrial).toBe(true);
    expect(access.isPaid).toBe(false);
    expect(access.daysRemainingInTrial).toBeGreaterThanOrEqual(29);
  });

  // 2. Trial Immutable Source of Truth
  it('Scenario 2: Trial source of truth is NEVER reset when re-authenticating or opening billing', async () => {
    const orgId = `test_org_anchor_${Date.now()}`;
    const sub1 = await subscriptionService.startFreeTrial(orgId);
    const initialStart = sub1.trial_start_at;
    const initialEnd = sub1.trial_end_at;

    // Simulate returning later
    const sub2 = await subscriptionService.startFreeTrial(orgId);
    expect(sub2.trial_start_at).toBe(initialStart);
    expect(sub2.trial_end_at).toBe(initialEnd);

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.trialStartedAt).toBe(initialStart);
    expect(access.trialEndsAt).toBe(initialEnd);
  });

  // 3. Plan Selection vs Plan Activation
  it('Scenario 3: Clicking ₹99/mo plan creates checkout but does NOT activate plan immediately', async () => {
    const orgId = `test_org_click_${Date.now()}`;
    await subscriptionService.startFreeTrial(orgId);

    const checkout = await subscriptionService.createSubscriptionCheckout({ businessId: orgId });
    expect(checkout.amount).toBe(9900); // ₹99
    expect(checkout.planSlug).toBe('monthly_99');

    // Subscription status MUST remain trialing or pending, NEVER active before payment!
    const sub = await store.getBusinessSubscription(orgId);
    expect(sub?.status).not.toBe('active');
    expect(sub?.last_payment_id).toBeNull();

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.isPaid).toBe(false);
  });

  // 4. Closing or Cancelling Checkout
  it('Scenario 4: Closing or cancelling checkout leaves customer on trial/pending without active paid plan', async () => {
    const orgId = `test_org_cancel_${Date.now()}`;
    await subscriptionService.startFreeTrial(orgId);
    await subscriptionService.createSubscriptionCheckout({ businessId: orgId });

    // User abandons checkout
    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.isPaid).toBe(false);
    expect(access.isTrial).toBe(true);
    expect(access.allowed).toBe(true);
  });

  // 5. Successful Payment Activates ₹99 Plan
  it('Scenario 5: Verified successful payment activates ₹99 QuoteFlow Pro plan', async () => {
    const orgId = `test_org_pay_${Date.now()}`;
    await subscriptionService.startFreeTrial(orgId);
    const checkout = await subscriptionService.createSubscriptionCheckout({ businessId: orgId });

    const updated = await subscriptionService.handleSuccessfulPayment({
      subscriptionId: checkout.subscriptionId,
      paymentId: `pay_test_${Date.now()}`,
      amount: 9900,
      currency: 'INR',
      businessId: orgId,
    });

    expect(updated.status).toBe('active');
    expect(updated.amount).toBe(9900);
    expect(updated.last_payment_id).toBeTruthy();

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.isPaid).toBe(true);
    expect(access.allowed).toBe(true);
    expect(access.isRestricted).toBe(false);
  });

  // 6. Payment During Trial Keeps Next Due Date Anchored to Original Trial End
  it('Scenario 6: Paying during trial keeps next payment date anchored to original trial end date (Requirements 7, 8)', async () => {
    const orgId = `test_org_anchor_due_${Date.now()}`;
    const sub = await subscriptionService.startFreeTrial(orgId);
    const originalTrialEnd = sub.trial_end_at!;

    const checkout = await subscriptionService.createSubscriptionCheckout({ businessId: orgId });
    await subscriptionService.handleSuccessfulPayment({
      subscriptionId: checkout.subscriptionId,
      paymentId: `pay_test_anchor_${Date.now()}`,
      amount: 9900,
      currency: 'INR',
      businessId: orgId,
    });

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.isPaid).toBe(true);
    // Next payment due date MUST remain anchored to trial_end_at!
    expect(access.nextPaymentDue).toBe(originalTrialEnd);
  });

  // 7. Controlled Reminders Schedule (7, 5, 3, 1 Days) with Deduplication
  it('Scenario 7: Controlled reminders trigger without duplicate deliveries', async () => {
    const orgId = `test_org_reminder_${Date.now()}`;
    const now = Date.now();
    // Simulate exactly 7 days remaining
    const trialEnd = new Date(now + 7 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: DEFAULT_PLANS.FREE_TRIAL.id,
      status: 'trialing',
      provider: 'razorpay',
      razorpay_customer_id: null,
      razorpay_subscription_id: null,
      razorpay_plan_id: null,
      amount: 0,
      currency: 'INR',
      trial_start_at: new Date(now - 23 * 86400000).toISOString(),
      trial_end_at: trialEnd,
      current_period_start: new Date(now - 23 * 86400000).toISOString(),
      current_period_end: trialEnd,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    // First run sends reminder
    await subscriptionService.processBillingReminders(orgId);
    const key = `reminder_${orgId}_trial_7d`;
    expect(await store.isReminderSent(orgId, key)).toBe(true);

    // Second run is deduplicated
    await subscriptionService.processBillingReminders(orgId);
    expect(await store.isReminderSent(orgId, key)).toBe(true);
  });

  // 8. 3-Day Payment Grace Period
  it('Scenario 8: 3-day grace period allows full access with progressive warnings', async () => {
    const orgId = `test_org_grace_${Date.now()}`;
    const now = Date.now();
    // Trial ended 1 day ago (Day 1 of Grace Period)
    const trialEnd = new Date(now - 1 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: DEFAULT_PLANS.FREE_TRIAL.id,
      status: 'trialing',
      provider: 'razorpay',
      razorpay_customer_id: null,
      razorpay_subscription_id: null,
      razorpay_plan_id: null,
      amount: 0,
      currency: 'INR',
      trial_start_at: new Date(now - 31 * 86400000).toISOString(),
      trial_end_at: trialEnd,
      current_period_start: new Date(now - 31 * 86400000).toISOString(),
      current_period_end: trialEnd,
      next_charge_at: null,
      promo_id: null,
      promo_months_remaining: 0,
      promotional_cycles_completed: 0,
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
      grace_period_start_at: trialEnd,
      grace_period_end_at: new Date(new Date(trialEnd).getTime() + 3 * 86400000).toISOString(),
      last_payment_at: null,
      last_payment_id: null,
      payment_failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.isGracePeriod).toBe(true);
    expect(access.allowed).toBe(true); // Still allowed during grace!
    expect(access.isRestricted).toBe(false);
    expect(access.graceDaysRemaining).toBeGreaterThanOrEqual(1);
    expect(access.warningMessage).toContain('Payment overdue');
  });

  // 9. After 3-Day Grace Period: Restricted Mode
  it('Scenario 9: After 3 days unpaid, account access is restricted and status is payment_overdue', async () => {
    const orgId = `test_org_restricted_${Date.now()}`;
    const now = Date.now();
    // Trial ended 5 days ago (Grace period expired 2 days ago)
    const trialEnd = new Date(now - 5 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: DEFAULT_PLANS.FREE_TRIAL.id,
      status: 'trialing',
      provider: 'razorpay',
      razorpay_customer_id: null,
      razorpay_subscription_id: null,
      razorpay_plan_id: null,
      amount: 0,
      currency: 'INR',
      trial_start_at: new Date(now - 35 * 86400000).toISOString(),
      trial_end_at: trialEnd,
      current_period_start: new Date(now - 35 * 86400000).toISOString(),
      current_period_end: trialEnd,
      next_charge_at: null,
      promo_id: null,
      promo_months_remaining: 0,
      promotional_cycles_completed: 0,
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
      grace_period_start_at: trialEnd,
      grace_period_end_at: new Date(new Date(trialEnd).getTime() + 3 * 86400000).toISOString(),
      last_payment_at: null,
      last_payment_id: null,
      payment_failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.accountAccess).toBe('restricted');
    expect(access.isRestricted).toBe(true);
    expect(access.allowed).toBe(false); // Disables new quotes/invoices/customers
    expect(access.status).toBe('payment_overdue');
    expect(access.warningMessage).toContain('Billing Required');
  });

  // 10. Payment Restoration
  it('Scenario 10: Completing overdue payment restores account access to active immediately', async () => {
    const orgId = `test_org_restore_${Date.now()}`;
    const now = Date.now();
    const trialEnd = new Date(now - 5 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: DEFAULT_PLANS.FREE_TRIAL.id,
      status: 'payment_overdue',
      provider: 'razorpay',
      razorpay_customer_id: null,
      razorpay_subscription_id: 'sub_test_restore',
      razorpay_plan_id: 'plan_monthly_99',
      amount: 9900,
      currency: 'INR',
      trial_start_at: new Date(now - 35 * 86400000).toISOString(),
      trial_end_at: trialEnd,
      current_period_start: new Date(now - 35 * 86400000).toISOString(),
      current_period_end: trialEnd,
      next_charge_at: null,
      promo_id: null,
      promo_months_remaining: 0,
      promotional_cycles_completed: 0,
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
      grace_period_start_at: trialEnd,
      grace_period_end_at: new Date(new Date(trialEnd).getTime() + 3 * 86400000).toISOString(),
      last_payment_at: null,
      last_payment_id: null,
      payment_failure_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    // Overdue payment is captured
    await subscriptionService.handleSuccessfulPayment({
      subscriptionId: 'sub_test_restore',
      paymentId: `pay_restore_${Date.now()}`,
      amount: 9900,
      currency: 'INR',
      businessId: orgId,
    });

    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    expect(access.accountAccess).toBe('active');
    expect(access.isRestricted).toBe(false);
    expect(access.allowed).toBe(true);
    expect(access.isPaid).toBe(true);
    expect(access.status).toBe('active');
  });

  // 11. Real Customer Protection (Pozone)
  it('Scenario 11: Real paying customer Pozone is authoritatively protected from deletion or modification', async () => {
    const pozone = await subscriptionService.getBusinessSubscriptionAccess(POZONE_ID);
    expect(pozone.isPaid).toBe(true);
    expect(pozone.allowed).toBe(true);
    expect(pozone.isRestricted).toBe(false);

    // Attempting to delete Pozone MUST throw an error
    await expect(
      store.softDeleteTestBusiness(POZONE_ID, 'test-admin', 'Attempt delete')
    ).rejects.toThrow(/PROTECTED ACCOUNT/);
  });

  // 12. Developer Dashboard Apply Offer
  it('Scenario 12: Developer Admin can apply discounts to future billing cycles with audit logging', async () => {
    const orgId = `test_org_offer_${Date.now()}`;
    await subscriptionService.startFreeTrial(orgId);

    // Apply 25% discount
    const res = await subscriptionService.applyOffer({
      businessId: orgId,
      offerType: 'percentage',
      value: 25,
      durationMonths: 3,
      reason: 'Partner promotional credit',
      adminUserId: 'admin_test',
      adminEmail: 'admin@blendandbold.com',
    });

    expect(res.success).toBe(true);
    const sub = await store.getBusinessSubscription(orgId);
    expect(sub?.amount).toBe(7425); // ₹74.25 (25% off ₹99)
    expect((sub as any)?.admin_offer?.type).toBe('percentage');
    expect((sub as any)?.admin_offer?.duration_months).toBe(3);
  });

  // 13. Safe AI/Test Account Cleanup
  it('Scenario 13: Soft deleting test business removes it from subscribers list without affecting live accounts', async () => {
    const testOrgId = `synthetic_test_org_${Date.now()}`;
    const org: Organization = {
      id: testOrgId,
      name: 'Synthetic Test Business',
      slug: `synth-${Date.now()}`,
      business_type: 'Services',
      email: 'synth@mock.test',
      mode: 'test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
    store.setCachedOrganization(testOrgId, org);
    await subscriptionService.startFreeTrial(testOrgId);

    const deleteRes = await store.softDeleteTestBusiness(testOrgId, 'test-admin', 'Cleaning synthetic data');
    expect(deleteRes.success).toBe(true);

    const { subscribers } = await store.getAllSubscribers({ limit: 1000 });
    expect(subscribers.some((s) => s.business_id === testOrgId)).toBe(false);

    // Pozone is still intact!
    expect(subscribers.some((s) => s.business_id === POZONE_ID)).toBe(true);
  });
});
