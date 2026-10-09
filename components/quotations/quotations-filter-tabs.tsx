'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Check, Clock, Play, XCircle, AlertTriangle, Sparkles, Layers } from 'lucide-react';

interface TabConfig {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  activeClass: string;
  inactiveClass: string;
  dotColor: string;
}

export function QuotationsFilterTabs({
  currentStatus = 'ALL',
  currentSearch = '',
}: {
  currentStatus: string;
  currentSearch: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statuses: TabConfig[] = [
    {
      label: 'All Quotations',
      value: 'ALL',
      icon: Layers,
      activeClass: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs',
      inactiveClass: 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850',
      dotColor: 'bg-slate-400',
    },
    {
      label: 'New',
      value: 'NEW',
      icon: Sparkles,
      activeClass: 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/25',
      inactiveClass: 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100/80 dark:hover:bg-blue-950/70',
      dotColor: 'bg-blue-500',
    },
    {
      label: 'Approved',
      value: 'APPROVED',
      icon: Check,
      activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/25',
      inactiveClass: 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/70',
      dotColor: 'bg-emerald-500',
    },
    {
      label: 'In Progress',
      value: 'IN_PROGRESS',
      icon: Play,
      activeClass: 'bg-sky-600 text-white border-sky-600 shadow-xs shadow-sky-500/25',
      inactiveClass: 'bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60 hover:bg-sky-100/80 dark:hover:bg-sky-950/70',
      dotColor: 'bg-sky-500',
    },
    {
      label: 'Pending',
      value: 'PENDING',
      icon: Clock,
      activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs shadow-amber-500/25',
      inactiveClass: 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/80 dark:hover:bg-amber-950/70',
      dotColor: 'bg-amber-500',
    },
    {
      label: 'Rejected',
      value: 'REJECTED',
      icon: XCircle,
      activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-500/25',
      inactiveClass: 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100/80 dark:hover:bg-rose-950/70',
      dotColor: 'bg-rose-500',
    },
    {
      label: 'Expired',
      value: 'EXPIRED',
      icon: AlertTriangle,
      activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs',
      inactiveClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
      dotColor: 'bg-slate-500',
    },
  ];

  const handleSelectStatus = (statusValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', statusValue);
    }
    router.push(`/quotations?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
      {statuses.map((tab) => {
        const isActive = currentStatus === tab.value || (tab.value === 'ALL' && (!currentStatus || currentStatus === 'ALL'));
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleSelectStatus(tab.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all border cursor-pointer select-none',
              isActive ? tab.activeClass : tab.inactiveClass
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full shrink-0 transition-opacity',
                isActive ? 'bg-white' : tab.dotColor
              )}
            />
            {Icon && <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-white' : '')} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
