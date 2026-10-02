import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Only account Owners and Admins can reactivate subscriptions' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const planSlug = body.plan_slug;

    const result = await subscriptionService.reactivateSubscription({
      businessId: auth.orgId,
      planSlug,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated',
      ...result,
    });
  } catch (err: any) {
    console.error('Error reactivating subscription:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
