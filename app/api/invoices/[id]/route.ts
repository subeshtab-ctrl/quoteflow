import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;

    const invoice = await store.getInvoiceById(id, orgId);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    console.error('Error fetching invoice:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    const body = await request.json();

    const actor = {
      name: auth?.fullName || auth?.email || 'Admin',
      role: auth?.role || 'ADMIN',
    };

    const updated = await store.updateInvoice(id, body, orgId, actor);

    return NextResponse.json({
      success: true,
      invoice: updated,
      message: 'Invoice updated successfully',
    });
  } catch (err: any) {
    console.error('Error updating invoice:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const actor = {
      name: auth?.fullName || auth?.email || 'Admin',
      role: auth?.role || 'ADMIN',
    };

    const updated = await store.updateInvoiceStatus(
      id,
      orgId,
      body.status,
      {
        payment_method: body.payment_method,
        payment_notes: body.payment_notes,
      },
      actor
    );

    return NextResponse.json({
      success: true,
      invoice: updated,
      message: 'Invoice status updated successfully',
    });
  } catch (err: any) {
    console.error('Error updating invoice status:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update invoice status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Invoices cannot be deleted once created for financial auditing and legal compliance.' },
    { status: 403 }
  );
}
