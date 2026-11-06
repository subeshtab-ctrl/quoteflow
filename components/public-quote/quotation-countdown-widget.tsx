'use client';

import React, { useState, useEffect } from 'react';
import { Quotation } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { Play, Clock, CheckCircle2, CreditCard, ExternalLink, Sparkles, Calendar } from 'lucide-react';
import {
  getQuotationTargetTimestamp,
  checkQuotationInProgressOverdue,
  InProgressOverdueInfo,
} from '@/lib/quotations/timeline';

export {
  getQuotationTargetTimestamp,
  checkQuotationInProgressOverdue,
};
export type { InProgressOverdueInfo };

interface QuotationCountdownWidgetProps {
  quotation: Quotation;
  paymentLinkUrl?: string | null;
  grandTotalFormatted: string;
}

export function QuotationCountdownWidget({
  quotation,
  paymentLinkUrl,
  grandTotalFormatted,
}: QuotationCountdownWidgetProps) {
  const isPaid = Boolean(
    quotation.is_paid === true ||
    (quotation.paid_amount !== undefined &&
      quotation.paid_amount !== null &&
      quotation.grand_total > 0 &&
      quotation.paid_amount >= quotation.grand_total)
  );

  const isCompleted = quotation.status === 'COMPLETED' || quotation.status === 'PAYMENT_COMPLETED' || Boolean(quotation.completed_at);
  const isInProgress = quotation.status === 'IN_PROGRESS';

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isInProgress) {
      setTimeLeft(null);
      return;
    }

    const target = getQuotationTargetTimestamp(quotation);
    if (!target) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isPast: false });
      }
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [
    isInProgress,
    quotation.estimated_completion_date,
    quotation.estimated_days,
    quotation.estimated_time_text,
    quotation.in_progress_at,
  ]);

  // 1. WORK DONE / COMPLETED (Awaiting Payment)
  if (isCompleted && !isPaid) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 p-4 sm:p-5 shadow-sm text-emerald-950 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Work is Done! Deliverables are Ready</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                  ✓ Ready for Handover
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-xl">
                The team has completed all deliverables for quotation <strong>{quotation.quotation_number}</strong>.
                You can now review your estimate and proceed with payment below to finalize settlement.
              </p>
              <div className="pt-0.5 flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span>Outstanding Balance:</span>
                <span className="font-mono text-sm text-emerald-950 font-black">{grandTotalFormatted}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
            {paymentLinkUrl && (
              <a
                href={paymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Pay Now ({grandTotalFormatted})</span>
                <ExternalLink className="h-3 w-3 opacity-80" />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('payment-details-section') || document.getElementById('quotation-sheet');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              <span>View Payment Details</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. IN PROGRESS STATE
  if (isInProgress) {
    // A: In Progress Without Days
    if (quotation.estimated_days === null || (quotation.estimated_days === undefined && !quotation.estimated_completion_date)) {
      return (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 p-4 sm:p-5 shadow-2xs text-sky-950 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-sky-950">Work In Progress</h4>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-300 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  Active Execution
                </span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                The team is actively executing deliverables for this quotation. We will update the status to <strong>Work Done</strong> as soon as execution is completed so you can proceed to payment.
                {quotation.estimated_time_text && (
                  <span className="block text-sky-700 font-medium mt-0.5">Note: &ldquo;{quotation.estimated_time_text}&rdquo;</span>
                )}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // B: In Progress With Live Countdown (Today or Specific Days)
    const isToday = quotation.estimated_days === 0;

    return (
      <div className="rounded-2xl border border-sky-900/40 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-4 sm:p-5 shadow-lg text-white animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-sky-300">
                {isToday ? 'Same Day Delivery • Live Countdown' : 'Fulfillment Timeline • Live Countdown'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
              <span>Work In Progress</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {isToday ? 'Finishing Today' : `${quotation.estimated_days || 7} Days`}
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
              {isToday
                ? 'Our team is fulfilling your order today. Track live countdown to plan your schedule and implementation.'
                : 'Fulfillment is underway. Live countdown helps you coordinate implementation and readiness.'}
              {quotation.estimated_time_text && (
                <span className="block text-sky-300 font-medium mt-0.5">Note: &ldquo;{quotation.estimated_time_text}&rdquo;</span>
              )}
            </p>
          </div>

          {/* Live Countdown Display */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {timeLeft?.isPast ? (
              <div className="px-3.5 py-2 rounded-xl bg-sky-500/20 border border-sky-400/40 text-center">
                <span className="text-xs font-bold text-sky-200">Final Handover in Progress</span>
                <p className="text-[10px] text-sky-300">Wrapping up deliverables</p>
              </div>
            ) : timeLeft ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {timeLeft.days > 0 && (
                  <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-2.5 py-1 min-w-[46px] sm:min-w-[52px] shadow-2xs">
                    <span className="font-mono text-sm sm:text-base font-black text-white leading-none">
                      {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Days</span>
                  </div>
                )}
                <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-2.5 py-1 min-w-[46px] sm:min-w-[52px] shadow-2xs">
                  <span className="font-mono text-sm sm:text-base font-black text-white leading-none">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Hours</span>
                </div>
                <span className="text-white/40 font-bold">:</span>
                <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-2.5 py-1 min-w-[46px] sm:min-w-[52px] shadow-2xs">
                  <span className="font-mono text-sm sm:text-base font-black text-white leading-none">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Mins</span>
                </div>
                <span className="text-white/40 font-bold">:</span>
                <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-2.5 py-1 min-w-[46px] sm:min-w-[52px] shadow-2xs">
                  <span className="font-mono text-sm sm:text-base font-black text-emerald-400 leading-none">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[8px] font-semibold text-emerald-300 uppercase tracking-wider mt-0.5">Secs</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
