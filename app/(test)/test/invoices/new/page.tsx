import React from 'react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { store } from '@/lib/supabase/data-store';
import { InvoiceBuilder } from '@/components/invoices/invoice-builder';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface NewTestInvoicePageProps {
  searchParams: Promise<{ from_quote_id?: string }>;
}

export default async function TestNewInvoicePage({ searchParams }: NewTestInvoicePageProps) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');

  const { from_quote_id } = await searchParams;
  const orgId = auth.orgId;

  await store.seedTestDemoCustomers(orgId);

  const [organization, customers, products, fromQuotation, nextInvoiceNumber, existingInvoices] = await Promise.all([
    store.getOrganization(orgId),
    store.getCustomers(orgId, { environment: 'test' }),
    store.getProducts(orgId),
    from_quote_id ? store.getQuotationById(from_quote_id, orgId) : Promise.resolve(null),
    store.peekNextInvoiceNumber(orgId),
    from_quote_id ? store.getInvoices(orgId, { environment: 'test' }) : Promise.resolve([]),
  ]);

  if (!organization) redirect('/onboarding');

  const existingInvoice = from_quote_id && existingInvoices
    ? existingInvoices.find((inv) => inv.quotation_id === from_quote_id)
    : undefined;

  return (
    <InvoiceBuilder
      customers={customers}
      products={products}
      organization={organization}
      fromQuotation={fromQuotation}
      initialInvoice={existingInvoice}
      suggestedInvoiceNumber={nextInvoiceNumber}
    />
  );
}
