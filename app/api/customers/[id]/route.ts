import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
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
  const customer = await store.getCustomerById(id, orgId);
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, customer });
}

export async function PUT(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    const body = await req.json();
    const updated = await store.updateCustomer(id, { ...body, organization_id: orgId });
    return NextResponse.json({ success: true, customer: updated });
  } catch (err: any) {
    console.error('Error updating customer:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update customer' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteProps) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    await store.deleteCustomer(id, orgId);
    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting customer:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete customer' },
      { status: 400 }
    );
  }
}
