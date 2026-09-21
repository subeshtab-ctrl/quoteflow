import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { ProductFormSchema } from '@/lib/validations/quotation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    const body = await req.json();
    const validated = ProductFormSchema.parse(body);

    const updated = await store.updateProduct(id, {
      organization_id: orgId,
      name: validated.name,
      sku: validated.sku || null,
      description: validated.description || null,
      unit_price: validated.unit_price,
      unit: validated.unit || 'unit',
      tax_rate: validated.tax_rate,
      is_active: validated.is_active,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    console.error('Error updating product:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update product' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { id } = await params;
    await store.deleteProduct(id, orgId);
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete product' },
      { status: 400 }
    );
  }
}
