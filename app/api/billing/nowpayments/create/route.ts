import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { nowpaymentsService } from '@/lib/billing/nowpayments';
import { getBillingDetailsForCountry, findCountry } from '@/lib/billing/country-rules';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
import { BusinessSubscription } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory rate limiting map (IP/Org -> last checkout timestamp)
const checkoutRateLimit = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Only account Owners and Admins can purchase subscriptions' },
        { status: 403 }
      );
    }

    // Rate limiting: 1 request per 3 seconds per org to prevent spam / duplicate order creation
    const rateLimitKey = `${auth.orgId}_nowpayments`;
    const lastRequest = checkoutRateLimit.get(rateLimitKey) || 0;
    const now = Date.now();
    if (now - lastRequest < 3000) {
      return NextResponse.json(
        { error: 'A checkout request is already in progress. Please wait a moment.' },
        { status: 429 }
      );
    }
    checkoutRateLimit.set(rateLimitKey, now);

    const org = await store.getOrganization(auth.orgId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 1. Read business country from database
    const rawCountry = org.business_country || org.country || 'IN';
    const countryMeta = findCountry(rawCountry);
    const countryCode = countryMeta.code.toUpperCase();

    // 2. Reject if country is India
    if (countryCode === 'IN' || rawCountry.toLowerCase() === 'india') {
      return NextResponse.json(
        {
          error:
            'Indian registered businesses must use Razorpay for subscription billing. NOWPayments is only available for international businesses.',
        },
        { status: 400 }
      );
    }

    // 3. Check international eligibility against configurable country rules
    const rules = await store.getPaymentCountryRules();
    const billingDetails = getBillingDetailsForCountry(countryCode, rules);

    if (!billingDetails.isEligible) {
      return NextResponse.json(
        {
          error:
            billingDetails.unsupportedMessage ||
            'QuoteFlow online subscription payments are not currently available in your country. Please contact support.',
        },
        { status: 403 }
      );
    }

    // 4. Determine domain origin for callbacks
    const origin =
      req.headers.get('origin') ||
      (req.headers.get('host') ? `https://${req.headers.get('host')}` : '') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://blendandbold.com';

    // 5. Generate unique QuoteFlow subscription/order ID: QF-SUB-{organizationId}-{timestamp}
    const orderId = `QF-SUB-${auth.orgId}-${now}`;
    const orderDescription = 'QuoteFlow Pro Monthly Subscription';

    const ipnCallbackUrl = `${origin}/api/webhooks/nowpayments`;
    const successUrl = `${origin}/billing/success`;
    const cancelUrl = `${origin}/billing?payment_status=cancelled`;

    // 6. Create NOWPayments invoice (guaranteeing minimum threshold for USDT and major coins)
    const effectivePlanAmount = Math.max(SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice, billingDetails.planAmount || SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice);
    const invoice = await nowpaymentsService.createInvoice({
      orderId,
      orderDescription,
      priceAmount: effectivePlanAmount,
      priceCurrency: 'usd',
      ipnCallbackUrl,
      successUrl,
      cancelUrl,
    });

    // 7. Store order and invoice details in database subscription record
    let sub = await store.getBusinessSubscription(auth.orgId);
    const nowIso = new Date().toISOString();
    if (!sub) {
      sub = {
        id: crypto.randomUUID(),
        business_id: auth.orgId,
        plan_id: `plan_international_usd_${effectivePlanAmount}`,
        status: 'trialing',
        provider: 'nowpayments',
        razorpay_customer_id: null,
        razorpay_subscription_id: null,
        razorpay_plan_id: null,
        amount: effectivePlanAmount,
        currency: 'USD',
        billing_region: 'INTERNATIONAL',
        billing_country: countryCode,
        billing_currency: 'USD',
        provider_order_id: orderId,
        provider_invoice_id: invoice.id,
        nowpayments_order_id: orderId,
        nowpayments_invoice_id: invoice.id,
        payment_status: 'waiting',
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
      sub.currency = 'USD';
      sub.amount = effectivePlanAmount;
      sub.billing_region = 'INTERNATIONAL';
      sub.billing_country = countryCode;
      sub.billing_currency = 'USD';
      sub.provider_order_id = orderId;
      sub.provider_invoice_id = invoice.id;
      sub.nowpayments_order_id = orderId;
      sub.nowpayments_invoice_id = invoice.id;
      sub.payment_status = 'waiting';
      sub.updated_at = new Date().toISOString();
    }
    await store.saveBusinessSubscription(sub);

    // 8. Audit log payment creation event
    await store.logPaymentEvent({
      id: crypto.randomUUID(),
      provider: 'nowpayments',
      provider_event_id: invoice.id,
      organization_id: auth.orgId,
      subscription_id: sub.id,
      status: 'invoice_created',
      payload: {
        order_id: orderId,
        invoice_id: invoice.id,
        price_amount: 10,
        price_currency: 'usd',
        country_code: countryCode,
        is_mock: Boolean(invoice.is_mock),
      },
      signature_verified: true,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      invoice_url: invoice.invoice_url,
      invoice_id: invoice.id,
      order_id: orderId,
      is_mock: Boolean(invoice.is_mock),
    });
  } catch (err: any) {
    console.error('Error creating NOWPayments checkout:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initialize cryptocurrency payment checkout' },
      { status: 500 }
    );
  }
}
