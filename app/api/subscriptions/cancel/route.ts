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
        { error: 'Only account Owners and Admins can cancel subscriptions' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { reason, cancel_at_period_end } = body;

    const sub = await subscriptionService.cancelSubscription({
      businessId: auth.orgId,
      reason,
      cancelAtPeriodEnd: cancel_at_period_end !== false,
      cancelledByUserId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription cancellation scheduled',
      subscription: sub,
    });
  } catch (err: any) {
    console.error('Error cancelling subscription:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
