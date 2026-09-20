'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function QuotationsFilterTabs({
  currentStatus = 'ALL',
  currentSearch = '',
}: {
  currentStatus: string;
  currentSearch: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statuses = [
    { label: 'All Quotations', value: 'ALL' },
    { label: 'Drafts', value: 'DRAFT' },
    { label: 'Sent', value: 'SENT' },
    { label: 'Viewed', value: 'VIEWED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
      {statuses.map((tab) => {
        const isActive = currentStatus === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => handleSelectStatus(tab.value)}
            className={cn(
              'px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors',
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
