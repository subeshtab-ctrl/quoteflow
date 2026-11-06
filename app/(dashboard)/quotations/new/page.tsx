import React from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface NewQuotationPageProps {
  searchParams?: Promise<{
    customerId?: string;
    customer_id?: string;
  }>;
}

export default async function NewQuotationPage({ searchParams }: NewQuotationPageProps) {
  const { customerId, customer_id } = (await searchParams) || {};
  const initialCustomerId = customerId || customer_id;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const organization = await store.getOrganization(orgId);
  const activeEnv = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const [customers, products] = await Promise.all([
    store.getCustomers(orgId, { environment: activeEnv }),
    store.getProducts(orgId),
  ]);

  return (
    <DashboardLayout>
      <QuotationBuilder
        customers={customers}
        products={products}
        organization={organization!}
        initialCustomerId={initialCustomerId}
      />
    </DashboardLayout>
  );
}
