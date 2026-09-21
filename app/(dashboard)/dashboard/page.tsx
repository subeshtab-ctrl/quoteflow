import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Eye,
  PlusCircle,
  ArrowUpRight,
  Download,
  Share2,
} from 'lucide-react';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';

export default async function DashboardPage() {
  const analytics = await store.getDashboardAnalytics();
  const quotations = await store.getQuotations();
  const recentQuotations = quotations.slice(0, 6);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Executive Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Overview of estimates, client reviews, approvals, and deal pipeline.
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

        {/* Analytics KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Pipeline</span>
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">
                {formatCurrency(analytics.totalValue, 'INR')}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {analytics.totalCount} quotations generated
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Approved Revenue</span>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-emerald-700">
                {formatCurrency(analytics.approvedValue, 'INR')}
              </h3>
              <p className="text-xs text-emerald-600/80 font-medium mt-1">
                {analytics.approvedCount} approved ({analytics.winRate}% win rate)
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Approval</span>
              <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-amber-700">
                {formatCurrency(analytics.pendingValue, 'INR')}
              </h3>
              <p className="text-xs text-amber-600/80 font-medium mt-1">
                {analytics.pendingCount} awaiting client decision
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Client Views</span>
              <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-purple-700">
                {analytics.totalViews}
              </h3>
              <p className="text-xs text-purple-600/80 font-medium mt-1">
                Real-time portal visits tracked
              </p>
            </div>
          </div>
        </div>

        {/* Charts & Visual Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Quotation Pipeline Trend</h3>
                <p className="text-xs text-slate-500">Monthly quote volume vs. closed-won revenue</p>
              </div>
            </div>
            <DashboardCharts monthlyData={analytics.monthlyData} />
          </div>

          {/* Quick Stats Breakdown */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Status Distribution</h3>
              <p className="text-xs text-slate-500">Breakdown of all active estimates</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Drafts
                </span>
                <span className="font-bold text-slate-900">{analytics.draftCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50">
                <span className="flex items-center gap-2 font-medium text-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Review
                </span>
                <span className="font-bold text-amber-900">{analytics.pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50">
                <span className="flex items-center gap-2 font-medium text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Approved & Signed
                </span>
                <span className="font-bold text-emerald-900">{analytics.approvedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50">
                <span className="flex items-center gap-2 font-medium text-rose-800">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Rejected / Revisions
                </span>
                <span className="font-bold text-rose-900">{analytics.rejectedCount}</span>
              </div>
            </div>

            <Link href="/quotations" className="block w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                View Complete List
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent Quotations Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Recent Quotations</h3>
              <p className="text-xs text-slate-500">Latest proposals sent to clients</p>
            </div>
            <Link
              href="/quotations"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentQuotations.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">No quotations found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your pipeline is currently clear. Create your first quotation to start generating proposals and tracking deals.
                </p>
              </div>
              <Link href="/quotations/new" className="inline-block">
                <Button size="sm" variant="primary" className="gap-1.5 shadow-sm">
                  <PlusCircle className="h-4 w-4" />
                  Create New Quotation
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/50">
                  <tr>
                    <th className="py-3 px-4">Quotation #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentQuotations.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          href={`/quotations/${quote.id}`}
                          className="hover:text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {quote.quotation_number}
                          {quote.revision_number > 1 && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (v{quote.revision_number})
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800">
                          {quote.customer?.company_name || quote.customer?.name || 'Unknown'}
                        </p>
                        {quote.customer?.company_name && (
                          <p className="text-xs text-slate-400">{quote.customer.name}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatCurrency(quote.grand_total, quote.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={quote.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(quote.issue_date)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(quote.valid_until)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/quotations/${quote.id}`}>
                            <button
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                              title="View Details"
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
                          <Link
                            href={`/q/${quote.public_token}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Open Customer Public Link"
                          >
                            <Share2 className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
}
