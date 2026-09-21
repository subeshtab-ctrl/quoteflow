import React from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export default async function NewQuotationPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [customers, products, organization] = await Promise.all([
    store.getCustomers(orgId),
    store.getProducts(orgId),
    store.getOrganization(orgId),
  ]);

  return (
    <DashboardLayout>
      <QuotationBuilder
        customers={customers}
        products={products}
        organization={organization!}
      />
    </DashboardLayout>
  );
}
