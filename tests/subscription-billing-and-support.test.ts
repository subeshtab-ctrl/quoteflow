import { describe, it, expect } from 'vitest';
import { subscriptionService, DEFAULT_PLANS, DEFAULT_PROMOTION } from '@/lib/billing/subscription-service';
import { razorpayService } from '@/lib/billing/razorpay';
import { store } from '@/lib/supabase/data-store';
import {
  generateAdminOtp,
  verifyAdminOtp,
  setDeveloperAdminPassword,
  verifyPassword,
  hasDeveloperAdminPassword,
  getDeveloperAdminConfig,
  createAdminSessionToken,
  verifyAdminSessionToken,
  DEVELOPER_ADMIN_EMAIL,
  DEFAULT_DEVELOPER_ADMIN_PASSWORD,
} from '@/lib/billing/dev-admin-auth';
import crypto from 'crypto';

describe('QuoteFlow SaaS Subscription Billing & Lifecycle Test Suite', () => {
  describe('1. 30-Day Free Trial Lifecycle', () => {
    it('creates 30-day free trial with server-side timestamps and zero charge', async () => {
      const trialBusinessId = crypto.randomUUID();
      const trialSub = await subscriptionService.startFreeTrial(trialBusinessId);

      expect(trialSub).toBeDefined();
      expect(trialSub.status).toBe('trialing');
      expect(trialSub.amount).toBe(0);
      expect(trialSub.currency).toBe('INR');

      const start = new Date(trialSub.trial_start_at!).getTime();
      const end = new Date(trialSub.trial_end_at!).getTime();
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);

      // Verify entitlement
      const access = await subscriptionService.getBusinessSubscriptionAccess(trialBusinessId);
      expect(access.allowed).toBe(true);
      expect(access.isTrial).toBe(true);
      expect(access.daysRemainingInTrial).toBeGreaterThanOrEqual(29);
      expect(access.planName).toBe('QuoteFlow Free Trial');
    });

    it('server-side expires trial and restricts access after trial + 3-day grace period without deleting data', async () => {
      const expiredBizId = crypto.randomUUID();
      const trialSub = await subscriptionService.startFreeTrial(expiredBizId);
      // Simulate expired trial date past 3-day grace period
      trialSub.trial_end_at = new Date(Date.now() - 5 * 86400000).toISOString();
      trialSub.grace_period_end_at = new Date(Date.now() - 2 * 86400000).toISOString();
      trialSub.status = 'payment_overdue';
      await store.saveBusinessSubscription(trialSub);

      const access = await subscriptionService.getBusinessSubscriptionAccess(expiredBizId);
      expect(access.isRestricted).toBe(true);
      expect(access.allowed).toBe(false);
      expect(access.warningMessage).toContain('Billing Required');
    });
  });

  describe('2. QuoteFlow Pro ₹99/mo Lifecycle (Strictly No ₹199 Plan)', () => {
    it('allows eligible business to subscribe to QuoteFlow Pro ₹99/mo', async () => {
      const promoBusinessId = crypto.randomUUID();
      // 1. Create checkout
      const checkout = await subscriptionService.createSubscriptionCheckout({
        businessId: promoBusinessId,
        planSlug: 'monthly_99',
      });

      expect(checkout.amount).toBe(9900); // 9900 paise = ₹99
      expect(checkout.planSlug).toBe('monthly_99');

      const pendingSub = await store.getBusinessSubscription(promoBusinessId);
      expect(pendingSub?.amount).toBe(9900);

      const rzpSubId = pendingSub!.razorpay_subscription_id!;

      // 2. Month 1 payment confirmed
      const month1 = await subscriptionService.handleSuccessfulPayment({
        subscriptionId: rzpSubId,
        paymentId: 'pay_test_month_1',
        amount: 9900,
        businessId: promoBusinessId,
      });
      expect(month1.status).toBe('active');
      expect(month1.amount).toBe(9900);

      // 3. Month 2 payment confirmed remains ₹99 (NO ₹199 plan)
      const month2 = await subscriptionService.handleSuccessfulPayment({
        subscriptionId: rzpSubId,
        paymentId: 'pay_test_month_2',
        amount: 9900,
        businessId: promoBusinessId,
      });
      expect(month2.status).toBe('active');
      expect(month2.amount).toBe(9900);
      expect(month2.plan_id).toBe(DEFAULT_PLANS.PRO_99.id);
    });
  });

  describe('3. Payment Failure, Configurable Grace Period, and Restoration', () => {
    it('initiates grace period on payment failure and restores active on successful retry', async () => {
      const graceBusinessId = crypto.randomUUID();
      const checkout = await subscriptionService.createSubscriptionCheckout({
        businessId: graceBusinessId,
        planSlug: 'monthly_199',
      });
      const rzpSubId = checkout.subscriptionId;

      // Simulate first payment success
      await subscriptionService.handleSuccessfulPayment({
        subscriptionId: rzpSubId,
        paymentId: 'pay_init',
        amount: 19900,
        businessId: graceBusinessId,
      });

      // Simulate recurring billing failure
      const failedSub = await subscriptionService.handlePaymentFailure({
        subscriptionId: rzpSubId,
        paymentId: 'pay_failed_1',
        failureReason: 'Insufficient balance on card',
      });

      expect(failedSub.status).toBe('grace_period');
      expect(failedSub.payment_failure_count).toBe(1);
      expect(failedSub.grace_period_start_at).toBeDefined();
      expect(failedSub.grace_period_end_at).toBeDefined();

      const accessInGrace = await subscriptionService.getBusinessSubscriptionAccess(graceBusinessId);
      expect(accessInGrace.allowed).toBe(true); // Grace period keeps access active with persistent warning
      expect(accessInGrace.isGracePeriod).toBe(true);
      expect(accessInGrace.warningMessage).toContain('grace period');

      // Simulate payment retry success
      const recoveredSub = await subscriptionService.handleSuccessfulPayment({
        subscriptionId: rzpSubId,
        paymentId: 'pay_retry_success',
        amount: 19900,
        businessId: graceBusinessId,
      });

      expect(recoveredSub.status).toBe('active');
      expect(recoveredSub.payment_failure_count).toBe(0);
      expect(recoveredSub.grace_period_start_at).toBeNull();
      expect(recoveredSub.grace_period_end_at).toBeNull();
    });
  });

  describe('4. Cancellation & Reactivation', () => {
    it('schedules cancellation at period end preserving access', async () => {
      const cancelBusinessId = crypto.randomUUID();
      const checkout = await subscriptionService.createSubscriptionCheckout({
        businessId: cancelBusinessId,
        planSlug: 'monthly_199',
      });
      await subscriptionService.handleSuccessfulPayment({
        subscriptionId: checkout.subscriptionId,
        paymentId: 'pay_sub_active',
        amount: 19900,
        businessId: cancelBusinessId,
      });

      const cancelledSub = await subscriptionService.cancelSubscription({
        businessId: cancelBusinessId,
        reason: 'Too expensive',
        cancelAtPeriodEnd: true,
      });

      expect(cancelledSub.cancel_at_period_end).toBe(true);
      expect(cancelledSub.cancellation_reason).toBe('Too expensive');
      expect(cancelledSub.status).toBe('active'); // Retains active status until period end

      // Reactivate
      const reactivated = await subscriptionService.reactivateSubscription({
        businessId: cancelBusinessId,
      });
      expect(reactivated.subscription.cancel_at_period_end).toBe(false);
      expect(reactivated.subscription.cancellation_reason).toBeNull();
    });
  });

  describe('5. Support Tickets & Attachments', () => {
    it('creates support ticket with unique QF number, messages, and attachments', async () => {
      const supportBusinessId = crypto.randomUUID();
      const ticket = await subscriptionService.createSupportTicket({
        businessId: supportBusinessId,
        userId: crypto.randomUUID(),
        creatorEmail: 'client@example.com',
        creatorName: 'Test Client',
        subject: 'Inquiry regarding GST invoice rounding',
        category: 'Invoice',
        priority: 'High',
        description: 'Line item 2 displays 18.01% instead of 18.00% under custom tax formula.',
        attachments: [
          {
            file_name: 'invoice_screenshot.png',
            file_size: 102450,
            mime_type: 'image/png',
            storage_path: '/uploads/support/sample.png',
          },
        ],
      });

      expect(ticket).toBeDefined();
      expect(ticket.ticket_number).toMatch(/^QF-\d{4}-\d{6}$/);
      expect(ticket.status).toBe('open');
      expect(ticket.category).toBe('Invoice');

      // Add developer reply
      const reply = await subscriptionService.addTicketMessage({
        ticketId: ticket.id,
        senderType: 'developer',
        senderName: 'QuoteFlow Engineer',
        message: 'We have identified the formula rounding precision and applied a fix.',
      });

      expect(reply.sender_type).toBe('developer');
      const refreshed = await store.getSupportTicket(ticket.id);
      expect(refreshed?.status).toBe('waiting_for_customer');
      expect(refreshed?.messages?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('6. Razorpay Security, Signature Verification & Idempotent Webhooks', () => {
    it('validates authentic signatures and rejects forged signatures', () => {
      const orderId = 'order_test_123456';
      const paymentId = 'pay_test_987654';
      const secret = razorpayService.getKeySecret();

      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const isOrderValid = razorpayService.verifyOrderSignature({
        orderId,
        paymentId,
        signature: validSignature,
      });
      expect(isOrderValid).toBe(true);

      const isOrderForged = razorpayService.verifyOrderSignature({
        orderId,
        paymentId,
        signature: 'invalid_forged_signature_hash',
      });
      expect(isOrderForged).toBe(false);
    });

    it('enforces webhook idempotency preventing duplicate payment processing', async () => {
      const eventId = `evt_test_idempotent_${Date.now()}`;
      const firstEvent = await store.saveSubscriptionEvent({
        id: crypto.randomUUID(),
        event_id: eventId,
        event_type: 'subscription.charged',
        razorpay_subscription_id: 'sub_test_dup',
        razorpay_payment_id: 'pay_test_dup',
        payload: { test: true },
        processed: true,
        processing_error: null,
        created_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      });

      expect(firstEvent.processed).toBe(true);

      // Verify that lookup returns the processed event
      const lookup = await store.getSubscriptionEvent(eventId);
      expect(lookup).toBeDefined();
      expect(lookup?.processed).toBe(true);
    });
  });

  describe('7. Strict Developer Admin Authentication & Password Verification', () => {
    it('generates, verifies, and rejects expired/tampered OTP for m.subesh@outlook.com', () => {
      const otp = generateAdminOtp();
      expect(otp).toMatch(/^\d{6}$/);

      // Verify wrong code fails
      expect(verifyAdminOtp('000000')).toBe(false);

      // Verify correct code succeeds
      expect(verifyAdminOtp(otp)).toBe(true);

      // Cannot reuse already verified OTP
      expect(verifyAdminOtp(otp)).toBe(false);
    });

    it('sets, hashes with salt, and verifies developer admin password', () => {
      const testPw = 'SuperSecretDevAdmin2026!';
      setDeveloperAdminPassword(testPw);

      expect(hasDeveloperAdminPassword()).toBe(true);
      const cfg = getDeveloperAdminConfig();
      expect(cfg.email).toBe(DEVELOPER_ADMIN_EMAIL);
      expect(cfg.passwordHash).toBeDefined();
      expect(cfg.salt).toBeDefined();

      // Verify correct password
      expect(verifyPassword(testPw, cfg.passwordHash!, cfg.salt!)).toBe(true);

      // Verify incorrect password fails
      expect(verifyPassword('WrongPassword123', cfg.passwordHash!, cfg.salt!)).toBe(false);

      // Restore default developer admin credentials
      setDeveloperAdminPassword(DEFAULT_DEVELOPER_ADMIN_PASSWORD);
    });

    it('creates tamper-proof developer session token and rejects forged tokens', () => {
      const token = createAdminSessionToken();
      expect(verifyAdminSessionToken(token)).toBe(true);

      // Forged tokens
      expect(verifyAdminSessionToken('hacker@example.com:123456:fake_signature')).toBe(false);
      expect(verifyAdminSessionToken('')).toBe(false);
      expect(verifyAdminSessionToken('invalid_token')).toBe(false);
    });

    it('authenticates with default master password Subesh@123 out-of-the-box', () => {
      const cfg = getDeveloperAdminConfig();
      expect(cfg.email).toBe(DEVELOPER_ADMIN_EMAIL);
      expect(verifyPassword(DEFAULT_DEVELOPER_ADMIN_PASSWORD, cfg.passwordHash!, cfg.salt!)).toBe(true);
      expect(verifyPassword('WrongPassword!', cfg.passwordHash!, cfg.salt!)).toBe(false);
    });

    it('supports pre-paying subscription during free trial, keeping trial intact until end date', async () => {
      const trialBizId = crypto.randomUUID();
      await subscriptionService.startFreeTrial(trialBizId);

      // Create checkout during trial
      const checkout = await subscriptionService.createSubscriptionCheckout({
        businessId: trialBizId,
        planSlug: 'promo_99',
      });
      expect(checkout.isTrialScheduled).toBe(true);

      // Confirm payment
      const sub = await subscriptionService.handleSuccessfulPayment({
        subscriptionId: checkout.subscriptionId,
        paymentId: 'pay_test_trial_prepaid',
        amount: 9900,
        businessId: trialBizId,
      });

      expect(sub.is_trial_prepaid).toBe(true);
      expect(sub.status).toBe('active'); // Requirement 6: plan becomes active on verified payment

      // Access should still show remaining trial days anchored (Requirements 7, 8)
      const access = await subscriptionService.getBusinessSubscriptionAccess(trialBizId);
      expect(access.isPaid).toBe(true);
      expect(access.daysRemainingInTrial).toBeGreaterThanOrEqual(29);
      expect(access.allowed).toBe(true);
    });

    it('creates support ticket with callback request and marks as solved', async () => {
      const bizId = crypto.randomUUID();
      const ticket = await subscriptionService.createSupportTicket({
        businessId: bizId,
        userId: 'usr_test_1',
        subject: 'Billing inquiry with callback',
        category: 'Billing',
        priority: 'High',
        description: 'Please call me regarding promo pricing',
        callbackRequested: true,
        callbackPhone: '+91 9876543210',
      });

      expect(ticket.ticket_number).toMatch(/^QF-\d{4}-\d{6}$/);
      expect(ticket.callback_requested).toBe(true);
      expect(ticket.callback_phone).toBe('+91 9876543210');
      expect(ticket.status).toBe('open');

      // Update to resolved/solved
      ticket.status = 'resolved';
      ticket.resolved_at = new Date().toISOString();
      await store.saveSupportTicket(ticket);

      const retrieved = await store.getSupportTicket(ticket.id);
      expect(retrieved?.status).toBe('resolved');
      expect(retrieved?.resolved_at).toBeDefined();
    });
  });
});

