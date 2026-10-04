import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { razorpayService } from '@/lib/billing/razorpay';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { syncCloudAdminConfig } from '@/lib/billing/dev-admin-auth';
import { store } from '@/lib/supabase/data-store';

export async function POST(req: NextRequest) {
  try {
    // Ensure latest Razorpay credentials (including secret for signature verification) are synced
    await syncCloudAdminConfig();

    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      razorpay_signature,
    } = body;

    if (!razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment verification fields' },
        { status: 400 }
      );
    }

    if (
      (razorpay_payment_id.startsWith('pay_mock_') || razorpay_signature.startsWith('mock_sig_')) &&
      !process.env.VITEST &&
      process.env.NODE_ENV !== 'test'
    ) {
      return NextResponse.json(
        { error: 'Simulated mock payments are disabled. Real payment through Razorpay or manual admin activation required.' },
        { status: 400 }
      );
    }

    // 1. Subscription Verification Flow
    if (razorpay_subscription_id) {
      const isValid = razorpayService.verifySubscriptionSignature({
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid subscription signature. Payment verification failed.' },
          { status: 400 }
        );
      }

      // Fetch subscription from store to know actual plan amount
      const sub = await store.getSubscriptionByRazorpayId(razorpay_subscription_id);
      const amount = sub?.amount || 9900;

      // Confirmed recurring subscription payment
      const updatedSub = await subscriptionService.handleSuccessfulPayment({
        subscriptionId: razorpay_subscription_id,
        paymentId: razorpay_payment_id,
        amount,
        currency: 'INR',
        paymentMethod: 'card',
        businessId: auth.orgId,
      });

      return NextResponse.json({
        success: true,
        message: 'Subscription payment successfully verified and activated',
        subscription: updatedSub,
      });
    }

    // 2. Standard Order Verification Flow
    if (razorpay_order_id) {
      const isValid = razorpayService.verifyOrderSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid order signature. Payment verification failed.' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Order payment successfully verified',
        payment_id: razorpay_payment_id,
      });
    }

    return NextResponse.json(
      { error: 'Either razorpay_order_id or razorpay_subscription_id must be provided' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error verifying payment:', err);
    return NextResponse.json(
      { error: err.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
