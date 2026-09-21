import React from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';

export default async function NewQuotationPage() {
  const [customers, products, organization] = await Promise.all([
    store.getCustomers(),
    store.getProducts(),
    store.getOrganization(),
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
