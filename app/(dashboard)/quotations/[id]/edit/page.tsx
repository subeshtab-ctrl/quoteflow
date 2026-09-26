import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface EditQuotationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = await params;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const quote = await store.getQuotationById(id, orgId);

  if (!quote) notFound();

  // If already approved or completed, direct editing is locked
  if (quote.status === 'APPROVED' || quote.status === 'PAYMENT_COMPLETED' || quote.status === 'COMPLETED') {
    redirect(`/quotations/${id}`);
  }

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
        initialQuotation={quote}
      />
    </DashboardLayout>
  );
}
