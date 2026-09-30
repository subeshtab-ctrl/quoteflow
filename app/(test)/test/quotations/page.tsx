import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { store } from '@/lib/supabase/data-store';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Eye, FileText, FlaskConical, MessageSquare } from 'lucide-react';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

interface Props {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function TestQuotationsPage({ searchParams }: Props) {
  const { status, search } = await searchParams;
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');
  const orgId = auth.orgId;

  const [quotations, organization] = await Promise.all([
    store.getQuotations(orgId, { status, search, environment: 'test' }),
    store.getOrganization(orgId),
  ]);

  const currency = organization?.default_currency || 'INR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Test Quotations
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {quotations.length} test quotation{quotations.length !== 1 ? 's' : ''} — sandbox only, not in live reports
          </p>
        </div>
        <Link href="/test/quotations/new">
          <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <PlusCircle className="h-4 w-4" />
            <span>New Test Quote</span>
          </Button>
        </Link>
      </div>

      {/* Quotations Table */}
      {quotations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/10 p-12 text-center">
          <FileText className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">No test quotes yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Create your first test quotation to practice the quoting workflow without affecting live data.
          </p>
          <Link href="/test/quotations/new">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Test Quote
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Quote #</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Title</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Created</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/test/quotations/${q.id}`} className="font-mono font-bold text-amber-600 hover:text-amber-700 hover:underline">
                        {q.quotation_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{q.customer?.name || '—'}</p>
                        {q.customer?.company_name && (
                          <p className="text-xs text-slate-400">{q.customer.company_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{q.title}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(q.grand_total, currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      {formatDate(q.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/test/quotations/${q.id}`}>
                        <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
