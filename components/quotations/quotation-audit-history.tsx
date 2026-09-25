'use client';

import React, { useState } from 'react';
import { QuotationEvent } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { History, ChevronDown, ChevronUp } from 'lucide-react';

interface QuotationAuditHistoryProps {
  events: QuotationEvent[];
  viewCount?: number;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
}

export function QuotationAuditHistory({
  events,
  viewCount = 0,
  firstViewedAt,
  lastViewedAt,
}: QuotationAuditHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-sm hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <History className="h-4 w-4" />
          </span>
          <div>
            <span className="font-bold text-sm text-slate-900">Audit History</span>
            <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
          {isOpen ? (
            <>
              Hide
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Timeline UI */}
          <div className="max-h-96 overflow-y-auto pr-1 space-y-4 pt-1">
            {events.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No audit records recorded.</p>
            ) : (
              events.map((evt, idx) => {
                let badgeColor = 'bg-slate-100 text-slate-600';
                if (evt.event_type === 'APPROVED') badgeColor = 'bg-emerald-100 text-emerald-800';
                if (evt.event_type === 'SENT') badgeColor = 'bg-blue-100 text-blue-800';
                if (evt.event_type === 'VIEWED') badgeColor = 'bg-purple-100 text-purple-800';
                if (evt.event_type === 'REJECTED') badgeColor = 'bg-rose-100 text-rose-800';

                return (
                  <div key={evt.id || idx} className="relative pl-6 pb-2 group">
                    {/* Timeline dot & line */}
                    <span className="absolute left-1.5 top-1.5 -ml-px h-full w-0.5 bg-slate-200 group-last:hidden" />
                    <span
                      className={`absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                        evt.event_type === 'APPROVED'
                          ? 'bg-emerald-500 ring-2 ring-emerald-200'
                          : evt.event_type === 'REJECTED'
                            ? 'bg-rose-500 ring-2 ring-rose-200'
                            : evt.event_type === 'VIEWED'
                              ? 'bg-purple-500 ring-2 ring-purple-200'
                              : 'bg-indigo-500 ring-2 ring-indigo-200'
                      }`}
                    />

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}
                        >
                          {evt.event_type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(evt.created_at)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        {evt.actor_name || evt.actor_type}
                      </p>
                      {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg font-mono">
                          {Object.entries(evt.metadata).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-400">{k}:</span> {String(v)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Portal Views Tracking Box */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Customer Views:</span>
              <span className="font-bold text-slate-900">{viewCount}</span>
            </div>
            {firstViewedAt && (
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>First Opened:</span>
                <span>{formatDateTime(firstViewedAt)}</span>
              </div>
            )}
            {lastViewedAt && (
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Last Opened:</span>
                <span>{formatDateTime(lastViewedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
