import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { store } from '@/lib/supabase/data-store';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { Globe, FlaskConical, FileText, ArrowRight, Star, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function TestClientPortalPage() {
  const auth = await getAuthenticatedUserContext();
  if (!auth) redirect('/login');
  const orgId = auth.orgId;

  await store.seedTestDemoCustomers(orgId);

  // Get test quotations that have been SENT (have a public link)
  const sentQuotations = await store.getQuotations(orgId, {
    environment: 'test',
    status: 'SENT',
  });

  const allTestQuotations = await store.getQuotations(orgId, { environment: 'test' });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950/50 text-teal-600 shrink-0">
          <Globe className="h-7 w-7" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Test Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Client Portal Walkthrough
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Simulate the client experience for test quotations. Use demo credentials to access the portal.
          </p>
        </div>
      </div>

      {/* Demo Credentials Card */}
      <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 p-6">
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-800 dark:text-amber-400 mb-3">Demo Portal Credentials</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'Demo Customer 1', email: 'demo.customer1@example.test', pin: '1234' },
                { name: 'Demo Customer 2', email: 'demo.customer2@example.test', pin: '1234' },
                { name: 'Training Client', email: 'training@example.test', pin: '1234' },
              ].map((c) => (
                <div key={c.email} className="rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/30 p-3">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">{c.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Email:</span> {c.email}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span className="font-medium">PIN:</span>{' '}
                    <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 rounded font-bold">
                      {c.pin}
                    </code>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Portal Walkthrough Steps */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs p-6">
        <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-teal-600" />
          How to test the Client Portal
        </h2>
        <ol className="space-y-3">
          {[
            'Create a test quotation and set its status to "Sent"',
            'Find the quotation in the list below and click "Open Portal Link"',
            'A new tab opens with the public client portal',
            'Enter the demo customer email and PIN: 1234',
            'Review the quotation, approve or reject it',
            'Come back here and refresh to see the updated status',
          ].map((step, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 text-xs font-bold">
                {idx + 1}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Sent Test Quotations */}
      <div>
        <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-4">
          Test Quotations with Portal Links ({allTestQuotations.length} total)
        </h2>

        {allTestQuotations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-teal-300 dark:border-teal-700/50 bg-teal-50/40 dark:bg-teal-950/10 p-10 text-center">
            <FileText className="h-10 w-10 text-teal-400 mx-auto mb-3" />
            <p className="font-medium text-slate-600 dark:text-slate-400 mb-2">No test quotations yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Create a test quotation first, then set it to "Sent" to access its client portal link.
            </p>
            <Link href="/test/quotations/new">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                <FileText className="h-4 w-4" />
                Create Test Quote
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {allTestQuotations.map((q) => (
                <div key={q.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-amber-600">{q.quotation_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                        q.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        q.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{q.status}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 truncate">{q.title}</p>
                    <p className="text-xs text-slate-500">
                      {q.customer?.name || 'Unknown'}{q.customer?.company_name ? ` — ${q.customer.company_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/test/quotations/${q.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 gap-1">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </Link>
                    {q.public_token && (
                      <a
                        href={`${appUrl}/q/${q.public_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-teal-700 border-teal-200 hover:bg-teal-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Portal
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
