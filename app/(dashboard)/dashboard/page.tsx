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
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  PlusCircle,
} from 'lucide-react';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';

export default async function DashboardPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [analytics, quotations, invoices, organization] = await Promise.all([
    store.getDashboardAnalytics(orgId),
    store.getQuotations(orgId),
    store.getInvoices(orgId),
    store.getOrganization(orgId),
  ]);
  const currency = organization?.default_currency || 'USD';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Executive Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Overview of estimates, client reviews, approvals, deal pipeline, and invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/quotations/new">
              <Button variant="outline" className="gap-2 shadow-xs">
                <PlusCircle className="h-4 w-4" />
                <span>Create Quotation</span>
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button className="gap-2 shadow-md">
                <PlusCircle className="h-4 w-4" />
                <span>Create Invoice</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Pipeline</span>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(analytics.totalValue, currency)}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {analytics.totalCount} quotations generated
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Approved Revenue</span>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(analytics.approvedValue, currency)}
              </h3>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-500 font-medium mt-1">
                {analytics.approvedCount} approved ({analytics.winRate}% win rate)
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Approval</span>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {formatCurrency(analytics.pendingValue, currency)}
              </h3>
              <p className="text-xs text-amber-600/80 dark:text-amber-500 font-medium mt-1">
                {analytics.pendingCount} awaiting client decision
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Client Views</span>
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/60 p-2 text-purple-600 dark:text-purple-400">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-purple-700 dark:text-purple-400">
                {analytics.totalViews}
              </h3>
              <p className="text-xs text-purple-600/80 dark:text-purple-500 font-medium mt-1">
                Real-time portal visits tracked
              </p>
            </div>
          </div>
        </div>

        {/* Charts & Visual Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Quotation Pipeline Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monthly quote volume vs. closed-won revenue</p>
              </div>
            </div>
            <DashboardCharts monthlyData={analytics.monthlyData} currency={currency} />
          </div>

          {/* Quick Stats Breakdown */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Status Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Breakdown of all active estimates</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Drafts
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{analytics.draftCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                <span className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Review
                </span>
                <span className="font-bold text-amber-900 dark:text-amber-200">{analytics.pendingCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <span className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Approved & Signed
                </span>
                <span className="font-bold text-emerald-900 dark:text-emerald-200">{analytics.approvedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                <span className="flex items-center gap-2 font-medium text-rose-800 dark:text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Rejected / Revisions
                </span>
                <span className="font-bold text-rose-900 dark:text-rose-200">{analytics.rejectedCount}</span>
              </div>
            </div>

            <Link href="/quotations" className="block w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                View Complete List
              </Button>
            </Link>
          </div>
        </div>

        {/* Quotations & Invoices Tabs */}
        <DashboardTabs
          quotations={quotations}
          invoices={invoices}
          organization={organization}
        />
      </div>
    </DashboardLayout>
  );
}
