import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, Search, X, Users, User } from 'lucide-react';
import { QuotationsFilterTabs } from '@/components/quotations/quotations-filter-tabs';
import { QuotationPaymentButton } from '@/components/quotations/quotation-payment-button';
import { QuotationRowActions } from '@/components/quotations/quotation-row-actions';
import { ExportButton } from '@/components/export/export-button';
import { staffCommentService } from '@/lib/comments/staff-comment-service';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface QuotationsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    customerId?: string;
    customer_id?: string;
  }>;
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const { status, search, customerId, customer_id } = await searchParams;
  const activeCustomerId = customerId || customer_id;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [organization, customer] = await Promise.all([
    store.getOrganization(orgId),
    activeCustomerId ? store.getCustomer(activeCustomerId) : Promise.resolve(null),
  ]);
  const env = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const quotations = await store.getQuotations(orgId, {
    status,
    search,
    customerId: activeCustomerId,
    environment: env,
  });

  const quotationIds = quotations.map((q) => q.id);
  const commentStatuses = await staffCommentService.getBatchNotificationStatus(
    quotationIds,
    orgId,
    auth?.userId || ''
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Quotations
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage estimates, share links with customers, and monitor approval workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ExportButton defaultDateFilter="THIS_MONTH" />
            <Link href={activeCustomerId ? `/quotations/new?customerId=${activeCustomerId}` : '/quotations/new'}>
              <Button className="gap-2 shadow-md">
                <PlusCircle className="h-4 w-4" />
                <span>Create Quotation</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs & Quick Search */}
        <QuotationsFilterTabs currentStatus={status || 'ALL'} currentSearch={search || ''} />

        {/* Active Customer Filter Banner */}
        {activeCustomerId && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/90 via-indigo-50/60 to-purple-50/70 dark:from-indigo-950/60 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-900/60 px-4 py-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {customer?.name ? customer.name.slice(0, 2).toUpperCase() : 'CU'}
              </div>
              <div className="text-xs">
                <p className="text-slate-500 dark:text-slate-400 font-medium">Filtering by customer</p>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {customer?.name || 'Selected Customer'}
                  {customer?.company_name && (
                    <span className="text-slate-500 font-normal ml-1.5">({customer.company_name})</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Link
                href={`/quotations/new?customerId=${activeCustomerId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>+ New Quote for {customer?.name ? customer.name.split(' ')[0] : 'Customer'}</span>
              </Link>
              <Link
                href={status ? `/quotations?status=${status}` : '/quotations'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition"
                title="Show quotations for all customers"
              >
                <X className="h-3.5 w-3.5" />
                <span>Show All Quotes</span>
              </Link>
            </div>
          </div>
        )}

        {/* Search Query Active Pill */}
        {search && (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-3 py-1.5 rounded-xl w-fit">
            <Search className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              Showing results for: <strong className="font-semibold text-indigo-700 dark:text-indigo-300">"{search}"</strong>
            </span>
            <Link
              href={status ? `/quotations?status=${status}` : '/quotations'}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1"
              title="Clear search filter"
            >
              <X className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Quotations Table */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Quotation #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Project Title</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Amount</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Views</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Valid Until</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 dark:text-slate-500">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center font-bold text-lg">
                          QF
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {activeCustomerId
                            ? `No quotations found for ${customer?.name || 'this customer'}`
                            : 'No quotations found'}
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          {activeCustomerId
                            ? `There are no quotations on file specifically for ${customer?.name || 'this customer'}. You can create one now in a few clicks.`
                            : search
                            ? `No estimates matched "${search}". Try clearing your search filter.`
                            : 'Create your first proposal to start tracking customer approvals and payments.'}
                        </p>
                        {activeCustomerId && (
                          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                            <Link href={`/quotations/new?customerId=${activeCustomerId}`}>
                              <Button size="sm" className="gap-1.5 shadow-sm text-xs">
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span>Create Quote for {customer?.name?.split(' ')[0] || 'Customer'}</span>
                              </Button>
                            </Link>
                            <Link
                              href="/quotations"
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Show all quotations
                            </Link>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map((quote) => {
                    const publicLink = `/q/${quote.public_token}`;

                    return (
                      <tr
                        key={quote.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Quotation Number: Never wraps, styled badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/quotations/${quote.id}`}
                              className="inline-flex items-center gap-1.5 group/link"
                            >
                              <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-900/60 px-2.5 py-1 rounded-lg group-hover/link:border-indigo-400 group-hover/link:bg-indigo-100/70 transition-all shadow-2xs">
                                {quote.quotation_number}
                              </span>
                              {(quote.revision_number > 1 || quote.quotation_number.includes('-REV')) && (
                                <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800 uppercase">
                                  {quote.quotation_number.match(/[-_](REV|rev)[-_]?(\d+)/i)?.[0]?.replace(/^[-_]/, '') || `REV ${quote.revision_number - 1}`}
                                </span>
                              )}
                            </Link>

                            {/* Staff Comment Smart Unread Indicator on Quotation List */}
                            {commentStatuses[quote.id]?.hasUnreadMention ? (
                              <span
                                title={`Unread direct mention in staff comments (${commentStatuses[quote.id]?.unreadMentionCount})`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/60 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs"
                              >
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">@</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
                              </span>
                            ) : commentStatuses[quote.id]?.hasUnread ? (
                              <span
                                title={`Unread staff comments (${commentStatuses[quote.id]?.unreadCount})`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-700/50 text-[10px] text-emerald-600 dark:text-emerald-400 shadow-2xs"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-xs" />
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4 min-w-[170px]">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                            {quote.customer?.company_name || quote.customer?.name || 'Unknown'}
                          </p>
                          {quote.customer?.company_name && quote.customer?.name && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {quote.customer.name}
                            </p>
                          )}
                        </td>

                        {/* Project Title */}
                        <td
                          className="py-4 px-4 text-slate-600 dark:text-slate-300 max-w-[220px] truncate"
                          title={quote.title}
                        >
                          {quote.title}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-4 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(quote.grand_total, quote.currency)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge
                              status={quote.status}
                              isPaid={quote.is_paid}
                              completedUnpaid={quote.completed_unpaid}
                              paymentStatus={quote.payment_status}
                              paidAmount={quote.paid_amount}
                              quotation={quote}
                            />
                            {['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(
                              quote.status
                            ) && <QuotationPaymentButton quotation={quote} variant="badge" />}
                          </div>
                        </td>

                        {/* Views */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-md ${
                              quote.view_count > 0
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200/60 dark:border-purple-900/50'
                                : 'text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40'
                            }`}
                          >
                            <Eye className="h-3 w-3" />
                            {quote.view_count}
                          </span>
                        </td>

                        {/* Valid Until */}
                        <td className="py-4 px-4 whitespace-nowrap font-mono text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(quote.valid_until)}
                        </td>

                        {/* Actions (Executive 1-primary + Dropdown Menu) */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <QuotationRowActions
                            quotation={quote}
                            organization={organization}
                            customer={quote.customer}
                            currentUserRole={auth?.role}
                            publicLink={publicLink}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
