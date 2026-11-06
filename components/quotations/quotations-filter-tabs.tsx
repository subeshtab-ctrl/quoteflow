'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Check,
  Clock,
  Play,
  XCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  Search,
  X,
} from 'lucide-react';

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
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const statuses: TabConfig[] = [
    {
      label: 'All Quotations',
      value: 'ALL',
      icon: Layers,
      activeClass:
        'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs',
      inactiveClass:
        'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
      dotColor: 'bg-slate-400',
    },
    {
      label: 'New',
      value: 'NEW',
      icon: Sparkles,
      activeClass: 'bg-blue-600 text-white border-blue-600 shadow-2xs shadow-blue-500/25',
      inactiveClass:
        'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100/80 dark:hover:bg-blue-950/70',
      dotColor: 'bg-blue-500',
    },
    {
      label: 'Approved',
      value: 'APPROVED',
      icon: Check,
      activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs shadow-emerald-500/25',
      inactiveClass:
        'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/70',
      dotColor: 'bg-emerald-500',
    },
    {
      label: 'In Progress',
      value: 'IN_PROGRESS',
      icon: Play,
      activeClass: 'bg-sky-600 text-white border-sky-600 shadow-2xs shadow-sky-500/25',
      inactiveClass:
        'bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60 hover:bg-sky-100/80 dark:hover:bg-sky-950/70',
      dotColor: 'bg-sky-500',
    },
    {
      label: 'Pending',
      value: 'PENDING',
      icon: Clock,
      activeClass: 'bg-amber-500 text-white border-amber-500 shadow-2xs shadow-amber-500/25',
      inactiveClass:
        'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/80 dark:hover:bg-amber-950/70',
      dotColor: 'bg-amber-500',
    },
    {
      label: 'Rejected',
      value: 'REJECTED',
      icon: XCircle,
      activeClass: 'bg-rose-600 text-white border-rose-600 shadow-2xs shadow-rose-500/25',
      inactiveClass:
        'bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100/80 dark:hover:bg-rose-950/70',
      dotColor: 'bg-rose-500',
    },
    {
      label: 'Expired',
      value: 'EXPIRED',
      icon: AlertTriangle,
      activeClass: 'bg-slate-700 text-white border-slate-700 shadow-2xs',
      inactiveClass:
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = searchInput.trim();
    if (trimmed) {
      params.set('search', trimmed);
    } else {
      params.delete('search');
    }
    router.push(`/quotations?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    router.push(`/quotations?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Scrollable Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
        {statuses.map((tab) => {
          const isActive =
            currentStatus === tab.value ||
            (tab.value === 'ALL' && (!currentStatus || currentStatus === 'ALL'));
          const Icon = tab.icon;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleSelectStatus(tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all border cursor-pointer select-none',
                isActive ? tab.activeClass : tab.inactiveClass
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full shrink-0 transition-opacity',
                  isActive ? 'bg-white' : tab.dotColor
                )}
              />
              {Icon && (
                <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-white' : '')} />
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modern Executive Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72 lg:w-80 shrink-0 group">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filter by title, client, ID..."
            className="h-10 w-full rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 pl-10 pr-12 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all shadow-xs hover:border-slate-300 dark:hover:border-slate-600"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="absolute right-2.5 hidden sm:flex items-center px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-semibold text-slate-400 pointer-events-none select-none">
              ↵ Enter
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
