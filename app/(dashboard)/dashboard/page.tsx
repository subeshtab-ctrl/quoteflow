import React from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate, cn } from '@/lib/utils';
import { getCustomerTheme, getCustomerInitials } from '@/lib/customers/themes';
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
import { DashboardGreeting } from '@/components/dashboard/dashboard-greeting';
import { AiDashboardBriefing } from '@/components/dashboard/ai-dashboard-briefing';
import { StaffOverviewCard } from '@/components/dashboard/staff-overview-card';
import { BrowserNotificationBanner } from '@/components/notifications/browser-notification-banner';
import { OnboardingChecklistCard } from '@/components/dashboard/onboarding-checklist-card';

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
  const organization = auth?.organization || (await store.getOrganization(orgId));
  const env = (organization?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

  const [analytics, quotations, invoices] = await Promise.all([
    store.getDashboardAnalytics(orgId, { environment: env }),
    store.getQuotations(orgId, { environment: env }),
    store.getInvoices(orgId, { environment: env }),
  ]);
  const currency = organization?.default_currency || 'INR';
  const firstName = (auth?.fullName || '').trim().split(' ')[0] || 'there';

  // Calculate invoice metrics
  const paidInvoices = invoices.filter((i) => i.status === 'PAID');
  const paidInvoicesTotal = paidInvoices.reduce((sum, i) => sum + (i.paid_amount || i.grand_total || 0), 0);
  const outstandingInvoices = invoices.filter((i) => i.status === 'PARTIAL' || i.status === 'OVERDUE');
  const outstandingTotal = outstandingInvoices.reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

  // Extract top clients
  const clientMap = new Map<string, { id?: string; name: string; count: number; total: number }>();
  quotations.forEach((q) => {
    const cust = (q as any).customer;
    const name = cust?.name || cust?.company_name || (q as any).customer_name || (q as any).client_name || q.title || 'Client';
    const id = cust?.id || (q as any).customer_id || name;
    const existing = clientMap.get(id) || { id, name, count: 0, total: 0 };
    existing.count += 1;
    existing.total += q.grand_total || 0;
    clientMap.set(id, existing);
  });
  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Real-time Browser Notifications Permission Banner */}
        <BrowserNotificationBanner />

        {/* Top Executive Greeting & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <DashboardGreeting firstName={firstName} />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Here is what&apos;s happening across your quotations, client approvals, and revenue.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/quotations/new">
              <Button className="gap-2 shadow-md shadow-indigo-500/20 text-xs font-bold rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white">
                <FileText className="h-3.5 w-3.5" />
                <span>New Quote</span>
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button className="gap-2 shadow-md shadow-rose-500/15 text-xs font-bold rounded-2xl bg-rose-600 hover:bg-rose-700 text-white">
                <Receipt className="h-3.5 w-3.5" />
                <span>New Invoice</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Onboarding Checklist for New Workspaces */}
        <OnboardingChecklistCard />

        {/* AI Business Briefing & Proactive Recommendations */}
        <AiDashboardBriefing firstName={firstName} />

        {/* 4 KPI Metric Cards with Sparklines & Trend Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Total Pipeline */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Pipeline
              </span>
              <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 p-2.5 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {formatCurrency(analytics.totalValue, currency)}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-[11px] bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  ↑ {analytics.totalCount} Quotes
                </span>
                <Sparkline data={[12, 19, 15, 25, 22, 30, 28, 35]} color="#6366f1" />
              </div>
            </div>
          </div>

          {/* KPI 2: Approved Revenue */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Approved Revenue
              </span>
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 p-2.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatCurrency(analytics.approvedValue, currency)}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                  {analytics.winRate}% Win rate
                </span>
                <Sparkline data={[8, 14, 18, 16, 24, 28, 32, 38]} color="#10b981" />
              </div>
            </div>
          </div>

          {/* KPI 3: Pending Approval */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Approval
              </span>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/60 p-2.5 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {formatCurrency(analytics.pendingValue, currency)}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-amber-700 dark:text-amber-400 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                  {analytics.pendingCount} Awaiting Sign
                </span>
                <Sparkline data={[20, 18, 22, 19, 21, 16, 18, 15]} color="#f59e0b" />
              </div>
            </div>
          </div>

          {/* KPI 4: Client Portal Views */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client Views
              </span>
              <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/60 p-2.5 text-violet-600 dark:text-violet-400">
                <Eye className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
                {analytics.totalViews}
              </p>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-violet-700 dark:text-violet-400 font-bold text-[11px] bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 rounded-full">
                  Real-time visits
                </span>
                <Sparkline data={[5, 12, 18, 25, 30, 42, 48, 55]} color="#8b5cf6" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin/Owner Staff Overview KPI Card */}
        <StaffOverviewCard userRole={auth?.role} isStaff={auth?.isStaff} isOwner={auth?.isOwner} />

        {/* Charts & Status Overview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales & Pipeline Trend Area Chart */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Sales &amp; Cashflow Analytics
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monthly quote volume vs. closed approved revenue
                </p>
              </div>
            </div>
            <DashboardCharts monthlyData={analytics.monthlyData} currency={currency} />
          </div>

          {/* Quotation Status Distribution Donut Chart */}
          <div className="rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 tracking-tight">
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
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xs">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>Top Accounts &amp; Clients</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Highest value accounts in your workspace
                  </p>
                </div>
              </div>
              <Link
                href="/customers"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 group"
              >
                <span>View all clients</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {topClients.map((client, idx) => {
                const themeKey = (client.id || '') + client.name;
                const theme = getCustomerTheme(themeKey);
                const initials = getCustomerInitials(client.name);

                return (
                  <Link
                    key={client.id || idx}
                    href={`/customers?search=${encodeURIComponent(client.name)}`}
                    className={cn(
                      'group relative p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden',
                      theme.hoverGlow
                    )}
                    title={`View client details for ${client.name}`}
                  >
                    {/* Colorful Top Accent Bar matching theme */}
                    <div
                      className={cn('absolute top-0 left-0 right-0 h-1 transition-opacity opacity-85 group-hover:opacity-100', theme.topBar)}
                      style={{ background: theme.cssTopBar }}
                    />

                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2.5">
                        {/* Squircle Initials Avatar */}
                        <div
                          className={cn(
                            'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-black text-xs tracking-wide shadow-xs shrink-0 ring-2 ring-white/90 dark:ring-slate-800 transition-transform duration-200 group-hover:scale-105',
                            theme.gradient,
                            theme.avatarShadow
                          )}
                          style={{ background: theme.cssGradient }}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {client.name}
                          </p>
                          <span
                            className={cn(
                              'inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full border',
                              theme.quoteBadge,
                              theme.quoteBadgeBorder
                            )}
                          >
                            {client.count} quote{client.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Revenue volume */}
                      <div className="pt-2 flex items-baseline justify-between gap-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                        <span className="font-black text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {formatCurrency(client.total, currency)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
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
