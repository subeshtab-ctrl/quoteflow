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
import {
  PlusCircle,
  Eye,
  Download,
  Share2,
  ExternalLink,
  MessageSquare,
  Search,
} from 'lucide-react';
import { QuotationsFilterTabs } from '@/components/quotations/quotations-filter-tabs';
import { QuotationDeleteButton } from '@/components/quotations/quotation-delete-button';
import { QuotationInvoiceButton } from '@/components/quotations/quotation-invoice-button';
import { QuotationPaymentButton } from '@/components/quotations/quotation-payment-button';
import { QuotationChatActionButton } from '@/components/quotations/quotation-chat-action-button';
import { ExportButton } from '@/components/export/export-button';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface QuotationsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const { status, search } = await searchParams;
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [quotations, organization] = await Promise.all([
    store.getQuotations(orgId, { status, search }),
    store.getOrganization(orgId),
  ]);

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
            <Link href="/quotations/new">
              <Button className="gap-2 shadow-md">
                <PlusCircle className="h-4 w-4" />
                <span>Create Quotation</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Tabs & Search Status */}
        <QuotationsFilterTabs currentStatus={status || 'ALL'} currentSearch={search || ''} />

        {/* Quotations Table */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="py-3.5 px-4">Quotation #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Project Title</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Views</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      No quotations found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  quotations.map((quote) => {
                    const publicLink = `/q/${quote.public_token}`;
                    const whatsappMsg = encodeURIComponent(
                      `Hello ${quote.customer?.name || ''}, please review quotation ${quote.quotation_number} (${formatCurrency(quote.grand_total, quote.currency)}). View online: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${publicLink}`
                    );

                    return (
                      <tr key={quote.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100">
                          <Link
                            href={`/quotations/${quote.id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
                          >
                            <span>{quote.quotation_number}</span>
                            {quote.revision_number > 1 && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                v{quote.revision_number}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {quote.customer?.company_name || quote.customer?.name || 'Unknown'}
                          </p>
                          {quote.customer?.company_name && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">{quote.customer.name}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                          {quote.title}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(quote.grand_total, quote.currency)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={quote.status} />
                            {quote.status === 'APPROVED' && (
                              <QuotationPaymentButton quotation={quote} variant="badge" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              quote.view_count > 0
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            <Eye className="h-3 w-3" />
                            {quote.view_count}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(quote.valid_until)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tax Invoice Option: only rendered for APPROVED quotations */}
                            <QuotationInvoiceButton
                              quotation={quote}
                              organization={organization}
                              customer={quote.customer}
                            />

                            {/* Chat Action Button (opens quotation to read chat; shows green dot live when unread) */}
                            <QuotationChatActionButton
                              quotationId={quote.id}
                              initialHasUnread={Boolean(quote.has_unread_chat)}
                              initialUnreadCount={quote.unread_chat_count || 0}
                            />

                            <Link href={`/quotations/${quote.id}`}>
                              <button
                                className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
                                title="View Details & Audit Log"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <a
                              href={`/api/public/pdf?id=${quote.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <a
                              href={`https://wa.me/?text=${whatsappMsg}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                              title="Share via WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                            <Link
                              href={publicLink}
                              target="_blank"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                              title="Open Customer Public Link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                            {auth?.role !== 'STAFF' && (
                              <QuotationDeleteButton
                                quotationId={quote.id}
                                quotationNumber={quote.quotation_number}
                              />
                            )}
                          </div>
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
