'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Quotation, Invoice, Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { StatusBadge, InvoiceStatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Receipt,
  PlusCircle,
  ArrowUpRight,
  Eye,
  Download,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { QuotationPaymentButton } from '@/components/quotations/quotation-payment-button';
import { QuotationChatActionButton } from '@/components/quotations/quotation-chat-action-button';

interface DashboardTabsProps {
  quotations: Quotation[];
  invoices: Invoice[];
  organization?: Organization | null;
}

export function DashboardTabs({
  quotations,
  invoices,
  organization,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'QUOTATIONS' | 'INVOICES'>('QUOTATIONS');

  const currency = organization?.default_currency || 'INR';
  const recentQuotations = quotations.slice(0, 7);
  const recentInvoices = invoices.slice(0, 7);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-5">
      {/* Tab Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('QUOTATIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'QUOTATIONS'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Quotations ({quotations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVOICES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'INVOICES'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices ({invoices.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'QUOTATIONS' ? (
            <>
              <Link
                href="/quotations"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View All ({quotations.length})</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/quotations/new">
                <Button size="sm" variant="primary" className="gap-1.5 text-xs shadow-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Quotation</span>
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/invoices"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View All ({invoices.length})</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/invoices/new">
                <Button size="sm" variant="primary" className="gap-1.5 text-xs shadow-xs">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Create Invoice</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Quotations Content */}
      {activeTab === 'QUOTATIONS' && (
        <div className="space-y-4">
          {recentQuotations.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No quotations found</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Create your first proposal to share with clients and track approvals online.
                </p>
              </div>
              <Link href="/quotations/new" className="inline-block">
                <Button size="sm" variant="primary" className="gap-1.5 shadow-sm">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Quotation</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  <tr>
                    <th className="py-3 px-4">Quotation #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentQuotations.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <Link
                          href={`/quotations/${quote.id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <span>{quote.quotation_number}</span>
                          {quote.revision_number > 1 && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-1 rounded">
                              v{quote.revision_number}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {quote.customer?.company_name || quote.customer?.name || 'Customer'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(quote.grand_total, quote.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={quote.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(quote.valid_until)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <QuotationChatActionButton
                            quotationId={quote.id}
                            initialHasUnread={Boolean(quote.has_unread_chat)}
                            initialUnreadCount={quote.unread_chat_count || 0}
                          />
                          <Link href={`/quotations/${quote.id}`}>
                            <button
                              className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/q/${quote.public_token}`} target="_blank">
                            <button
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                              title="Open Customer Link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Invoices Content */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          {recentInvoices.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No invoices generated yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Create an invoice directly without a quotation or convert from an approved estimate.
                </p>
              </div>
              <Link href="/invoices/new" className="inline-block">
                <Button size="sm" variant="primary" className="gap-1.5 shadow-sm">
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Invoice</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
                        >
                          <span>{inv.invoice_number}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {inv.customer?.company_name || inv.customer?.name || 'Customer'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(inv.grand_total, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/invoices/${inv.id}`}>
                          <button
                            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
