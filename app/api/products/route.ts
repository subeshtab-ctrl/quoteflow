import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { ProductFormSchema } from '@/lib/validations/quotation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const orgId = auth.orgId;
  const products = await store.getProducts(orgId);
  return NextResponse.json({ success: true, products });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;
    const body = await req.json();
    const validated = ProductFormSchema.parse(body);

    const product = await store.createProduct({
      organization_id: orgId,
      name: validated.name,
      sku: validated.sku || null,
      description: validated.description || null,
      unit_price: validated.unit_price,
      unit: validated.unit || 'unit',
      tax_rate: validated.tax_rate,
      is_active: validated.is_active,
      hsn_code: validated.hsn_code || null,
      classification_type: (validated.classification_type as any) || null,
      category: validated.category || null,
    });

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create product' },
      { status: 400 }
    );
  }
}
