import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate, cn } from '@/lib/utils';
import { InvoiceStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Eye,
  Download,
  Receipt,
  FileText,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { InvoicesFilterTabs } from '@/components/invoices/invoices-filter-tabs';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface InvoicesPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const { status, search } = await searchParams;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const organization = await store.getOrganization(orgId);
  const env = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const invoices = await store.getInvoices(orgId, { status, search, environment: env });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
              <span>Invoices</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Issue commercial tax invoices directly or from approved estimates, track payment settlements and receipts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/invoices/new">
              <Button className="gap-2 shadow-md">
                <PlusCircle className="h-4 w-4" />
                <span>Create Invoice</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <InvoicesFilterTabs
          currentStatus={status || 'ALL'}
          currentSearch={search || ''}
        />

        {/* Invoices Table */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      <div className="max-w-xs mx-auto space-y-3">
                        <Receipt className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {search ? 'No matching invoices found' : 'No invoices found'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search
                            ? `No invoices matched "${search}". Try searching by customer, invoice #, or transaction reference.`
                            : 'Create an invoice directly without a quote or convert from an approved estimate.'}
                        </p>
                        {!search && (
                          <Link href="/invoices/new" className="inline-block pt-1">
                            <Button size="sm" variant="primary">
                              + Create First Invoice
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={cn(
                        'hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors',
                        (inv.status === 'CANCELLED' || inv.status === 'VOIDED') && 'opacity-70 bg-slate-50/30 dark:bg-slate-900/30'
                      )}
                    >
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className={cn(
                              'hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline inline-flex items-center gap-1.5',
                              (inv.status === 'CANCELLED' || inv.status === 'VOIDED') && 'line-through text-slate-500 dark:text-slate-400'
                            )}
                          >
                            <span>{inv.invoice_number}</span>
                          </Link>
                          {inv.environment === 'test' && env === 'test' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              🧪 TEST
                            </span>
                          )}
                          {inv.quotation_id && (
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                              from quote
                            </span>
                          )}
                        </div>
                        {/* Transaction Reference Display */}
                        {(inv.advance_payment_notes || inv.final_payment_notes || inv.payment_notes) && (
                          <div className="mt-1 text-[11px] font-normal text-slate-500 font-mono flex flex-wrap items-center gap-1.5">
                            {inv.advance_payment_notes && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                Adv: {inv.advance_payment_notes}
                              </span>
                            )}
                            {inv.final_payment_notes && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                Final: {inv.final_payment_notes}
                              </span>
                            )}
                            {!inv.advance_payment_notes && !inv.final_payment_notes && inv.payment_notes && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Ref: {inv.payment_notes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {inv.customer?.company_name || inv.customer?.name || 'Customer'}
                        </p>
                        {inv.customer?.company_name && (
                          <p className="text-xs text-slate-400 dark:text-slate-500">{inv.customer.name}</p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(inv.grand_total, inv.currency)}
                      </td>
                      <td className="py-4 px-4">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/invoices/${inv.id}`}>
                            <button
                              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600"
                              title="View Invoice & Print"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
