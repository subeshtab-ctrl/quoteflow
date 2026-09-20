import React from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { CustomersClientView } from '@/components/customers/customers-client-view';

export default async function CustomersPage() {
  const customers = await store.getCustomers();
  const quotations = await store.getQuotations();

  return (
    <DashboardLayout>
      <CustomersClientView initialCustomers={customers} quotations={quotations} />
    </DashboardLayout>
  );
}
