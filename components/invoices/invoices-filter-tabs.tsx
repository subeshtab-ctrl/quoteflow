'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

export function InvoicesFilterTabs({
  currentStatus = 'ALL',
  currentSearch = '',
}: {
  currentStatus: string;
  currentSearch?: string;
  currentEnvironment?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  const statuses = [
    { label: 'All Invoices', value: 'ALL' },
    { label: 'Issued / Unpaid', value: 'ISSUED' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Drafts', value: 'DRAFT' },
    { label: 'Overdue', value: 'OVERDUE' },
    { label: 'Cancelled / Void', value: 'CANCELLED' },
  ];

  const handleSelectStatus = (statusValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusValue === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', statusValue);
    }
    router.push(`/invoices?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    } else {
      params.delete('search');
    }
    router.push(`/invoices?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    router.push(`/invoices?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b md:border-b-0 border-slate-200 dark:border-slate-800">
          {statuses.map((tab) => {
            const isActive = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleSelectStatus(tab.value)}
                className={cn(
                  'px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-[var(--brand-color,#4f46e5)] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Bar Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice #, customer, txn ref..."
              className="w-full h-9 pl-9 pr-8 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {currentSearch && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
          <span>
            Filtering by search: <strong className="font-semibold">&ldquo;{currentSearch}&rdquo;</strong>
          </span>
          <button
            onClick={handleClearSearch}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
}
