import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sub = await store.getBusinessSubscription(auth.orgId);
    if (!sub) {
      return NextResponse.json({ success: true });
    }

    // Only update if not already actively confirmed/paid
    if (sub.status !== 'active' && sub.payment_status === 'waiting') {
      sub.payment_status = 'cancelled';
      sub.updated_at = new Date().toISOString();
      await store.saveBusinessSubscription(sub);

      await store.logPaymentEvent({
        id: crypto.randomUUID(),
        provider: 'nowpayments',
        provider_event_id: sub.provider_invoice_id || `cancel_${Date.now()}`,
        organization_id: auth.orgId,
        subscription_id: sub.id,
        status: 'cancelled_by_user',
        payload: {
          reason: 'User returned from NOWPayments checkout or cancelled payment',
        },
        signature_verified: true,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, payment_status: sub.payment_status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel checkout' }, { status: 500 });
  }
}
