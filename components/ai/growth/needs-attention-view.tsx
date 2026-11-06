'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  DollarSign,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { BusinessMistake } from '@/types/growth-assistant';
import { formatCurrency } from '@/lib/quotations/calculations';

interface NeedsAttentionViewProps {
  mistakes: BusinessMistake[];
  onAction: (mistake: BusinessMistake) => void;
  onDismiss: (mistake: BusinessMistake) => void;
  isLoading?: boolean;
}

export function NeedsAttentionView({
  mistakes,
  onAction,
  onDismiss,
  isLoading,
}: NeedsAttentionViewProps) {
  const router = useRouter();
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Analyzing organizational operations & detecting patterns...</p>
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/20 my-4 mx-2">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">All Systems Running Smoothly!</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-1">
          No critical business mistakes or unaddressed pipeline leaks detected. Your follow-ups, invoices, and conversion rates are on track.
        </p>
      </div>
    );
  }

  const handleDismissClick = async (e: React.MouseEvent, m: BusinessMistake) => {
    e.stopPropagation();
    setDismissingId(m.id);
    try {
      await fetch('/api/ai/growth/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: m.actionKey,
          action: 'DISMISSED',
        }),
      });
      onDismiss(m);
    } catch (err) {
      console.error('Failed to dismiss mistake:', err);
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <div className="space-y-3 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Detected Business Inefficiencies ({mistakes.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Proactively identified problems based on your real quotes, invoices, and customer intervals.
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {mistakes.map((m) => {
          const isHigh = m.severity === 'HIGH';
          const isMed = m.severity === 'MEDIUM';

          return (
            <div
              key={m.id}
              className={`p-4 rounded-xl border transition-all ${
                isHigh
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:border-rose-300'
                  : isMed
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-300'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 p-2 rounded-lg ${
                      isHigh
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                        : isMed
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isHigh ? <AlertTriangle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-[10px] bg-white/80 dark:bg-slate-800/80 shadow-xs">
                        {m.severity} SEVERITY
                      </span>
                      {m.potentialRevenueImpact && m.potentialRevenueImpact > 0 ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(m.potentialRevenueImpact, m.currency)} at risk
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5">{m.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDismissClick(e, m)}
                  disabled={dismissingId === m.id}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                  title="Dismiss this recommendation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Affecting: <strong className="text-slate-700 dark:text-slate-200">{m.affectedCount}</strong> item(s)
                </span>

                <button
                  type="button"
                  onClick={() => onAction(m)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all shadow-xs"
                >
                  {m.actionLabel}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
