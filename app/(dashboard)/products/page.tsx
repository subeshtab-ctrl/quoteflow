import React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { ProductsClientView } from '@/components/products/products-client-view';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export default async function ProductsPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [products, organization] = await Promise.all([
    store.getProducts(orgId),
    store.getOrganization(orgId),
  ]);

  return (
    <DashboardLayout>
      <ProductsClientView
        initialProducts={products}
        currency={organization?.default_currency || 'USD'}
      />
    </DashboardLayout>
  );
}
