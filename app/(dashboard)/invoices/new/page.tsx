import React from 'react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { InvoiceBuilder } from '@/components/invoices/invoice-builder';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface NewInvoicePageProps {
  searchParams: Promise<{
    from_quote_id?: string;
  }>;
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');

  const { from_quote_id } = await searchParams;
  const orgId = auth.orgId || 'a0000000-0000-0000-0000-000000000001';

  const organization = await store.getOrganization(orgId);
  if (!organization) {
    redirect('/onboarding');
  }

  const activeEnv = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const [customers, products, rawFromQuote, nextInvoiceNumber, existingInvoices] = await Promise.all([
    store.getCustomers(orgId, { environment: activeEnv }),
    store.getProducts(orgId),
    from_quote_id ? store.getQuotationById(from_quote_id, orgId) : Promise.resolve(null),
    store.peekNextInvoiceNumber(orgId),
    from_quote_id ? store.getInvoices(orgId, { environment: activeEnv }) : Promise.resolve([]),
  ]);

  // Security: only allow converting quotation if its environment matches current workspace
  const fromQuotation = rawFromQuote && (rawFromQuote.environment || 'live') === activeEnv ? rawFromQuote : null;

  const existingInvoice = from_quote_id && existingInvoices
    ? existingInvoices.find((inv) => inv.quotation_id === from_quote_id)
    : undefined;

  return (
    <DashboardLayout>
      <InvoiceBuilder
        customers={customers}
        products={products}
        organization={organization}
        fromQuotation={fromQuotation}
        initialInvoice={existingInvoice}
        suggestedInvoiceNumber={nextInvoiceNumber}
      />
    </DashboardLayout>
  );
}
