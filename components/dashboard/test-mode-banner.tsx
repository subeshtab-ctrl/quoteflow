'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, ArrowRight, ShieldCheck, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TestModeBannerProps {
  isTestMode: boolean;
  userRole?: string;
}

export function TestModeBanner({ isTestMode, userRole = 'ADMIN' }: TestModeBannerProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // STRICT: In live mode, render absolutely nothing — no test references, no banners, no links
  if (!isTestMode) return null;

  const canSwitch = userRole === 'OWNER' || userRole === 'ADMIN';

  const handleSwitchToLive = async () => {
    setIsSwitching(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch to Live Mode');
      setIsModalOpen(false);
      router.refresh();
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error activating Live Mode');
      setIsSwitching(false);
    }
  };

  // TEST mode — show amber banner
  return (
    <>
      <div className="bg-amber-500 text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 border-b border-amber-600/30 px-4 py-2.5 text-xs font-medium shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 font-bold uppercase tracking-wider text-[10px]">
              <FlaskConical className="h-3 w-3" />
              Test Mode
            </span>
            <span>
              You are currently in <strong>Test / Demo Mode</strong>. Invoices and estimates created here are marked as
              TEST documents and do not affect live accounting.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/test/dashboard">
              <button className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold transition-colors whitespace-nowrap cursor-pointer shadow-2xs">
                <FlaskConical className="h-3.5 w-3.5" />
                Test Dashboard
              </button>
            </Link>
            {canSwitch && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-900 text-amber-50 hover:bg-amber-950 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 font-bold transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              >
                <span>Switch to Live</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Switch to Live confirmation modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Switch to Live Operating Mode</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transition your workspace from Test to Live mode</p>
                </div>
              </div>
              <button onClick={() => !isSwitching && setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <p className="font-semibold text-slate-900 dark:text-slate-100">What changes in Live Mode:</p>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Future invoices have <strong>Live Invoice Protection</strong> and cannot be permanently deleted.</li>
                <li>Invoices can only be <strong>Cancelled or Voided</strong> with an immutable audit record.</li>
                <li>Documents use your official invoice number format without test watermarks.</li>
                <li>Previous test invoices remain safely preserved and marked as TEST documents.</li>
                <li>You can return to Test Mode anytime via Settings → Operating Mode.</li>
              </ul>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={isSwitching}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSwitchToLive}
                disabled={isSwitching}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
              >
                {isSwitching ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /><span>Activating...</span></>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /><span>Confirm & Activate Live Mode</span></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
