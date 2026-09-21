import React from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { ProductsClientView } from '@/components/products/products-client-view';

export default async function ProductsPage() {
  const products = await store.getProducts();

  return (
    <DashboardLayout>
      <ProductsClientView initialProducts={products} />
    </DashboardLayout>
  );
}
