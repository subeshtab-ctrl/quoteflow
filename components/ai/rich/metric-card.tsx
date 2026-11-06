'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  FileCheck,
  Send,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { KpiGridBlock, KpiMetricItem } from '@/types/rich-ai';

interface MetricCardProps {
  block: KpiGridBlock;
}

export function MetricCard({ block }: MetricCardProps) {
  const metrics = block.metrics || [];

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] p-5 sm:p-6 shadow-sm dark:shadow-xl transition-all">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-200 dark:border-[#263653]/60">
        <div className="w-7 h-7 rounded-lg bg-[#2388FF]/15 border border-[#2388FF]/30 flex items-center justify-center text-[#2388FF]">
          <BarChart3 className="w-4 h-4" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F5F7FF] tracking-wide">
          {block.title || 'Customer journey at a glance'}
        </h3>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {metrics.map((item, idx) => {
          const theme = getMetricTheme(item.icon, idx);

          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] flex flex-col justify-between hover:border-[#2388FF]/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${theme.bg} ${theme.color} border ${theme.border}`}
                >
                  {renderMetricIcon(item.icon, idx)}
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-[#A8B4CA] truncate">{item.label}</span>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#F5F7FF] tracking-tight">{item.value}</div>
                {item.trend && (
                  <div className="flex items-center gap-1 mt-1">
                    {item.trendDirection === 'down' ? (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    ) : (
                      <TrendingUp className="w-3 h-3 text-[#11C995]" />
                    )}
                    <span
                      className={`text-[11px] font-semibold ${
                        item.trendDirection === 'down' ? 'text-red-500' : 'text-[#11C995]'
                      }`}
                    >
                      {item.trend}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note (e.g. Avg. time to convert) */}
      {block.footerNote && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-[#A8B4CA]">{block.footerNote.label}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-[#F5F7FF]">{block.footerNote.value}</span>
            {block.footerNote.subtext && (
              <span className="text-[11px] font-semibold text-[#11C995] bg-[#11C995]/10 px-2 py-0.5 rounded-full border border-[#11C995]/20">
                {block.footerNote.subtext}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getMetricTheme(iconKey?: string, idx: number = 0) {
  if (iconKey === 'sent' || idx === 0) {
    return {
      bg: 'bg-[#2388FF]/15',
      color: 'text-[#2388FF]',
      border: 'border-[#2388FF]/30',
    };
  }
  if (iconKey === 'viewed' || idx === 1) {
    return {
      bg: 'bg-[#5638F5]/15',
      color: 'text-[#5638F5]',
      border: 'border-[#5638F5]/30',
    };
  }
  return {
    bg: 'bg-[#11C995]/15',
    color: 'text-[#11C995]',
    border: 'border-[#11C995]/30',
  };
}

function renderMetricIcon(iconKey?: string, idx: number = 0) {
  switch (iconKey) {
    case 'sent':
      return <Send className="w-3.5 h-3.5" />;
    case 'viewed':
      return <Eye className="w-3.5 h-3.5" />;
    case 'converted':
      return <FileCheck className="w-3.5 h-3.5" />;
    case 'revenue':
      return <DollarSign className="w-3.5 h-3.5" />;
    case 'clock':
      return <Clock className="w-3.5 h-3.5" />;
    default:
      if (idx === 0) return <Send className="w-3.5 h-3.5" />;
      if (idx === 1) return <Eye className="w-3.5 h-3.5" />;
      return <FileCheck className="w-3.5 h-3.5" />;
  }
}
