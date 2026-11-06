import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { findCountry, getBillingDetailsForCountry } from '@/lib/billing/country-rules';
import { isOwnerOrAdminRole } from '@/types/staff';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOwnerOrAdminRole(auth.role)) {
      return NextResponse.json(
        { error: 'Only account Owners and Admins can update business country' },
        { status: 403 }
      );
    }

    const org = await store.getOrganization(auth.orgId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const sub = await store.getBusinessSubscription(auth.orgId);
    const hasActivePaidSub = sub && sub.status === 'active' && Boolean(sub.last_payment_id);
    const isLocked = Boolean(org.country_locked || hasActivePaidSub);

    const body = await req.json().catch(() => ({}));
    const rawCountryCode = (body.country_code || body.business_country || '').trim();

    if (!rawCountryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    const countryMeta = findCountry(rawCountryCode);

    // If locked and attempting to change to a different country
    if (isLocked && org.business_country && org.business_country.toUpperCase() !== countryMeta.code.toUpperCase()) {
      return NextResponse.json(
        {
          error:
            'Your business location is locked because of an active paid subscription. Changing countries to switch regional pricing is restricted. Please contact support for an admin review.',
          country_locked: true,
        },
        { status: 403 }
      );
    }

    const rules = await store.getPaymentCountryRules();
    const billingDetails = getBillingDetailsForCountry(countryMeta.code, rules);

    const updatedOrg = await store.updateOrganization(auth.orgId, {
      business_country: countryMeta.code,
      business_country_name: countryMeta.name,
      billing_region: billingDetails.billingRegion,
      billing_currency: billingDetails.billingCurrency,
      payment_provider: billingDetails.paymentProvider,
      country: countryMeta.name,
    });

    // Update subscription billing metadata
    if (sub) {
      sub.billing_country = countryMeta.code;
      sub.billing_region = billingDetails.billingRegion;
      sub.billing_currency = billingDetails.billingCurrency;
      sub.provider = billingDetails.paymentProvider.toLowerCase() as any;
      await store.saveBusinessSubscription(sub);
    }

    // Audit log
    await store.logAdminAudit({
      id: crypto.randomUUID(),
      admin_user_id: auth.userId,
      admin_email: auth.email,
      action: 'SET_BUSINESS_COUNTRY',
      target_type: 'organization',
      target_id: auth.orgId,
      organization_id: auth.orgId,
      customer_id: null,
      previous_value: {
        country: org.business_country || org.country,
      },
      new_value: {
        country_code: countryMeta.code,
        country_name: countryMeta.name,
        billing_region: billingDetails.billingRegion,
        billing_currency: billingDetails.billingCurrency,
        payment_provider: billingDetails.paymentProvider,
      },
      reason: body.reason || 'User onboarding/settings business location update',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      businessCountry: countryMeta.code,
      businessCountryName: countryMeta.name,
      flag: countryMeta.flag,
      billingRegion: billingDetails.billingRegion,
      billingCurrency: billingDetails.billingCurrency,
      planAmount: billingDetails.planAmount,
      paymentProvider: billingDetails.paymentProvider,
      isEligible: billingDetails.isEligible,
      unsupportedMessage: billingDetails.unsupportedMessage,
    });
  } catch (err: any) {
    console.error('Error saving business country:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
