import React from 'react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { store } from '@/lib/supabase/data-store';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export default async function TestNewQuotationPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');
  const orgId = auth.orgId;

  await store.seedTestDemoCustomers(orgId);

  const [customers, products, organization] = await Promise.all([
    store.getCustomers(orgId, { environment: 'test' }),
    store.getProducts(orgId),
    store.getOrganization(orgId),
  ]);

  if (!organization) redirect('/onboarding');

  return (
    <QuotationBuilder
      customers={customers}
      products={products}
      organization={organization}
      testMode={true}
    />
  );
}
