import React from 'react';
import Link from 'next/link';
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

interface QuotationsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const { status, search } = await searchParams;
  const quotations = await store.getQuotations(undefined, { status, search });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Quotations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage estimates, share links with customers, and monitor approval workflows.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
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
              <tbody className="divide-y divide-slate-100">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
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
                      <tr key={quote.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 font-bold text-slate-900">
                          <Link
                            href={`/quotations/${quote.id}`}
                            className="hover:text-indigo-600 hover:underline inline-flex items-center gap-1.5"
                          >
                            <span>{quote.quotation_number}</span>
                            {quote.revision_number > 1 && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                v{quote.revision_number}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800">
                            {quote.customer?.company_name || quote.customer?.name || 'Unknown'}
                          </p>
                          {quote.customer?.company_name && (
                            <p className="text-xs text-slate-400">{quote.customer.name}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-slate-700 max-w-xs truncate">
                          {quote.title}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900">
                          {formatCurrency(quote.grand_total, quote.currency)}
                        </td>
                        <td className="py-4 px-4">
                          <StatusBadge status={quote.status} />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              quote.view_count > 0
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-slate-400'
                            }`}
                          >
                            <Eye className="h-3 w-3" />
                            {quote.view_count}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {formatDate(quote.valid_until)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/quotations/${quote.id}`}>
                              <button
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                                title="View Details & Audit Log"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <a
                              href={`/api/public/pdf?id=${quote.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
