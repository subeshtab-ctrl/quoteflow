import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    const { id } = await params;
    const body = await request.json();

    if (typeof body.is_paid !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload: is_paid boolean is required' },
        { status: 400 }
      );
    }

    const updated = await store.updateQuotationPayment(
      id,
      {
        is_paid: body.is_paid,
        paid_at: body.paid_at || null,
        payment_method: body.payment_method || null,
        payment_notes: body.payment_notes || null,
      },
      orgId
    );

    return NextResponse.json({
      success: true,
      quotation: updated,
      message: body.is_paid
        ? 'Quotation marked as PAID successfully'
        : 'Quotation payment status updated to UNPAID',
    });
  } catch (err: any) {
    console.error('Payment update error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update payment status' },
      { status: 500 }
    );
  }
}
