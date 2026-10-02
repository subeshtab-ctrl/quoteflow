import { NextRequest, NextResponse } from 'next/server';
import { razorpayService } from '@/lib/billing/razorpay';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { store } from '@/lib/supabase/data-store';
import { SubscriptionEvent } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('Razorpay webhook missing x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // 1. Signature validation
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Invalid Razorpay webhook signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    // 2. Parse event payload
    const event = JSON.parse(rawBody);
    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.event || 'unknown';

    // 3. Idempotency check: duplicate webhooks must NOT cause double charges or promotions
    const existingEvent = await store.getSubscriptionEvent(eventId);
    if (existingEvent && existingEvent.processed) {
      return NextResponse.json({
        received: true,
        already_processed: true,
        message: `Event ${eventId} has already been processed`,
      });
    }

    // 4. Save initial event record
    const eventRecord: SubscriptionEvent = {
      id: crypto.randomUUID(),
      event_id: eventId,
      event_type: eventType,
      razorpay_subscription_id:
        event.payload?.subscription?.entity?.id ||
        event.payload?.payment?.entity?.subscription_id ||
        null,
      razorpay_payment_id: event.payload?.payment?.entity?.id || null,
      payload: event,
      processed: false,
      processing_error: null,
      created_at: new Date().toISOString(),
      processed_at: null,
    };
    await store.saveSubscriptionEvent(eventRecord);

    // 5. Handle supported Razorpay Subscription and Payment events
    try {
      switch (eventType) {
        // Initial authentication/activation of a recurring subscription
        case 'subscription.authenticated':
        case 'subscription.activated': {
          const subEntity = event.payload?.subscription?.entity;
          if (subEntity?.id) {
            const sub = await store.getSubscriptionByRazorpayId(subEntity.id);
            if (sub && sub.status !== 'active') {
              sub.status = 'active';
              sub.current_period_start = new Date().toISOString();
              sub.current_period_end = new Date(Date.now() + 30 * 86400000).toISOString();
              sub.updated_at = new Date().toISOString();
              await store.saveBusinessSubscription(sub);
            }
          }
          break;
        }

        // Successful recurring charge confirmation
        case 'subscription.charged': {
          const subEntity = event.payload?.subscription?.entity;
          const payEntity = event.payload?.payment?.entity;
          const subId = subEntity?.id || payEntity?.subscription_id;
          const paymentId = payEntity?.id || `pay_${Date.now()}`;
          const amount = payEntity?.amount || subEntity?.plan_id ? (subEntity.amount || 9900) : 9900;
          const paymentMethod = payEntity?.method || 'card';

          if (subId) {
            await subscriptionService.handleSuccessfulPayment({
              subscriptionId: subId,
              paymentId,
              amount,
              currency: payEntity?.currency || 'INR',
              paymentMethod,
            });
          }
          break;
        }

        // Direct payment captured (also handles subscription recurring payment when fired as payment.captured)
        case 'payment.captured': {
          const payEntity = event.payload?.payment?.entity;
          const subId = payEntity?.subscription_id;
          if (subId) {
            await subscriptionService.handleSuccessfulPayment({
              subscriptionId: subId,
              paymentId: payEntity.id,
              amount: payEntity.amount,
              currency: payEntity.currency || 'INR',
              paymentMethod: payEntity.method,
            });
          }
          break;
        }

        // Payment failure -> triggers grace period
        case 'payment.failed': {
          const payEntity = event.payload?.payment?.entity;
          const subId = payEntity?.subscription_id;
          if (subId) {
            const reason = payEntity?.error_description || payEntity?.error_reason || 'Recurring payment failed';
            await subscriptionService.handlePaymentFailure({
              subscriptionId: subId,
              paymentId: payEntity.id,
              failureReason: reason,
            });
          }
          break;
        }

        // Retries exhausted, subscription halted
        case 'subscription.halted': {
          const subEntity = event.payload?.subscription?.entity;
          if (subEntity?.id) {
            const sub = await store.getSubscriptionByRazorpayId(subEntity.id);
            if (sub) {
              sub.status = 'halted';
              sub.updated_at = new Date().toISOString();
              await store.saveBusinessSubscription(sub);
            }
          }
          break;
        }

        // Subscription cancelled
        case 'subscription.cancelled': {
          const subEntity = event.payload?.subscription?.entity;
          if (subEntity?.id) {
            const sub = await store.getSubscriptionByRazorpayId(subEntity.id);
            if (sub) {
              sub.status = 'cancelled';
              sub.cancelled_at = new Date().toISOString();
              sub.updated_at = new Date().toISOString();
              await store.saveBusinessSubscription(sub);
            }
          }
          break;
        }

        // Subscription completed all scheduled billing cycles
        case 'subscription.completed': {
          const subEntity = event.payload?.subscription?.entity;
          if (subEntity?.id) {
            const sub = await store.getSubscriptionByRazorpayId(subEntity.id);
            if (sub) {
              sub.status = 'expired';
              sub.updated_at = new Date().toISOString();
              await store.saveBusinessSubscription(sub);
            }
          }
          break;
        }

        default:
          console.log(`Razorpay webhook received unhandled event: ${eventType}`);
      }

      // 6. Mark event as successfully processed
      eventRecord.processed = true;
      eventRecord.processed_at = new Date().toISOString();
      await store.saveSubscriptionEvent(eventRecord);

      return NextResponse.json({ success: true, processed: true });
    } catch (err: any) {
      console.error(`Error processing webhook event ${eventId}:`, err);
      eventRecord.processing_error = err.message || 'Processing error';
      await store.saveSubscriptionEvent(eventRecord);
      return NextResponse.json(
        { error: 'Error processing webhook event', details: err.message },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Fatal webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
