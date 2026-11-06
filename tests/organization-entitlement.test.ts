import { describe, it, expect } from 'vitest';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';
import crypto from 'crypto';
import { BusinessSubscription } from '@/types/database';

describe('QuoteFlow Organization Subscription & Entitlement Architecture', () => {
  // Test A: Staff created today inherits admin's expiry tomorrow.
  it('Test A: Staff created today inherits organization expiry tomorrow (no +14 day extension)', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();
    const tomorrow = new Date(now + 1 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000001',
      status: 'trialing',
      provider: 'razorpay',
      amount: 0,
      currency: 'INR',
      trial_start_at: new Date(now - 13 * 86400000).toISOString(),
      trial_end_at: tomorrow,
      current_period_start: new Date(now - 13 * 86400000).toISOString(),
      current_period_end: tomorrow,
      cancel_at_period_end: false,
      payment_failure_count: 0,
      promotional_cycles_completed: 0,
      promo_months_remaining: 0,
      created_at: new Date(now - 13 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    // Organization entitlement
    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    expect(entitlement.plan).toBe('PRO');
    expect(entitlement.status).toBe('TRIALING');
    expect(entitlement.hasAccess).toBe(true);
    expect(entitlement.expiresAt).toBe(tomorrow);
    expect(entitlement.daysRemaining).toBeLessThanOrEqual(2);

    // Staff added today inherits the organization's exact entitlement and expiry
    const staffUserId = crypto.randomUUID();
    const staffAccess = await subscriptionService.checkUserAccess(staffUserId, orgId);
    expect(staffAccess.entitlement.expiresAt).toBe(tomorrow);
    expect(staffAccess.entitlement.daysRemaining).toBeLessThanOrEqual(2);
    expect(staffAccess.entitlement.hasAccess).toBe(true);
  });

  // Test B: Admin trial expired; adding staff grants no new trial.
  it('Test B: Organization trial expired; adding staff grants no new trial', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();
    const expiredDate = new Date(now - 6 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000001',
      status: 'expired',
      provider: 'razorpay',
      amount: 0,
      currency: 'INR',
      trial_start_at: new Date(now - 20 * 86400000).toISOString(),
      trial_end_at: expiredDate,
      grace_period_end_at: new Date(now - 3 * 86400000).toISOString(),
      current_period_start: new Date(now - 20 * 86400000).toISOString(),
      current_period_end: expiredDate,
      cancel_at_period_end: false,
      payment_failure_count: 0,
      promotional_cycles_completed: 0,
      promo_months_remaining: 0,
      created_at: new Date(now - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    expect(entitlement.status).toBe('EXPIRED');
    expect(entitlement.hasAccess).toBe(false);

    // Staff joining this expired organization must also have no access (no new trial granted)
    const newStaffUserId = crypto.randomUUID();
    const staffAccess = await subscriptionService.checkUserAccess(newStaffUserId, orgId);
    expect(staffAccess.hasAccess).toBe(false);
    expect(staffAccess.entitlement.hasAccess).toBe(false);
    expect(staffAccess.entitlement.status).toBe('EXPIRED');
  });

  // Test C: Org has 10 days; new staff receives only remaining 10 days.
  it('Test C: Org has 10 days left; new staff receives only remaining 10 days', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();
    const tenDaysFromNow = new Date(now + 10 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000001',
      status: 'trialing',
      provider: 'razorpay',
      amount: 0,
      currency: 'INR',
      trial_start_at: new Date(now - 4 * 86400000).toISOString(),
      trial_end_at: tenDaysFromNow,
      current_period_start: new Date(now - 4 * 86400000).toISOString(),
      current_period_end: tenDaysFromNow,
      cancel_at_period_end: false,
      payment_failure_count: 0,
      promotional_cycles_completed: 0,
      promo_months_remaining: 0,
      created_at: new Date(now - 4 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    expect(entitlement.hasAccess).toBe(true);
    expect(entitlement.status).toBe('TRIALING');
    expect(entitlement.expiresAt).toBe(tenDaysFromNow);
    expect(entitlement.daysRemaining).toBe(10);

    const staffUserId = crypto.randomUUID();
    const staffAccess = await subscriptionService.checkUserAccess(staffUserId, orgId);
    expect(staffAccess.entitlement.expiresAt).toBe(tenDaysFromNow);
    expect(staffAccess.entitlement.daysRemaining).toBe(10);
  });

  // Test D: Org subscription expires; owner + staff lose access simultaneously.
  it('Test D: Org subscription expires; owner and staff lose access simultaneously', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();
    const expiredTimestamp = new Date(now - 5 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000002',
      status: 'expired',
      provider: 'razorpay',
      amount: 14900,
      currency: 'INR',
      trial_start_at: new Date(now - 44 * 86400000).toISOString(),
      trial_end_at: new Date(now - 30 * 86400000).toISOString(),
      current_period_start: new Date(now - 30 * 86400000).toISOString(),
      current_period_end: expiredTimestamp,
      cancel_at_period_end: false,
      payment_failure_count: 1,
      promotional_cycles_completed: 1,
      promo_months_remaining: 0,
      created_at: new Date(now - 44 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const ownerAccess = await subscriptionService.checkUserAccess('owner_user_1', orgId);
    const staffAccess = await subscriptionService.checkUserAccess('staff_user_1', orgId);

    expect(ownerAccess.hasAccess).toBe(false);
    expect(staffAccess.hasAccess).toBe(false);
    expect(ownerAccess.entitlement.status).toBe('EXPIRED');
    expect(staffAccess.entitlement.status).toBe('EXPIRED');
  });

  // Test E: Subscription renewed; owner + active staff regain access.
  it('Test E: Subscription renewed; owner and active staff regain access simultaneously', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();
    const nextMonth = new Date(now + 30 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000002',
      status: 'active',
      provider: 'razorpay',
      last_payment_id: 'pay_renewed_123',
      last_payment_at: new Date().toISOString(),
      amount: 14900,
      currency: 'INR',
      trial_start_at: new Date(now - 44 * 86400000).toISOString(),
      trial_end_at: new Date(now - 30 * 86400000).toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: nextMonth,
      cancel_at_period_end: false,
      payment_failure_count: 0,
      promotional_cycles_completed: 1,
      promo_months_remaining: 0,
      created_at: new Date(now - 44 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const ownerAccess = await subscriptionService.checkUserAccess('owner_user_2', orgId);
    const staffAccess = await subscriptionService.checkUserAccess('staff_user_2', orgId);

    expect(ownerAccess.hasAccess).toBe(true);
    expect(staffAccess.hasAccess).toBe(true);
    expect(ownerAccess.entitlement.status).toBe('ACTIVE');
    expect(staffAccess.entitlement.status).toBe('ACTIVE');
  });

  // Test F: Staff deactivated while sub active; staff loses access immediately.
  it('Test F: Staff deactivated while subscription is active; staff loses access immediately', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000002',
      status: 'active',
      provider: 'razorpay',
      last_payment_id: 'pay_active_999',
      amount: 14900,
      currency: 'INR',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(now + 30 * 86400000).toISOString(),
      cancel_at_period_end: false,
      payment_failure_count: 0,
      promotional_cycles_completed: 1,
      promo_months_remaining: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    // Organization entitlement itself remains active
    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    expect(entitlement.hasAccess).toBe(true);
    expect(entitlement.status).toBe('ACTIVE');
  });

  // Test G: Sub cancelled but paid period not ended; access retained until expiry.
  it('Test G: Sub cancelled but paid period not ended; access retained until period end', async () => {
    const orgId = crypto.randomUUID();
    const now = Date.now();
    const periodEnd = new Date(now + 15 * 86400000).toISOString();

    const sub: BusinessSubscription = {
      id: crypto.randomUUID(),
      business_id: orgId,
      plan_id: 'e0000000-0000-0000-0000-000000000002',
      status: 'cancelled',
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Too expensive',
      provider: 'razorpay',
      last_payment_id: 'pay_paid_before_cancel',
      amount: 14900,
      currency: 'INR',
      current_period_start: new Date(now - 15 * 86400000).toISOString(),
      current_period_end: periodEnd,
      payment_failure_count: 0,
      promotional_cycles_completed: 1,
      promo_months_remaining: 0,
      created_at: new Date(now - 15 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await store.saveBusinessSubscription(sub);

    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    expect(entitlement.status).toBe('CANCELLED');
    expect(entitlement.hasAccess).toBe(true);
    expect(entitlement.isCancelled).toBe(true);
    expect(entitlement.expiresAt).toBe(periodEnd);
    expect(entitlement.daysRemaining).toBe(15);
  });
});
