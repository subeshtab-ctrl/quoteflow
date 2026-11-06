import React from 'react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { InvoiceDetailView } from '@/components/invoices/invoice-detail-view';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const invoice = await store.getInvoiceById(id, orgId);

  if (!invoice) notFound();

  return (
    <DashboardLayout>
      <InvoiceDetailView invoice={invoice} currentUserRole={auth?.role || 'STAFF'} />
    </DashboardLayout>
  );
}
