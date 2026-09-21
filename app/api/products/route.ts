import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { ProductFormSchema } from '@/lib/validations/quotation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const products = await store.getProducts();
  return NextResponse.json({ success: true, products });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ProductFormSchema.parse(body);

    const product = await store.createProduct({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      name: validated.name,
      sku: validated.sku || null,
      description: validated.description || null,
      unit_price: validated.unit_price,
      unit: validated.unit || 'unit',
      tax_rate: validated.tax_rate,
      is_active: validated.is_active,
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
