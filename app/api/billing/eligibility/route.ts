import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import {
  ALL_COUNTRIES,
  getBillingDetailsForCountry,
  findCountry,
} from '@/lib/billing/country-rules';
import { isOwnerOrAdminRole } from '@/types/staff';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await store.getOrganization(auth.orgId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const rules = await store.getPaymentCountryRules();

    // Check if user has explicit saved business country (staff accounts inherit admin/org country and never select)
    const rawCountry = org.business_country || null;
    const isStaff = !isOwnerOrAdminRole(auth.role);
    const needsCountrySelection = !rawCountry && !isStaff;

    // Resolve country details
    const resolvedCountry = rawCountry || org.country || 'IN';
    const billingDetails = getBillingDetailsForCountry(resolvedCountry, rules);

    const sub = await store.getBusinessSubscription(auth.orgId);
    const countryLocked = Boolean(
      org.country_locked ||
      (sub && sub.status === 'active' && sub.last_payment_id)
    );

    return NextResponse.json({
      success: true,
      needsCountrySelection,
      businessCountry: billingDetails.countryCode,
      businessCountryName: billingDetails.countryName,
      flag: billingDetails.flag,
      billingRegion: billingDetails.billingRegion,
      billingCurrency: billingDetails.billingCurrency,
      planAmount: billingDetails.planAmount,
      paymentProvider: billingDetails.paymentProvider,
      isEligible: billingDetails.isEligible,
      unsupportedMessage: billingDetails.unsupportedMessage,
      countryLocked,
      allCountries: ALL_COUNTRIES,
      subscription: sub,
    });
  } catch (err: any) {
    console.error('Error fetching billing eligibility:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
