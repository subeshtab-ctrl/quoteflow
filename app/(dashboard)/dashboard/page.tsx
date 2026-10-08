import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DashboardCharts, DashboardDonutChart } from '@/components/dashboard/dashboard-charts';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Eye,
  PlusCircle,
  Receipt,
  FileText,
  ArrowUpRight,
  Sparkles,
  Users,
} from 'lucide-react';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs';

// Mini SVG sparkline component for KPI cards
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default async function DashboardPage() {
  const auth = await getAuthenticatedUserContext();
  const orgId = auth?.orgId || 'a0000000-0000-0000-0000-000000000001';

  // Get org first to determine active environment, then scope all queries
  const organization = await store.getOrganization(orgId);
  const env = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const [analytics, quotations, invoices] = await Promise.all([
    store.getDashboardAnalytics(orgId, { environment: env }),
    store.getQuotations(orgId, { environment: env }),
    store.getInvoices(orgId, { environment: env }),
  ]);
  const currency = organization?.default_currency || 'INR';

  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (auth?.fullName || '').trim().split(' ')[0] || 'there';

  // Calculate invoice metrics
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const paidInvoicesTotal = paidInvoices.reduce((sum, i) => sum + (i.paid_amount || i.grand_total || 0), 0);
  const outstandingInvoices = invoices.filter((i) => i.status === 'PARTIAL' || i.status === 'OVERDUE');
  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

  // Extract top clients
  const clientMap = new Map<string, { name: string; count: number; total: number }>();
  quotations.forEach((q) => {
    const name = (q as any).customer?.name || (q as any).customer_name || (q as any).client_name || q.title || 'Client';
    const existing = clientMap.get(name) || { name, count: 0, total: 0 };
    existing.count += 1;
    existing.total += q.grand_total || 0;
    clientMap.set(name, existing);
  });
  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Top Executive Greeting & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {greetingTime}, {firstName} 👋
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Here is what&apos;s happening across your quotations, client approvals, and revenue.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/quotations/new">
              <Button variant="outline" className="gap-2 shadow-2xs text-xs font-semibold">
                <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>New Quote</span>
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button className="gap-2 shadow-sm text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                <Receipt className="h-3.5 w-3.5" />
                <span>New Invoice</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 KPI Metric Cards with Sparklines & Trend Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Total Pipeline */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Pipeline
              </span>
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {formatCurrency(analytics.totalValue, currency)}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 text-[11px]">
                  ↑ {analytics.totalCount} Quotes generated
                </span>
                <Sparkline data={[12, 19, 15, 25, 22, 30, 28, 35]} color="#6366f1" />
              </div>
            </div>
          </div>

          {/* KPI 2: Approved Revenue */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Approved Revenue
              </span>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatCurrency(analytics.approvedValue, currency)}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  {analytics.winRate}% Win rate
                </span>
                <Sparkline data={[8, 14, 18, 16, 24, 28, 32, 38]} color="#10b981" />
              </div>
            </div>
          </div>

          {/* KPI 3: Pending Approval */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Approval
              </span>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-2 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {formatCurrency(analytics.pendingValue, currency)}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                  {analytics.pendingCount} awaiting client signature
                </span>
                <Sparkline data={[20, 18, 22, 19, 21, 16, 18, 15]} color="#f59e0b" />
              </div>
            </div>
          </div>

          {/* KPI 4: Client Portal Views */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client Views
              </span>
              <div className="rounded-xl bg-violet-50 dark:bg-violet-950/60 p-2 text-violet-600 dark:text-violet-400">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
                {analytics.totalViews}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-violet-600 dark:text-violet-400 font-medium text-[11px]">
                  Real-time link visits
                </span>
                <Sparkline data={[5, 12, 18, 25, 30, 42, 48, 55]} color="#8b5cf6" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Status Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales & Pipeline Trend Area Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Sales &amp; Pipeline Overview
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monthly quote volume vs. closed approved revenue
                </p>
              </div>
            </div>
            <DashboardCharts monthlyData={analytics.monthlyData} currency={currency} />
          </div>

          {/* Quotation Status Distribution Donut Chart */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Quotation Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distribution of all deal proposals
              </p>
            </div>

            <DashboardDonutChart
              distribution={{
                approved: analytics.approvedCount,
                pending: analytics.pendingCount,
                draft: analytics.draftCount,
                rejected: analytics.rejectedCount,
              }}
              totalCount={analytics.totalCount}
              winRate={analytics.winRate}
            />

            <Link href="/quotations" className="block w-full pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                Manage Quotations
              </Button>
            </Link>
          </div>
        </div>

        {/* Top Clients Summary Cards */}
        {topClients.length > 0 && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>Top Accounts &amp; Clients</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Highest value accounts in your workspace
                </p>
              </div>
              <Link
                href="/customers"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View all clients</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topClients.map((client, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {client.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {client.count} quote{client.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="font-black text-xs text-slate-900 dark:text-slate-100">
                    {formatCurrency(client.total, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quotations & Invoices Tabs Table */}
        <DashboardTabs
          quotations={quotations}
          invoices={invoices}
          organization={organization}
        />
      </div>
    </DashboardLayout>
  );
}
