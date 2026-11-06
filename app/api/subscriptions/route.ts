import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { razorpayService } from '@/lib/billing/razorpay';
import { syncCloudAdminConfig } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { getTimezoneFromIp } from '@/lib/utils/ip-timezone';
import { isOwnerOrAdminRole } from '@/types/staff';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure latest Razorpay credentials & plan IDs are synced from Supabase
    await syncCloudAdminConfig();

    // Resolve user's timezone from their IP so trial day boundaries are local, not UTC
    const userIp =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      undefined;
    const userTimezone = await getTimezoneFromIp(userIp);

    // If subscription has expired or is nearing expiry, opportunistically sync with gateway
    const currentSub = await store.getBusinessSubscription(auth.orgId);
    const now = Date.now();
    const isPastOrNearing = currentSub?.current_period_end
      ? new Date(currentSub.current_period_end).getTime() <= now + 86400000
      : false;
    const shouldSync = Boolean(
      req.nextUrl.searchParams.get('sync') === 'true' ||
      (currentSub?.razorpay_subscription_id && isPastOrNearing)
    );

    if (shouldSync && currentSub?.razorpay_subscription_id) {
      try {
        await subscriptionService.syncBusinessSubscriptionWithGateway(auth.orgId);
      } catch {}
    }

    const [subscription, access, isEligibleForPromo, payments] = await Promise.all([
      store.getBusinessSubscription(auth.orgId),
      subscriptionService.getBusinessSubscriptionAccess(auth.orgId, userTimezone),
      subscriptionService.isEligibleForPromotion(auth.orgId),
      store.getSubscriptionPayments(auth.orgId, 20),
    ]);

    const publicPlans = [
      DEFAULT_PLANS.FREE_TRIAL,
      DEFAULT_PLANS.STANDARD_199,
    ];

    const keyId = razorpayService.getKeyId();
    const isTestMode = Boolean(keyId && keyId.startsWith('rzp_test_'));

    const org = await store.getOrganization(auth.orgId);
    const rules = await store.getPaymentCountryRules();
    const { getBillingDetailsForCountry } = await import('@/lib/billing/country-rules');
    const rawCountry = org?.business_country || org?.country || 'IN';
    const billingDetails = getBillingDetailsForCountry(rawCountry, rules);

    return NextResponse.json({
      success: true,
      subscription,
      access,
      isEligibleForPromo,
      promoPlan: DEFAULT_PLANS.PROMO_99,
      plans: publicPlans,
      payments,
      isTestMode,
      keyId,
      userTimezone,
      billingDetails,
      userRole: auth.role,
      orgName: org?.name || auth.organization?.name || 'Your Organization',
      adminEmail: org?.email || auth.organization?.email || auth.email,
    });
  } catch (err: any) {
    console.error('Error fetching subscription details:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Owner and Admin can subscribe
    if (!isOwnerOrAdminRole(auth.role)) {
      return NextResponse.json(
        { error: 'Only account Owners and Admins can manage subscriptions' },
        { status: 403 }
      );
    }

    // Ensure latest Razorpay credentials & plan IDs are synced before checkout creation
    await syncCloudAdminConfig();

    const body = await req.json().catch(() => ({}));
    const planSlug = body.plan_slug || 'monthly_199';

    const checkout = await subscriptionService.createSubscriptionCheckout({
      businessId: auth.orgId,
      planSlug,
      customerEmail: auth.email,
      customerName: auth.fullName,
    });

    return NextResponse.json({
      success: true,
      checkout,
    });
  } catch (err: any) {
    console.error('Error initiating subscription checkout:', err);
    let message = err.message || 'Failed to start subscription';
    if (message.toLowerCase().includes('authentication failed') || message.includes('401')) {
      message = 'Razorpay payment gateway authentication failed. Please try again or contact support.';
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
