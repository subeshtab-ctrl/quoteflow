import React from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { calculateReportData } from '@/lib/reports/report-calculator';
import { ReportCenterView } from '@/components/reports/report-center-view';
import { ReportFilterState } from '@/lib/reports/report-types';
import { Organization } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const organization: Organization = (await store.getOrganization(orgId)) || auth?.organization || {
    id: orgId,
    name: 'QuoteFlow Technologies',
    slug: 'quoteflow',
    email: 'billing@quoteflow.app',
    default_currency: 'INR',
    default_tax_rate: 18,
    default_validity_days: 30,
    quotation_prefix: 'QT-',
    quotation_start_number: 1,
    current_quotation_counter: 1,
    mode: 'live',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const activeEnv = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const [quotations, invoices, customers, products] = await Promise.all([
    store.getQuotations(orgId, { environment: activeEnv }),
    store.getInvoices(orgId, { environment: activeEnv }),
    store.getCustomers(orgId, { environment: activeEnv }),
    store.getProducts(orgId),
  ]);

  const defaultFilters: ReportFilterState = {
    category: 'sales',
    reportType: 'sales-summary',
    preset: 'this_month',
    environment: activeEnv,
  };

  const initialReportData = calculateReportData({
    filters: defaultFilters,
    quotations,
    invoices,
    customers,
    products,
    organization: organization as any,
    userRole: auth?.role || 'OWNER',
  });

  return (
    <DashboardLayout>
      <ReportCenterView initialData={initialReportData} />
    </DashboardLayout>
  );
}
