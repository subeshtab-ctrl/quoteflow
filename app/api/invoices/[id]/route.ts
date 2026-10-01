import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { InvoiceCancelSchema } from '@/lib/validations/quotation';

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

    // SECURITY: Cross-environment guard — never expose a record from the wrong environment
    const org = await store.getOrganization(orgId);
    const activeEnv = org?.mode === 'test' ? 'test' : 'live';
    const recordEnv = (invoice as any).environment ?? 'live';
    if (recordEnv !== activeEnv) {
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

    const actor = {
      name: auth?.fullName || auth?.email || 'Admin',
      role: auth?.role || 'ADMIN',
    };

    // Void / Cancel Action handling
    if (
      body.action === 'CANCEL' ||
      body.action === 'VOID' ||
      body.status === 'CANCELLED' ||
      body.status === 'VOIDED'
    ) {
      if (actor.role === 'STAFF') {
        return NextResponse.json(
          { error: 'Staff members cannot cancel or void invoices. Owner or Admin permission is required.' },
          { status: 403 }
        );
      }

      const parseResult = InvoiceCancelSchema.safeParse({
        reason: body.reason,
        action: body.action || (body.status === 'VOIDED' ? 'VOID' : 'CANCEL'),
      });

      if (!parseResult.success) {
        const errorMsg = parseResult.error.errors.map((e) => e.message).join('; ');
        return NextResponse.json({ error: errorMsg }, { status: 400 });
      }

      const cancelled = await store.cancelInvoice({
        id,
        orgId,
        reason: parseResult.data.reason,
        action: parseResult.data.action,
        actor,
      });

      return NextResponse.json({
        success: true,
        invoice: cancelled,
        message: `Invoice ${parseResult.data.action === 'VOID' ? 'voided' : 'cancelled'} successfully`,
      });
    }

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const updated = await store.updateInvoiceStatus(
      id,
      orgId,
      body.status,
      {
        payment_method: body.payment_method,
        payment_notes: body.payment_notes,
        advance_payment_notes: body.advance_payment_notes,
        final_payment_notes: body.final_payment_notes,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;

    const userRole = auth?.role || 'ADMIN';
    if (userRole === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff members are not permitted to delete invoices.' },
        { status: 403 }
      );
    }

    const invoice = await store.getInvoiceById(id, orgId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.organization_id && invoice.organization_id !== orgId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete invoice from another organization' },
        { status: 403 }
      );
    }

    // Live invoices CANNOT be permanently deleted
    if (invoice.environment === 'live') {
      return NextResponse.json(
        { error: 'Live invoices cannot be permanently deleted. You can cancel or void the invoice instead.' },
        { status: 403 }
      );
    }

    await store.deleteInvoice(id, orgId, userRole);

    return NextResponse.json({
      success: true,
      message: 'Test invoice deleted permanently.',
    });
  } catch (err: any) {
    console.error('Error deleting invoice:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
