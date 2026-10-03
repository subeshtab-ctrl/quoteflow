import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { CustomerFormSchema } from '@/lib/validations/quotation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';
  const org = await store.getOrganization(orgId);
  const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
  const customers = await store.getCustomers(orgId, { environment: env });
  return NextResponse.json({ success: true, customers });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

    // Enforce subscription restriction after 3-day grace period
    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    if (!access.allowed || access.isRestricted) {
      return NextResponse.json(
        {
          error: 'Your ₹99 subscription payment is overdue. Please complete payment to restore full QuoteFlow access.',
          code: 'SUBSCRIPTION_RESTRICTED',
          access,
        },
        { status: 402 }
      );
    }
    const body = await req.json();
    const validated = CustomerFormSchema.parse(body);

    // Tag customer with current org environment so it's isolated from the start
    const org = await store.getOrganization(orgId);
    const env = org?.mode === 'test' ? 'test' : 'live';

    const customer = await store.createCustomer({
      organization_id: orgId,
      name: validated.name,
      company_name: validated.company_name,
      auth_method: validated.auth_method,
      phone_country_code: validated.phone_country_code,
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
      environment: env,
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
