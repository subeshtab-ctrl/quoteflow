import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService, DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { razorpayService } from '@/lib/billing/razorpay';
import { syncCloudAdminConfig } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { getTimezoneFromIp } from '@/lib/utils/ip-timezone';

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
    if (auth.role === 'STAFF') {
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
    return NextResponse.json(
      { error: err.message || 'Failed to start subscription' },
      { status: 500 }
    );
  }
}
