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
        { error: 'Only account Owners and Admins can update plan activation schedule' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'immediate' ? 'immediate' : 'after_trial';

    const sub = await subscriptionService.updatePlanActivationSchedule({
      businessId: auth.orgId,
      mode,
    });

    const access = await subscriptionService.getBusinessSubscriptionAccess(auth.orgId);

    return NextResponse.json({
      success: true,
      message: `Plan activation schedule updated to ${mode === 'immediate' ? 'Immediate Start' : 'After Free Trial'}`,
      subscription: sub,
      access,
    });
  } catch (err: any) {
    console.error('Error updating activation schedule:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update activation schedule' },
      { status: 500 }
    );
  }
}
