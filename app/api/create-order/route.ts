import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { razorpayService } from '@/lib/billing/razorpay';
import { DEFAULT_PLANS } from '@/lib/billing/subscription-service';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
import { syncCloudAdminConfig } from '@/lib/billing/dev-admin-auth';

export async function POST(req: NextRequest) {
  try {
    // Ensure latest Razorpay credentials are synced from Supabase cloud store
    await syncCloudAdminConfig();

    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planSlug = body.plan_slug;

    // Never trust client-submitted amount. Determine strictly server-side.
    const amount = SUBSCRIPTION_CONFIG.INDIA.amountPaise; // 14900 paise (₹149)

    if (amount < 100) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const order = await razorpayService.createOrder({
      amount,
      currency: 'INR',
      receipt: `rcpt_${auth.orgId.substring(0, 8)}_${Date.now()}`,
      notes: {
        business_id: auth.orgId,
        plan_slug: planSlug || 'monthly_199',
        user_id: auth.userId,
      },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: razorpayService.getKeyId(),
    });
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
