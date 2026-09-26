import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { QuotationFormSchema } from '@/lib/validations/quotation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, { params }: RouteProps) {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const { id } = await params;
  const quote = await store.getQuotationById(id, orgId);
  if (!quote) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, quotation: quote });
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    const body = await req.json();
    const validated = QuotationFormSchema.parse(body);

    const updated = await store.updateQuotation(id, validated, orgId);
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
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    const body = await req.json();
    if (body.status === 'APPROVED') {
      const updated = await store.markQuotationApproved(id, body.signer_name || auth?.fullName || 'Admin');
      return NextResponse.json({ success: true, quotation: updated });
    }
    if (body.status === 'COMPLETED') {
      const updated = await store.markQuotationCompleted(
        id,
        orgId,
        body.signer_name || auth?.fullName || 'Business User',
        { unpaid: body.unpaid, reason: body.unpaidReason || body.reason }
      );
      return NextResponse.json({ success: true, quotation: updated });
    }
    const updated = await store.updateQuotation(id, body, orgId);
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
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.role === 'STAFF') {
      return NextResponse.json(
        { error: 'Staff members are not permitted to delete quotations. Please contact the company owner.' },
        { status: 403 }
      );
    }

    const orgId = auth.orgId;
    const { id } = await params;
    await store.deleteQuotation(id, orgId);
    return NextResponse.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting quotation:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete quotation' },
      { status: 400 }
    );
  }
}

