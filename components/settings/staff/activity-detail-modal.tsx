'use client';

import React from 'react';
import { X, Clock, User, Shield, Activity, Database, ArrowRight, FileCode } from 'lucide-react';
import { StaffActivityLog } from '@/types/staff';

interface ActivityDetailModalProps {
  log: StaffActivityLog | null;
  onClose: () => void;
}

export function ActivityDetailModal({ log, onClose }: ActivityDetailModalProps) {
  if (!log) return null;

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(log.created_at));

  const diffPrev = log.diff?.previous;
  const diffCurr = log.diff?.current;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Activity Log Details</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Event ID: <span className="font-mono text-[11px]">{log.id.slice(0, 13)}...</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3.5 bg-slate-50/80 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Timestamp</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                {formattedDate}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Staff Member</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                {log.user_name}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">{log.user_email}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Role</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                <Shield className="h-3 w-3" />
                {log.user_role}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Module</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {log.module}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Action</span>
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                {log.action}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Target Record</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {log.target_identifier || log.target_id || 'N/A'}
              </span>
            </div>

            {log.ip_address && (
              <div className="col-span-2">
                <span className="text-slate-400 block mb-1">Client IP / Origin</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">{log.ip_address}</span>
              </div>
            )}
          </div>

          {/* Description / Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Action Description
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
              {log.details || 'No additional summary provided.'}
            </div>
          </div>

          {/* Changed Fields / Visual Diff */}
          {diffPrev && diffCurr && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>Field Changes & Diff</span>
              </h4>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {Object.keys({ ...diffPrev, ...diffCurr }).map((field) => {
                  const before = diffPrev[field];
                  const after = diffCurr[field];
                  if (JSON.stringify(before) === JSON.stringify(after)) return null;

                  return (
                    <div key={field} className="p-3 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                        {field}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 line-through">
                          {typeof before === 'object' ? JSON.stringify(before) : String(before ?? 'none')}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold">
                          {typeof after === 'object' ? JSON.stringify(after) : String(after ?? 'none')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full Payload Viewer */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-slate-400" />
              <span>Full Event Payload (Sanitized JSON)</span>
            </h4>
            <pre className="p-3.5 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto border border-slate-800">
              {JSON.stringify(log, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
