import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { nowpaymentsService, NowPaymentsIpnPayload } from '@/lib/billing/nowpayments';
import { SubscriptionPayment, BusinessSubscription } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let payload: NowPaymentsIpnPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const receivedSignature = req.headers.get('x-nowpayments-sig');

    // 1. Validate HMAC SHA-512 Signature over recursively sorted JSON keys
    const isSignatureValid = nowpaymentsService.verifyIpnSignature(payload, receivedSignature);

    // Always log the incoming IPN event for transparent audit history
    const paymentId = String(payload.payment_id || payload.id || `unknown_${Date.now()}`);
    const orderId = payload.order_id || '';
    const paymentStatus = (payload.payment_status || 'unknown').toLowerCase();

    // Extract organization ID from order ID: QF-SUB-{organizationId}-{timestamp}
    let orgId: string | null = null;
    if (orderId && orderId.startsWith('QF-SUB-')) {
      const parts = orderId.split('-');
      if (parts.length >= 3) {
        orgId = parts[2]; // UUID or org id
      }
    }

    await store.logPaymentEvent({
      id: crypto.randomUUID(),
      provider: 'nowpayments',
      provider_event_id: paymentId,
      organization_id: orgId,
      subscription_id: null,
      status: paymentStatus,
      payload: payload as any,
      signature_verified: isSignatureValid,
      created_at: new Date().toISOString(),
    });

    if (!isSignatureValid) {
      console.warn(`[NOWPayments Webhook] Invalid HMAC signature for payment ${paymentId}`);
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    if (!orgId) {
      console.warn(`[NOWPayments Webhook] Could not determine organizationId from order_id: ${orderId}`);
      return NextResponse.json({ received: true, warning: 'No matching organization' }, { status: 200 });
    }

    const org = await store.getOrganization(orgId);
    let sub = await store.getBusinessSubscription(orgId);

    const nowIso = new Date().toISOString();
    if (!sub) {
      sub = {
        id: crypto.randomUUID(),
        business_id: orgId,
        plan_id: 'plan_international_usd_10',
        status: 'trialing',
        provider: 'nowpayments',
        razorpay_customer_id: null,
        razorpay_subscription_id: null,
        razorpay_plan_id: null,
        amount: 10,
        currency: 'USD',
        billing_region: 'INTERNATIONAL',
        billing_country: org?.business_country || 'US',
        billing_currency: 'USD',
        provider_order_id: orderId,
        nowpayments_order_id: orderId,
        nowpayments_payment_id: paymentId,
        payment_status: paymentStatus,
        trial_start_at: nowIso,
        trial_end_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        current_period_start: nowIso,
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        next_charge_at: new Date(Date.now() + 30 * 86400000).toISOString(),
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
        created_at: nowIso,
        updated_at: nowIso,
      } as BusinessSubscription;
    } else {
      sub.provider = 'nowpayments';
      sub.provider_order_id = orderId;
      sub.nowpayments_order_id = orderId;
      sub.nowpayments_payment_id = paymentId;
      sub.payment_status = paymentStatus;
      sub.billing_region = 'INTERNATIONAL';
      sub.billing_currency = 'USD';
      sub.currency = 'USD';
      sub.amount = 10;
      sub.updated_at = new Date().toISOString();
    }

    // 2. Handle IPN status updates
    // Supported: waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired
    if (paymentStatus === 'finished') {
      // IDEMPOTENCY CHECK:
      // If subscription is already active and this payment ID has already been recorded, do not duplicate
      const existingPayments = await store.getSubscriptionPayments(orgId, 50);
      const isAlreadyRecorded = existingPayments.some(
        (p) => p.nowpayments_payment_id === paymentId || p.provider_payment_id === paymentId
      );

      const nowIso = new Date().toISOString();
      const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString();

      sub.status = 'active';
      sub.provider = 'nowpayments';
      (sub as any).payment_provider = 'NOWPAYMENTS';
      sub.payment_status = 'paid';
      sub.paid_at = nowIso;
      sub.last_payment_at = nowIso;
      sub.last_payment_id = `np_${paymentId}`;
      sub.current_period_start = nowIso;
      sub.current_period_end = thirtyDaysLater;
      sub.next_charge_at = thirtyDaysLater;
      sub.period_start = nowIso;
      sub.period_end = thirtyDaysLater;
      sub.is_trial_prepaid = false;
      sub.payment_failure_count = 0;
      sub.updated_at = nowIso;

      await store.saveBusinessSubscription(sub);

      // Lock country so regional pricing cannot be altered during active subscription
      if (org) {
        await store.updateOrganization(orgId, {
          country_locked: true,
          billing_region: 'INTERNATIONAL',
          billing_currency: 'USD',
          payment_provider: 'NOWPAYMENTS',
        });
      }

      if (!isAlreadyRecorded) {
        const paymentRecord: SubscriptionPayment = {
          id: `np_pay_${paymentId}`,
          business_id: orgId,
          subscription_id: sub.id,
          provider: 'nowpayments',
          provider_payment_id: paymentId,
          provider_order_id: orderId,
          nowpayments_payment_id: paymentId,
          nowpayments_order_id: orderId,
          crypto_currency: payload.pay_currency || null,
          crypto_amount: payload.pay_amount ? Number(payload.pay_amount) : null,
          actually_paid: payload.actually_paid ? Number(payload.actually_paid) : null,
          outcome_amount: payload.outcome_amount ? Number(payload.outcome_amount) : 10,
          outcome_currency: payload.outcome_currency || 'usd',
          pay_address: payload.pay_address || null,
          network: payload.network || null,
          amount: 10,
          currency: 'USD',
          status: 'captured',
          payment_method: payload.pay_currency ? `crypto_${payload.pay_currency}` : 'cryptocurrency',
          failure_reason: null,
          paid_at: nowIso,
          created_at: nowIso,
        };
        await store.saveSubscriptionPayment(paymentRecord);
      }

      console.log(`[NOWPayments Webhook] Activated QuoteFlow Pro subscription for org: ${orgId}`);
    } else if (paymentStatus === 'partially_paid') {
      sub.payment_status = 'partially_paid';
      await store.saveBusinessSubscription(sub);
    } else if (paymentStatus === 'failed' || paymentStatus === 'expired') {
      sub.payment_status = paymentStatus;
      if (sub.status !== 'active') {
        sub.status = 'past_due';
      }
      await store.saveBusinessSubscription(sub);
    } else {
      // waiting, confirming, confirmed, sending
      sub.payment_status = paymentStatus;
      await store.saveBusinessSubscription(sub);
    }

    return NextResponse.json({ success: true, status: paymentStatus });
  } catch (err: any) {
    console.error('Error processing NOWPayments webhook:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
