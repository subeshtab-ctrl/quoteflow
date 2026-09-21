import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { QuotationFormSchema } from '@/lib/validations/quotation';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  const quote = await store.getQuotationById(id);
  if (!quote) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, quotation: quote });
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = QuotationFormSchema.parse(body);

    const updated = await store.updateQuotation(id, validated);
    return NextResponse.json({ success: true, quotation: updated });
  } catch (err: any) {
    console.error('Error updating quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update quotation' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.status === 'APPROVED') {
      const updated = await store.markQuotationApproved(id, body.signer_name || 'Admin');
      return NextResponse.json({ success: true, quotation: updated });
    }
    const updated = await store.updateQuotation(id, body);
    return NextResponse.json({ success: true, quotation: updated });
  } catch (err: any) {
    console.error('Error in quotation PATCH:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update quotation' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const { id } = await params;
    await store.deleteQuotation(id);
    return NextResponse.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete quotation' },
      { status: 400 }
    );
  }
}

