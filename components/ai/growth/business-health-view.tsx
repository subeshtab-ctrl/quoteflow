'use client';

import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Users,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { BusinessHealthScore, HealthComponent } from '@/types/growth-assistant';

interface BusinessHealthViewProps {
  health: BusinessHealthScore | null;
  isLoading?: boolean;
}

export function BusinessHealthView({ health, isLoading }: BusinessHealthViewProps) {
  if (isLoading || !health) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium">Computing transparent organizational health metrics...</p>
      </div>
    );
  }

  const getStatusBadge = (status: HealthComponent['status']) => {
    switch (status) {
      case 'EXCELLENT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            EXCELLENT
          </span>
        );
      case 'GOOD':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            HEALTHY
          </span>
        );
      case 'FAIR':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            FAIR
          </span>
        );
      case 'NEEDS_ATTENTION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            ATTENTION NEEDED
          </span>
        );
    }
  };

  const getGradeColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 55) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const componentsList: Array<{ key: string; comp: HealthComponent; icon: any }> = [
    {
      key: 'quoteConversion',
      comp: health.components.quoteConversion,
      icon: TrendingUp,
    },
    {
      key: 'paymentCollection',
      comp: health.components.paymentCollection,
      icon: CreditCard,
    },
    {
      key: 'customerRetention',
      comp: health.components.customerRetention,
      icon: Users,
    },
    {
      key: 'followUpExecution',
      comp: health.components.followUpExecution,
      icon: Clock,
    },
    {
      key: 'pipelineHealth',
      comp: health.components.pipelineHealth,
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-4 p-1">
      {/* Overall Score Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-slate-50 to-purple-500/10 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black ${getGradeColor(health.overallScore)}`}>
                {health.overallScore}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase">/100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Business Health Rating
              </span>
              <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${getGradeColor(health.overallScore)}`}>
                {health.grade}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md">
              {health.summary}
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-slate-400 shrink-0">
          <div>Calculated from real business data</div>
          <div className="font-medium text-slate-600 dark:text-slate-300">
            Updated {new Date(health.calculatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Transparent Component Breakdown */}
      <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          5 Transparent Metric Components
        </div>

        {componentsList.map(({ key, comp, icon: Icon }) => (
          <div
            key={key}
            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {comp.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Your Metric: <strong className="text-slate-800 dark:text-slate-200">{comp.metricValue}</strong> • Target Benchmark: {comp.benchmark}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {comp.score}/100
                </span>
                {getStatusBadge(comp.status)}
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  comp.score >= 80
                    ? 'bg-emerald-500'
                    : comp.score >= 60
                    ? 'bg-blue-500'
                    : comp.score >= 40
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.max(5, comp.score)}%` }}
              />
            </div>

            <div className="mt-2.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>{comp.explanation}</span>
              </div>
              {comp.recommendation && (
                <div className="mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-indigo-600 dark:text-indigo-400 font-medium">
                  Recommendation: {comp.recommendation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
