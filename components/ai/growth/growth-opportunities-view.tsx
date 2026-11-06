'use client';

import React from 'react';
import {
  TrendingUp,
  Sparkles,
  Users,
  FileCheck,
  Percent,
  Search,
  ArrowRight,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { GrowthOpportunity } from '@/types/growth-assistant';
import { formatCurrency } from '@/lib/quotations/calculations';

interface GrowthOpportunitiesViewProps {
  opportunities: GrowthOpportunity[];
  onSelectOpportunity: (opportunity: GrowthOpportunity) => void;
  isLoading?: boolean;
}

export function GrowthOpportunitiesView({
  opportunities,
  onSelectOpportunity,
  isLoading,
}: GrowthOpportunitiesViewProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Scanning pipeline for recoverable revenue & growth leads...</p>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 my-4 mx-2">
        <Sparkles className="w-8 h-8 text-indigo-500 mb-2" />
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Analyzing Growth Opportunities</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
          As you create quotes, record orders, and send invoices, QuoteFlow AI analyzes customer cycle frequencies to unlock new revenue.
        </p>
      </div>
    );
  }

  const totalRecoverable = opportunities.reduce((s, o) => s + (o.potentialValue || 0), 0);
  const primaryCurrency = opportunities[0]?.currency || 'INR';

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'RECOVER_UNANSWERED':
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      case 'REORDER_READY':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'UNINVOICED_APPROVED':
        return <FileCheck className="w-4 h-4 text-blue-500" />;
      case 'TARGETED_PROSPECTS':
        return <Search className="w-4 h-4 text-purple-500" />;
      case 'DISCOUNT_OPTIMIZATION':
        return <Percent className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-3.5 p-1">
      {/* Top Value Banner */}
      {totalRecoverable > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Identified Pipeline Value
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(totalRecoverable, primaryCurrency)}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {opportunities.length} Actionable Tracks
            </span>
          </div>
        </div>
      )}

      {/* Opportunity Cards */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-xs group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                  {getCategoryIcon(opp.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {opp.title}
                    </h4>
                    {opp.potentialValue > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                        Est. {formatCurrency(opp.potentialValue, opp.currency)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {opp.description}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  AI Confidence
                </span>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                  {opp.confidence}%
                </span>
              </div>
            </div>

            {opp.details && opp.details.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                {opp.details.map((d, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onSelectOpportunity(opp)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
              >
                {opp.actionLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
