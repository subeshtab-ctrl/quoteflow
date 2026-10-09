'use client';

import React from 'react';
import { Quotation } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Clock, Play, Check, ShieldCheck, ChevronRight } from 'lucide-react';

interface QuotationFlowChartProps {
  quotation: Quotation;
  className?: string;
  isClientView?: boolean;
}

export function QuotationFlowChart({
  quotation,
  className = '',
  isClientView = false,
}: QuotationFlowChartProps) {
  const status = quotation.status;

  // Flow stages determination
  const isSentDone = ['SENT', 'VIEWED', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(status);
  const isApprovedDone = ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(status);
  const isInProgressDone = ['COMPLETED', 'PAYMENT_COMPLETED'].includes(status);
  const isInProgressCurrent = status === 'IN_PROGRESS';
  const isCompletedDone = status === 'COMPLETED' || status === 'PAYMENT_COMPLETED';

  // Rejected / Expired / Draft handling
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
    return null;
  }

  const steps = [
    {
      id: 'step-1',
      number: '1',
      title: 'Quotation Issued',
      subtitle: quotation.issue_date ? formatDate(quotation.issue_date) : 'Sent to client',
      isCompleted: isSentDone,
      isCurrent: status === 'SENT' || status === 'VIEWED' || status === 'PENDING_APPROVAL' || status === 'DRAFT',
    },
    {
      id: 'step-2',
      number: '2',
      title: 'Client Approved',
      subtitle: quotation.approved_at
        ? formatDate(quotation.approved_at)
        : status === 'APPROVED'
        ? 'Signed & Approved'
        : 'Awaiting signature',
      isCompleted: isApprovedDone,
      isCurrent: status === 'APPROVED',
    },
    {
      id: 'step-3',
      number: '3',
      title: 'In Progress',
      subtitle: isInProgressCurrent
        ? `${quotation.estimated_days || 7} Days Est.${quotation.estimated_completion_date ? ` (Due ${formatDate(quotation.estimated_completion_date)})` : ''}`
        : isInProgressDone
        ? 'Work Executed'
        : status === 'APPROVED'
        ? 'Ready to start'
        : 'Fulfillment phase',
      isCompleted: isInProgressDone,
      isCurrent: isInProgressCurrent,
    },
    {
      id: 'step-4',
      number: '4',
      title: 'Completed',
      subtitle: quotation.completed_at
        ? formatDate(quotation.completed_at)
        : isCompletedDone
        ? 'Delivered'
        : 'Final completion',
      isCompleted: isCompletedDone,
      isCurrent: isCompletedDone,
    },
  ];

  return (
    <div className={`rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-2.5 sm:p-3 shadow-2xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Lifecycle Workflow Chart
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {isInProgressCurrent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
              <span className="h-1 w-1 rounded-full bg-sky-500 animate-ping" />
              Active: Work In Progress ({quotation.estimated_days || 7} Days)
            </span>
          )}
          {status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
              <Check className="h-2.5 w-2.5 text-emerald-600" />
              Approved • Ready for In Progress
            </span>
          )}
          {isCompletedDone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Workflow Fully Completed
            </span>
          )}
        </div>
      </div>

      {/* Responsive Horizontal Stepper Flow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative">
        {steps.map((step, idx) => {
          let nodeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700';
          let textColor = 'text-slate-600 dark:text-slate-400';
          let badgeBorder = 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40';

          if (step.isCompleted) {
            nodeBg = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs shadow-emerald-500/20';
            textColor = 'text-slate-900 dark:text-slate-100';
            badgeBorder = 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20';
          } else if (step.isCurrent) {
            if (step.id === 'step-3') {
              nodeBg = 'bg-sky-600 text-white border-sky-600 shadow-xs shadow-sky-500/30 ring-2 ring-sky-500/10 animate-pulse';
              textColor = 'text-sky-950 dark:text-sky-100';
              badgeBorder = 'border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40';
            } else if (step.id === 'step-2') {
              nodeBg = 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/30 ring-2 ring-emerald-500/10';
              textColor = 'text-emerald-950 dark:text-emerald-100';
              badgeBorder = 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40';
            } else {
              nodeBg = 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-1 ring-indigo-500/20';
              textColor = 'text-slate-900 dark:text-slate-100';
              badgeBorder = 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30';
            }
          }

          return (
            <div
              key={step.id}
              className={`p-2 rounded-lg border transition-all flex items-center gap-2 relative ${badgeBorder}`}
            >
              {/* Step Icon / Number Indicator */}
              <div
                className={`h-6 w-6 rounded-md border flex items-center justify-center font-bold text-[10px] shrink-0 transition-transform ${nodeBg}`}
              >
                {step.isCompleted ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step Labels */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold leading-tight truncate ${textColor}`}>
                    {step.title}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug truncate">
                  {step.subtitle}
                </p>
              </div>

              {/* Connecting arrow for larger screens */}
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute -right-1.5 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700 pointer-events-none">
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
