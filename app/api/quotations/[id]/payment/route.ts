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

    if (typeof body.is_paid !== 'boolean' && typeof body.paid_amount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid payload: is_paid boolean or paid_amount number is required' },
        { status: 400 }
      );
    }

    const updated = await store.updateQuotationPayment(
      id,
      {
        is_paid: body.is_paid,
        paid_amount: typeof body.paid_amount === 'number' ? body.paid_amount : undefined,
        balance_amount: typeof body.balance_amount === 'number' ? body.balance_amount : undefined,
        advance_percentage: typeof body.advance_percentage === 'number' ? body.advance_percentage : undefined,
        payment_status: body.payment_status,
        payment_confirmed_by_company: body.payment_confirmed_by_company,
        paid_at: body.paid_at || null,
        payment_method: body.payment_method || null,
        payment_notes: body.payment_notes || null,
        confirmed_by: auth?.fullName || auth?.email || 'Company Finance Team',
      },
      orgId
    );

    let message = 'Quotation payment status updated to UNPAID';
    if (updated.is_paid) {
      message = 'Quotation marked as FULLY PAID successfully';
    } else if (updated.paid_amount && updated.paid_amount > 0) {
      message = `Advance payment of ${updated.currency} ${updated.paid_amount.toLocaleString()} recorded successfully`;
    }

    return NextResponse.json({
      success: true,
      quotation: updated,
      message,
    });
  } catch (err: any) {
    console.error('Payment update error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update payment status' },
      { status: 500 }
    );
  }
}
