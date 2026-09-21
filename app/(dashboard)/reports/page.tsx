import React from 'react';

export const dynamic = 'force-dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { BarChart3, TrendingUp, CheckCircle2, Clock, XCircle, Award } from 'lucide-react';

import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export default async function ReportsPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  const [analytics, quotations, organization] = await Promise.all([
    store.getDashboardAnalytics(orgId),
    store.getQuotations(orgId),
    store.getOrganization(orgId),
  ]);
  const currency = organization?.default_currency || 'USD';

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze quote-to-close metrics, customer velocity, and deal conversion rates.
          </p>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Win Rate
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-emerald-600">{analytics.winRate}%</h3>
              <span className="text-xs text-emerald-700 font-medium">Conversion</span>
            </div>
            <p className="text-xs text-slate-400">Approved out of total quotes</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Closed Revenue
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900">
                {formatCurrency(analytics.approvedValue, currency)}
              </h3>
            </div>
            <p className="text-xs text-slate-400">Total digitally accepted value</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avg Time to Decision
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-indigo-600">2.4</h3>
              <span className="text-xs text-indigo-700 font-medium">Days</span>
            </div>
            <p className="text-xs text-slate-400">From issue to customer approval</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Client Portal Views
            </span>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-purple-600">{analytics.totalViews}</h3>
              <span className="text-xs text-purple-700 font-medium">Visits</span>
            </div>
            <p className="text-xs text-slate-400">Unique view sessions logged</p>
          </div>
        </div>

        {/* Monthly Performance Charts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Revenue Performance by Month</h3>
              <p className="text-xs text-slate-500">Pipeline vs. executed quotation agreements</p>
            </div>
          </div>
          <DashboardCharts monthlyData={analytics.monthlyData} currency={currency} />
        </div>
      </div>
    </DashboardLayout>
  );
}
