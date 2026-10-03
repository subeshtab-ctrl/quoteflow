import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDeveloperAdmin } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService } from '@/lib/billing/subscription-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: businessId } = await params;
    const org = await store.getOrganization(businessId);
    const sub = await store.getBusinessSubscription(businessId);
    const payments = await store.getSubscriptionPayments(businessId);
    const access = await subscriptionService.getBusinessSubscriptionAccess(businessId);

    return NextResponse.json({
      success: true,
      business: org,
      subscription: sub,
      payments,
      access,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: businessId } = await params;
    const body = await req.json();

    if (body.action === 'apply_offer') {
      const result = await subscriptionService.applyOffer({
        businessId,
        offerType: body.offerType,
        value: Number(body.value),
        durationMonths: body.durationMonths ? Number(body.durationMonths) : 1,
        reason: body.reason || 'Developer Admin promotional incentive',
        adminUserId: 'developer-admin',
        adminEmail: 'm.subesh@outlook.com',
      });
      return NextResponse.json(result);
    }

    if (body.action === 'manual_activate_pro') {
      const result = await subscriptionService.manuallyActivateProPlan({
        businessId,
        paymentReference: body.paymentReference,
        reason: body.reason,
        durationDays: body.durationDays ? Number(body.durationDays) : 30,
        adminUserId: 'developer-admin',
        adminEmail: 'm.subesh@outlook.com',
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuth = await isAuthorizedDeveloperAdmin(req);
    if (!isAuth) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: businessId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'AI / Synthetic test account cleanup';

    const result = await store.softDeleteTestBusiness(businessId, 'developer-admin', reason);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
