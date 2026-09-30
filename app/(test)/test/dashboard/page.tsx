import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { formatCurrency } from '@/lib/quotations/calculations';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import {
  FlaskConical,
  PlusCircle,
  FileText,
  Receipt,
  Users,
  GraduationCap,
  Globe,
  ShieldCheck,
  Mail,
  ArrowRight,
  Clock,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';

export default async function TestDashboardPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');
  const orgId = auth.orgId;

  // Always ensure demo customers are seeded
  await store.seedTestDemoCustomers(orgId);

  const [usage, recentQuotations, recentInvoices, recentEmails, organization] = await Promise.all([
    store.getTestUsageToday(orgId),
    store.getQuotations(orgId, { environment: 'test' }),
    store.getInvoices(orgId, { environment: 'test' }),
    store.getTestEmails(orgId, 5),
    store.getOrganization(orgId),
  ]);

  const currency = organization?.default_currency || 'INR';
  const usagePct = Math.round((usage.orders_created / usage.limit) * 100);

  const trainingModules = [
    {
      id: 1,
      title: 'Create a Test Quote',
      description: 'Learn to create quotations for clients step by step',
      href: '/test/training/create-quote',
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-100 dark:border-blue-900/40',
    },
    {
      id: 2,
      title: 'Create a Test Invoice',
      description: 'Generate and manage professional invoices',
      href: '/test/training/create-invoice',
      icon: Receipt,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-100 dark:border-purple-900/40',
    },
    {
      id: 3,
      title: 'Client Portal Walkthrough',
      description: 'See the portal from your client\'s perspective',
      href: '/test/training/client-portal',
      icon: Globe,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    {
      id: 4,
      title: 'Invoice Management',
      description: 'Learn to track, cancel and void invoices safely',
      href: '/test/training/invoice-management',
      icon: ShieldCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-100 dark:border-amber-900/40',
    },
    {
      id: 5,
      title: 'Customer Management',
      description: 'Add, edit and manage customer profiles',
      href: '/test/training/customer-management',
      icon: Users,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-100 dark:border-rose-900/40',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Test Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Safe sandbox for training, demos and testing — no real data is affected.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/test/quotations/new">
            <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
              <FileText className="h-4 w-4" />
              <span>Test Quote</span>
            </Button>
          </Link>
          <Link href="/test/invoices/new">
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md">
              <Receipt className="h-4 w-4" />
              <span>Test Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Usage Counter Banner */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Today&apos;s Test Orders Used
              </span>
              {usage.remaining === 0 && (
                <span className="flex items-center gap-1 text-xs text-rose-600 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Limit reached
                </span>
              )}
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-black text-amber-600 dark:text-amber-400">
                {usage.orders_created}
              </span>
              <span className="text-lg text-slate-400 mb-1">/ {usage.limit}</span>
              <span className="text-sm text-slate-500 mb-1.5">orders today</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usagePct >= 90
                    ? 'bg-rose-500'
                    : usagePct >= 70
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, usagePct)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {usage.remaining > 0
                ? `${usage.remaining} orders remaining today. Resets at midnight UTC.`
                : 'Daily limit reached. Will reset at midnight UTC.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-0.5">Test Quotes</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{recentQuotations.length}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-500 mb-0.5">Test Invoices</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{recentInvoices.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'New Test Quote', href: '/test/quotations/new', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'New Test Invoice', href: '/test/invoices/new', icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
          { label: 'Test Customers', href: '/test/customers', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          { label: 'Client Portal', href: '/test/client-portal', icon: Globe, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
          { label: 'Simulated Emails', href: '/test/emails', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
          { label: 'Training Center', href: '/test/training', icon: GraduationCap, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm hover:border-amber-300 dark:hover:border-amber-700 transition-all text-center group"
          >
            <div className={`p-2 rounded-lg ${action.bg}`}>
              <action.icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-400 leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Training Modules + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Modules */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              <h2 className="font-bold text-slate-900 dark:text-slate-100">Staff Training Center</h2>
            </div>
            <Link href="/test/training" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {trainingModules.map((mod) => (
              <Link
                key={mod.id}
                href={mod.href}
                className={`flex items-center gap-3 p-4 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors group`}
              >
                <div className={`p-2 rounded-lg ${mod.bg} border ${mod.border} shrink-0`}>
                  <mod.icon className={`h-4 w-4 ${mod.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                    {mod.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{mod.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Test Activity */}
        <div className="space-y-4">
          {/* Recent Test Quotes */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Recent Test Quotes</h3>
              </div>
              <Link href="/test/quotations" className="text-xs text-amber-600 hover:text-amber-700 font-medium">View all</Link>
            </div>
            {recentQuotations.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-slate-400">No test quotes yet</p>
                <Link href="/test/quotations/new" className="text-xs text-amber-600 hover:underline mt-1 inline-block">Create your first test quote →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentQuotations.slice(0, 3).map((q) => (
                  <Link key={q.id} href={`/test/quotations/${q.id}`} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{q.quotation_number}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[160px]">{q.customer?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatCurrency(q.grand_total, currency)}</p>
                      <StatusBadge status={q.status} className="text-[10px]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Simulated Emails */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Simulated Emails</h3>
              </div>
              <Link href="/test/emails" className="text-xs text-amber-600 hover:text-amber-700 font-medium">View all</Link>
            </div>
            {recentEmails.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-slate-400">No simulated emails yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Emails triggered in test mode appear here instead of being sent</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentEmails.slice(0, 3).map((email) => (
                  <div key={email.id} className="flex items-center gap-3 p-3">
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 shrink-0">
                      <Mail className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{email.subject}</p>
                      <p className="text-[10px] text-slate-500 truncate">To: {email.to_email}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Environment Isolation Notice */}
      <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/10 p-5">
        <div className="flex items-start gap-3">
          <FlaskConical className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Test Environment Isolation Guarantee</p>
            <ul className="mt-2 text-xs text-amber-700 dark:text-amber-500 space-y-1">
              <li>✓ All test data is completely isolated — never appears in live reports or analytics</li>
              <li>✓ Emails are simulated — real recipients never receive anything</li>
              <li>✓ Payments are simulated — no real charges are made</li>
              <li>✓ Test quotes use <strong>TEST-Q-XXXXX</strong> and invoices use <strong>TEST-INV-XXXXX</strong> numbering</li>
              <li>✓ PDFs carry a visible watermark: "TEST DOCUMENT — NOT A REAL DOCUMENT"</li>
              <li>✓ Daily limit: {usage.limit} test orders per day to prevent data pollution</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
