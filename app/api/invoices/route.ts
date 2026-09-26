import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const customerId = searchParams.get('customerId') || undefined;

    const invoices = await store.getInvoices(orgId, { status, search, customerId });

    return NextResponse.json({ success: true, invoices });
  } catch (err: any) {
    console.error('Error fetching invoices:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    const body = await request.json();

    if (!body.customer_id) {
      return NextResponse.json(
        { error: 'Customer is required to generate an invoice' },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one line item is required' },
        { status: 400 }
      );
    }

    const invoice = await store.createInvoice({
      ...body,
      organization_id: orgId,
    });

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Invoice created successfully',
    });
  } catch (err: any) {
    console.error('Error creating invoice:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
