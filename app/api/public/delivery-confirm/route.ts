import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, delivery_status, delivery_recipient_name, delivery_signature_data_url, delivery_confirmed_at, delivery_notes } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
    }

    const invoice = await store.getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice / Delivery Note not found' }, { status: 404 });
    }

    if (invoice.delivery_status === 'DELIVERED' && invoice.delivery_signature_data_url) {
      return NextResponse.json({
        error: 'This delivery note has already been confirmed and signed.',
      }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'Unknown IP';

    const actor = {
      name: delivery_recipient_name || 'Customer Recipient',
      role: 'CUSTOMER_PORTAL',
    };

    const updatePayload = {
      delivery_status: 'DELIVERED',
      delivery_recipient_name: delivery_recipient_name || 'Recipient',
      delivery_signature_data_url: delivery_signature_data_url || null,
      delivery_confirmed_at: delivery_confirmed_at || new Date().toISOString(),
      delivery_notes: delivery_notes || invoice.delivery_notes,
      audit_history: [
        ...(invoice.audit_history || []),
        {
          id: `audit-${Date.now()}`,
          user_name: delivery_recipient_name || 'Customer Recipient',
          user_role: 'CUSTOMER',
          action: 'DIGITAL_DELIVERY_CONFIRMED',
          details: `Digital delivery confirmed & signed. IP: ${ip}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const updated = await store.updateInvoice(invoice.id, updatePayload, invoice.organization_id, actor);

    return NextResponse.json({
      success: true,
      invoice: updated,
      message: 'Delivery confirmed and signed successfully',
    });
  } catch (err: any) {
    console.error('Error in public delivery confirm:', err);
    return NextResponse.json({ error: err.message || 'Failed to confirm delivery' }, { status: 500 });
  }
}
