import React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { CustomersClientView } from '@/components/customers/customers-client-view';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export default async function CustomersPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const customers = await store.getCustomers(orgId);
  const quotations = await store.getQuotations(orgId);

  return (
    <DashboardLayout>
      <CustomersClientView initialCustomers={customers} quotations={quotations} />
    </DashboardLayout>
  );
}
