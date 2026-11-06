import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/supabase/data-store';
import { subscriptionService } from '@/lib/billing/subscription-service';
import { CustomerFormSchema } from '@/lib/validations/quotation';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { staffService } from '@/lib/staff/staff-service';
import { isOwnerOrAdminRole } from '@/types/staff';

export async function GET() {
  const auth = await getAuthenticatedUserContext();
  if (!auth || !auth.orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canView =
    isOwnerOrAdminRole(auth.role) ||
    staffService.hasPermission(auth.role, undefined, 'customers_view');
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view customers' }, { status: 403 });
  }

  const orgId = auth.orgId;
  const org = await store.getOrganization(orgId);
  const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
  const customers = await store.getCustomers(orgId, { environment: env });

  // Exclude master developer admin account from customer lists
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const filteredCustomers = adminEmail
    ? customers.filter((c) => (c.email || '').trim().toLowerCase() !== adminEmail)
    : customers;

  return NextResponse.json({ success: true, customers: filteredCustomers });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = auth.orgId;

    const canCreate =
      isOwnerOrAdminRole(auth.role) ||
      staffService.hasPermission(auth.role, undefined, 'customers_create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to create customers' }, { status: 403 });
    }

    // Enforce subscription restriction after 3-day grace period
    const access = await subscriptionService.getBusinessSubscriptionAccess(orgId);
    if (!access.allowed || access.isRestricted) {
      return NextResponse.json(
        {
          error:
            auth.role === 'STAFF'
              ? "Your organization's QuoteFlow subscription has expired. Please contact your administrator."
              : `Your ${access.priceDisplay || 'subscription'} payment is overdue. Please complete payment to restore full QuoteFlow access.`,
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
      state: validated.state || validated.billing_state,
      billing_state: validated.billing_state || validated.state,
      state_code: validated.state_code,
      place_of_supply: validated.place_of_supply || validated.billing_state || validated.state,
      country: validated.country,
      postal_code: validated.postal_code,
      tax_number: validated.tax_number || validated.customer_gstin,
      customer_gstin: validated.customer_gstin || validated.tax_number,
      notes: validated.notes,
      whatsapp_enabled: validated.whatsapp_enabled !== false,
      email_enabled: validated.email_enabled !== false,
      whatsapp_opt_in: validated.whatsapp_opt_in !== false,
      environment: env,
    });

    // Log staff activity
    await staffService.logStaffActivity({
      organization_id: orgId,
      user_id: auth.userId,
      user_name: auth.fullName || auth.email,
      user_email: auth.email,
      user_role: auth.role,
      action: 'CREATE',
      action_key: 'customer_created',
      module: 'CUSTOMER',
      target_id: customer.id,
      target_identifier: customer.name,
      details: `Created customer "${customer.name}" (${customer.company_name || 'Individual'})`,
      diff: {
        name: customer.name,
        company_name: customer.company_name,
        email: customer.email,
        phone: customer.phone,
      },
    }).catch((err) => console.warn('Failed to log staff activity on customer creation:', err));

    return NextResponse.json({ success: true, customer });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create customer' },
      { status: 400 }
    );
  }
}
