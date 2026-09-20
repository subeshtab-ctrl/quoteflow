import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { CustomerFormSchema } from '@/lib/validations/quotation';

export async function GET() {
  const customers = await store.getCustomers();
  return NextResponse.json({ success: true, customers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CustomerFormSchema.parse(body);

    const customer = await store.createCustomer({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      name: validated.name,
      company_name: validated.company_name,
      email: validated.email,
      phone: validated.phone,
      alternate_phone: validated.alternate_phone,
      billing_address: validated.billing_address,
      shipping_address: validated.shipping_address,
      city: validated.city,
      state: validated.state,
      country: validated.country,
      postal_code: validated.postal_code,
      tax_number: validated.tax_number,
      notes: validated.notes,
    });

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create customer' },
      { status: 400 }
    );
  }
}
