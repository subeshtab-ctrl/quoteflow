import React from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { ProductsClientView } from '@/components/products/products-client-view';

export default async function ProductsPage() {
  const [products, organization] = await Promise.all([
    store.getProducts(),
    store.getOrganization(),
  ]);

  return (
    <DashboardLayout>
      <ProductsClientView
        initialProducts={products}
        currency={organization?.default_currency || 'INR'}
      />
    </DashboardLayout>
  );
}
