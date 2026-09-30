import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Users, FlaskConical, PlusCircle, Mail, Phone, Building2, Star } from 'lucide-react';

export default async function TestCustomersPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');
  const orgId = auth.orgId;

  await store.seedTestDemoCustomers(orgId);

  const customers = await store.getCustomers(orgId, { environment: 'test' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Test Customers
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pre-loaded demo customers for test quotations and invoices
          </p>
        </div>
      </div>

      {/* Demo Customers Notice */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 p-4">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Demo Customers Pre-Loaded</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              These are training customers with demo email addresses (<strong>@example.test</strong>) and PIN <strong>1234</strong>.
              Use them for test quotes, invoices, and portal walkthroughs. They won&apos;t appear in live customer lists.
            </p>
          </div>
        </div>
      </div>

      {/* Customer Cards */}
      {customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/10 p-12 text-center">
          <Users className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No test customers found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Demo customers will be loaded automatically on the next page visit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-sm transition-shadow"
            >
              {/* Customer Avatar */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{c.name}</h3>
                    {c.is_demo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 shrink-0">
                        DEMO
                      </span>
                    )}
                  </div>
                  {c.company_name && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {c.company_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                {c.email && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </p>
                )}
                {c.phone && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {c.phone_country_code} {c.phone}
                  </p>
                )}
                {c.is_demo && c.demo_pin && (
                  <p className="text-xs text-amber-700 dark:text-amber-500 flex items-center gap-2 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <Star className="h-3.5 w-3.5 shrink-0" />
                    Portal PIN: <strong>{c.demo_pin}</strong>
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-4 flex gap-2">
                <Link href={`/test/quotations/new?customer_id=${c.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                    New Quote
                  </Button>
                </Link>
                <Link href={`/test/invoices/new?customer_id=${c.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                    New Invoice
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
