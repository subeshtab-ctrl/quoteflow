import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';

interface EditQuotationPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuotationPage({ params }: EditQuotationPageProps) {
  const { id } = await params;
  const quote = await store.getQuotationById(id);

  if (!quote) notFound();

  // If already approved, editing directly is locked (must create revision)
  if (quote.status === 'APPROVED') {
    redirect(`/quotations/${id}`);
  }

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
        initialQuotation={quote}
      />
    </DashboardLayout>
  );
}
