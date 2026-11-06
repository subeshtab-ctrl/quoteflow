'use client';

import React, { useState, useEffect } from 'react';
import { Quotation } from '@/types/database';
import { formatDate, formatDateTime } from '@/lib/utils';
import { formatCurrency } from '@/lib/quotations/calculations';
import {
  CheckCircle2,
  Clock,
  Play,
  Check,
  ShieldCheck,
  ChevronRight,
  CreditCard,
  Download,
  X,
  FileText,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { getQuotationTargetTimestamp } from '@/components/public-quote/quotation-countdown-widget';

interface QuotationFlowChartProps {
  quotation: Quotation;
  className?: string;
  isClientView?: boolean;
  onDownloadReceipt?: () => void;
  isDownloadingReceipt?: boolean;
  paymentLinkUrl?: string | null;
}

export function QuotationFlowChart({
  quotation,
  className = '',
  isClientView = false,
  onDownloadReceipt,
  isDownloadingReceipt = false,
  paymentLinkUrl = null,
}: QuotationFlowChartProps) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const status = quotation.status;

  // Rejected / Expired / Cancelled handling
  if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
    return null;
  }

  // Payment Status Computation
  const isPaid = Boolean(
    quotation.is_paid === true ||
    (quotation.paid_amount !== undefined &&
      quotation.paid_amount !== null &&
      quotation.grand_total > 0 &&
      quotation.paid_amount >= quotation.grand_total)
  );

  const isPartiallyPaid = !isPaid && Boolean(quotation.paid_amount && quotation.paid_amount > 0);
  const isUnpaid = !isPaid && !isPartiallyPaid;

  const isPaymentConfirmed = Boolean(
    (quotation as any).payment_verified_by_company ??
    (quotation as any).payment_confirmed ??
    (isPaid || isPartiallyPaid)
  );

  // Flow stages determination
  const isSentDone = ['SENT', 'VIEWED', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(status);
  const isApprovedDone = ['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_COMPLETED'].includes(status) || Boolean(quotation.approved_at) || Boolean(quotation.signature?.signed_at);
  const isInProgressDone = ['COMPLETED', 'PAYMENT_COMPLETED'].includes(status) || Boolean(quotation.completed_at);
  const isInProgressCurrent = status === 'IN_PROGRESS';
  const isCompletedDone = status === 'COMPLETED' || status === 'PAYMENT_COMPLETED' || Boolean(quotation.completed_at);

  // Live ticking countdown state for In Progress (circular animation)
  const [countdownState, setCountdownState] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    progressPercent: number;
    displayTimeText: string;
  } | null>(null);

  useEffect(() => {
    if (!isInProgressCurrent) {
      setCountdownState(null);
      return;
    }

    const target = getQuotationTargetTimestamp(quotation);
    if (!target) {
      setCountdownState(null);
      return;
    }

    const start = quotation.in_progress_at
      ? new Date(quotation.in_progress_at).getTime()
      : target - (quotation.estimated_days ? quotation.estimated_days * 86400000 : 86400000);
    const totalDuration = Math.max(1000, target - start);

    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setCountdownState({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          progressPercent: 100,
          displayTimeText: 'Wrapping up',
        });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        const elapsed = Math.max(0, now - start);
        const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        let displayTimeText = '';
        if (days > 0) {
          displayTimeText = `${days}d ${hours}h ${minutes}m`;
        } else {
          displayTimeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        setCountdownState({
          days,
          hours,
          minutes,
          seconds,
          isPast: false,
          progressPercent,
          displayTimeText,
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    isInProgressCurrent,
    quotation.estimated_completion_date,
    quotation.estimated_days,
    quotation.estimated_time_text,
    quotation.in_progress_at,
  ]);

  // Paid step status determination for colors
  // - Fully Paid: Green (emerald)
  // - Partially Paid: Brown Yellow (amber)
  // - Unpaid: Red (rose)
  const paidStepColor = isPaid
    ? {
        nodeBg: 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/25',
        titleColor: 'text-emerald-900',
        subtitleColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        label: 'Fully Paid',
        dot: 'bg-emerald-500',
      }
    : isPartiallyPaid
    ? {
        nodeBg: 'bg-amber-500 text-white shadow-xs shadow-amber-500/25',
        titleColor: 'text-amber-950',
        subtitleColor: 'text-amber-800',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        label: quotation.advance_percentage ? `${quotation.advance_percentage}% Paid` : 'Partially Paid',
        dot: 'bg-amber-500',
      }
    : {
        nodeBg: 'bg-rose-500 text-white shadow-xs shadow-rose-500/25',
        titleColor: 'text-rose-950',
        subtitleColor: 'text-rose-700',
        badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
        label: 'Unpaid',
        dot: 'bg-rose-500',
      };

  const steps = [
    {
      id: 'step-issued',
      number: '1',
      title: 'Quotation Issued',
      subtitle: quotation.issue_date ? formatDate(quotation.issue_date) : 'Sent to client',
      isCompleted: isSentDone,
      isCurrent: status === 'SENT' || status === 'VIEWED' || status === 'PENDING_APPROVAL' || status === 'DRAFT',
    },
    {
      id: 'step-approved',
      number: '2',
      title: 'Client Approved',
      subtitle: quotation.signature?.signed_at
        ? formatDate(quotation.signature.signed_at)
        : quotation.approved_at
        ? formatDate(quotation.approved_at)
        : isApprovedDone
        ? 'Approved'
        : 'Awaiting signature',
      isCompleted: isApprovedDone,
      isCurrent: status === 'APPROVED',
    },
    {
      id: 'step-paid',
      number: '3',
      title: 'Paid',
      subtitle: paidStepColor.label,
      isCompleted: isPaid,
      isPartial: isPartiallyPaid,
      isUnpaid: isUnpaid,
      isCurrent: isApprovedDone && !isCompletedDone,
      customColor: paidStepColor,
    },
    {
      id: 'step-progress',
      number: '4',
      title: 'In Progress',
      subtitle: isInProgressCurrent
        ? countdownState
          ? countdownState.displayTimeText
          : quotation.estimated_days === 0
          ? 'Today'
          : typeof quotation.estimated_days === 'number'
          ? `${quotation.estimated_days} Days Est.`
          : 'In Progress'
        : isInProgressDone
        ? 'Work Executed'
        : isApprovedDone
        ? 'Ready to start'
        : 'Fulfillment',
      isCompleted: isInProgressDone,
      isCurrent: isInProgressCurrent,
    },
    {
      id: 'step-completed',
      number: '5',
      title: isCompletedDone && !isPaid ? 'Work Done' : 'Completed',
      subtitle: quotation.completed_at
        ? formatDate(quotation.completed_at)
        : isCompletedDone
        ? isPaid
          ? 'Delivered'
          : 'Ready for Payment'
        : 'Final completion',
      isCompleted: isCompletedDone,
      isCurrent: isCompletedDone,
    },
  ];

  const handleStepClick = (stepId: string) => {
    setActiveStepId((prev) => (prev === stepId ? null : stepId));
  };

  if (isClientView) {
    return (
      <div className={`relative rounded-3xl border border-slate-100 bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-sm ring-1 ring-slate-900/5 ${className}`}>
        {/* Sleek 5-Stage Stepper Track */}
        <div className="flex items-center justify-between gap-1 sm:gap-2.5 overflow-x-auto scrollbar-none py-1">
          {steps.map((step, idx) => {
            const isStepActive = activeStepId === step.id;

            // Determine Node Styling
            let nodeClass = 'bg-slate-100 text-slate-400 border border-slate-200';
            let titleClass = 'text-slate-400';
            let subtitleClass = 'text-slate-400';

            if (step.id === 'step-paid') {
              nodeClass = step.customColor.nodeBg;
              titleClass = step.customColor.titleColor;
              subtitleClass = step.customColor.subtitleColor;
            } else if (step.isCompleted) {
              nodeClass = 'bg-emerald-600 text-white shadow-xs';
              titleClass = 'text-slate-900 font-bold';
              subtitleClass = 'text-slate-500 font-medium';
            } else if (step.id === 'step-progress' && isInProgressCurrent) {
              nodeClass = 'bg-sky-600 text-white ring-4 ring-sky-500/20 shadow-xs';
              titleClass = 'text-sky-700 font-bold';
              subtitleClass = 'text-sky-600 font-mono font-semibold';
            } else if (step.isCurrent) {
              nodeClass = 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white ring-4 ring-indigo-500/20 shadow-md shadow-indigo-500/25';
              titleClass = 'text-indigo-600 font-extrabold';
              subtitleClass = 'text-indigo-500 font-semibold';
            }

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`group flex items-center gap-2 shrink-0 p-1.5 sm:px-2 rounded-xl transition-all cursor-pointer text-left focus:outline-hidden ${
                    isStepActive
                      ? 'bg-slate-100/90 ring-1 ring-slate-300 shadow-xs'
                      : 'hover:bg-slate-50'
                  }`}
                  title={`Click to view ${step.title} details`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-transform group-hover:scale-105 shrink-0 ${nodeClass}`}
                  >
                    {step.id === 'step-paid' ? (
                      <CreditCard className="h-3.5 w-3.5" />
                    ) : step.isCompleted ? (
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    ) : step.id === 'step-progress' && isInProgressCurrent && countdownState ? (
                      <div className="relative h-7 w-7 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 32 32">
                          <circle
                            cx="16"
                            cy="16"
                            r="12"
                            className="text-sky-300/40"
                            strokeWidth="2.5"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="12"
                            className="text-white transition-all duration-1000 ease-linear"
                            strokeWidth="2.5"
                            strokeDasharray={2 * Math.PI * 12}
                            strokeDashoffset={((countdownState.progressPercent) / 100) * (2 * Math.PI * 12)}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute text-[8px] font-black text-white font-mono">
                          {countdownState.days > 0
                            ? `${countdownState.days}d`
                            : countdownState.hours > 0
                            ? `${countdownState.hours}h`
                            : countdownState.minutes > 0
                            ? `${countdownState.minutes}m`
                            : `${countdownState.seconds}s`}
                        </span>
                      </div>
                    ) : step.id === 'step-progress' && isInProgressCurrent ? (
                      <div className="relative h-7 w-7 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      step.number
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs font-bold leading-tight truncate ${titleClass}`}>
                      {step.title}
                    </span>
                    <span className={`text-[10px] leading-tight font-medium truncate max-w-[95px] sm:max-w-none ${subtitleClass}`}>
                      {step.subtitle}
                    </span>
                  </div>
                </button>

                {/* Connecting Track Line */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 min-w-[12px] max-w-[48px] h-[2px] bg-slate-200 mx-0.5 rounded-full relative overflow-hidden shrink-0">
                    <div
                      className={`h-full transition-all duration-500 ${
                        step.isCompleted ? 'bg-emerald-500 w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Floating Detail Card (Opened when user clicks any stage) */}
        {activeStepId && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 1. Quotation Issued Floating Details */}
            {activeStepId === 'step-issued' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 flex items-center gap-2">
                      <span>Quotation Issued</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {quotation.quotation_number}
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Officially generated on <strong>{formatDate(quotation.issue_date)}</strong>
                      {quotation.valid_until && ` • Valid until ${formatDate(quotation.valid_until)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStepId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 ml-auto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* 2. Client Approved Floating Details */}
            {activeStepId === 'step-approved' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-950 flex items-center gap-2">
                      <span>Quotation Approved & Signed</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Legally Binding Seal
                      </span>
                    </h5>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {quotation.signature?.signer_name
                        ? `Signed by ${quotation.signature.signer_name} on ${formatDateTime(
                            quotation.signature.signed_at || quotation.approved_at
                          )}.`
                        : quotation.approved_at
                        ? `Approved by client on ${formatDateTime(quotation.approved_at)}.`
                        : 'Awaiting digital approval and client signature.'}
                      {quotation.signature?.signer_email && (
                        <span className="text-emerald-700/80 block sm:inline sm:ml-2">
                          ({quotation.signature.signer_email})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStepId(null)}
                  className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 ml-auto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* 3. Paid Floating Details (Fully Paid / Partially Paid / Unpaid) */}
            {activeStepId === 'step-paid' && (
              <div
                className={`flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl border text-xs shadow-2xs transition-all ${
                  isPaid
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : isCompletedDone
                    ? 'bg-emerald-50/80 border-2 border-emerald-300 text-emerald-950'
                    : isPartiallyPaid
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-rose-50/80 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isPaid || isCompletedDone
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : isPartiallyPaid
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-rose-600 text-white shadow-2xs'
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCompletedDone ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-bold text-xs sm:text-[13px] leading-tight">
                          {isPaid
                            ? 'Payment Status: Fully Settled & Paid'
                            : isCompletedDone
                            ? 'Work is Done! Deliverables are Ready'
                            : isPartiallyPaid
                            ? `Payment Status: ${quotation.advance_percentage || 50}% Advance Paid`
                            : 'Payment Status: Unpaid (Pending Remittance)'}
                        </h5>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            isCompletedDone && !isPaid
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                              : paidStepColor.badgeBg
                          }`}
                        >
                          {isCompletedDone && !isPaid ? 'Work Done • Payment Due' : paidStepColor.label}
                        </span>
                        {isPaymentConfirmed && (isPaid || isPartiallyPaid) && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Confirmed by Company
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {isPaid
                          ? 'Your payment has been fully recorded and verified. Official receipt and tax invoice are available.'
                          : isCompletedDone
                          ? `Project deliverables are complete. Please settle the remaining balance of ${formatCurrency(
                              quotation.balance_amount !== undefined ? quotation.balance_amount : quotation.grand_total,
                              quotation.currency
                            )} for final sign-off and tax invoice.`
                          : isPartiallyPaid
                          ? `Advance payment confirmed. Remaining balance of ${formatCurrency(
                              quotation.balance_amount !== undefined ? quotation.balance_amount : quotation.grand_total,
                              quotation.currency
                            )} is due upon completion.`
                          : `Quotation approved. Please settle the balance of ${formatCurrency(
                              quotation.balance_amount !== undefined ? quotation.balance_amount : quotation.grand_total,
                              quotation.currency
                            )}.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStepId(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 shrink-0 transition-colors cursor-pointer"
                    title="Close details"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Compact Outstanding Balance & Actions Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        Outstanding Balance:
                      </span>
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {formatCurrency(
                          quotation.balance_amount !== undefined
                            ? quotation.balance_amount
                            : isPaid
                            ? 0
                            : quotation.grand_total,
                          quotation.currency
                        )}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>Total Value: {formatCurrency(quotation.grand_total, quotation.currency)}</span>
                      <span className="mx-1.5">•</span>
                      <span>
                        Paid:{' '}
                        {formatCurrency(
                          quotation.paid_amount || (quotation.is_paid ? quotation.grand_total : 0),
                          quotation.currency
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                    {!isPaid && paymentLinkUrl && (
                      <a
                        href={paymentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all w-full sm:w-auto cursor-pointer"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Pay Now</span>
                      </a>
                    )}
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('payment-details-section');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all w-full sm:w-auto cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Payment Details</span>
                      </button>
                    )}
                    {(isPaid || isPartiallyPaid) && onDownloadReceipt && (
                      <button
                        type="button"
                        onClick={onDownloadReceipt}
                        disabled={isDownloadingReceipt}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all w-full sm:w-auto cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{isDownloadingReceipt ? 'Downloading...' : 'Receipt'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. In Progress Floating Details - Compact Live Countdown & Execution Details */}
            {activeStepId === 'step-progress' && (
              <div className="flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-sky-50 via-sky-50/70 to-blue-50/50 border border-sky-200 text-sky-950 shadow-2xs">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-sky-600 text-white shadow-2xs shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-bold text-xs sm:text-[13px] text-sky-950 leading-tight">
                          Fulfillment & Work Execution Phase
                        </h5>
                        {countdownState ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
                            </span>
                            Live Countdown
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                            {quotation.estimated_days === 0
                              ? 'Today (Same Day)'
                              : typeof quotation.estimated_days === 'number'
                              ? `${quotation.estimated_days} Days Est.`
                              : 'In Progress'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-sky-800 mt-0.5 leading-snug">
                        {quotation.estimated_completion_date
                          ? `Target delivery: ${formatDate(quotation.estimated_completion_date)}.`
                          : quotation.estimated_days === 0
                          ? 'Fulfillment scheduled for same-day delivery today.'
                          : 'Our team is actively executing deliverables according to approved quotation scope.'}
                        {quotation.estimated_time_text && ` Note: "${quotation.estimated_time_text}"`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStepId(null)}
                    className="p-1 rounded-md text-sky-600 hover:text-sky-900 hover:bg-sky-100/70 shrink-0 transition-colors cursor-pointer"
                    title="Close details"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Compact Countdown Strip */}
                {countdownState && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-sky-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-9 w-9 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 32 32">
                          <circle
                            cx="16"
                            cy="16"
                            r="12"
                            className="text-sky-200 dark:text-sky-900"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="12"
                            className="text-sky-600 transition-all duration-1000 ease-linear"
                            strokeWidth="3"
                            strokeDasharray={2 * Math.PI * 12}
                            strokeDashoffset={((countdownState.progressPercent) / 100) * (2 * Math.PI * 12)}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute text-[8px] font-black font-mono text-sky-950 dark:text-sky-200">
                          {Math.max(0, Math.round(100 - countdownState.progressPercent))}%
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="font-bold text-sky-950 dark:text-sky-100 block text-[11px] leading-tight">
                          Time Remaining
                        </span>
                        <span className="text-[10px] text-sky-700 dark:text-sky-300 font-mono">
                          {countdownState.isPast ? 'Finalizing deliverables' : countdownState.displayTimeText}
                        </span>
                      </div>
                    </div>

                    {/* 4 Compact Digital Ticker Boxes */}
                    <div className="grid grid-cols-4 gap-1.5 w-full sm:w-auto">
                      <div className="flex flex-col items-center justify-center px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800/60 shadow-2xs min-w-[40px]">
                        <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white leading-none">
                          {String(countdownState.days).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-0.5">Days</span>
                      </div>
                      <div className="flex flex-col items-center justify-center px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800/60 shadow-2xs min-w-[40px]">
                        <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white leading-none">
                          {String(countdownState.hours).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-0.5">Hours</span>
                      </div>
                      <div className="flex flex-col items-center justify-center px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800/60 shadow-2xs min-w-[40px]">
                        <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white leading-none">
                          {String(countdownState.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] uppercase font-bold text-slate-500 dark:text-slate-400 mt-0.5">Mins</span>
                      </div>
                      <div className="flex flex-col items-center justify-center px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800/60 shadow-2xs min-w-[40px]">
                        <span className="text-xs sm:text-sm font-black font-mono text-sky-600 dark:text-sky-400 leading-none">
                          {String(countdownState.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] uppercase font-bold text-sky-600 dark:text-sky-400 mt-0.5">Secs</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. Completed Floating Details */}
            {activeStepId === 'step-completed' && (
              <div
                className={`flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl border text-xs shadow-2xs transition-all ${
                  isCompletedDone && !isPaid
                    ? 'bg-emerald-50/80 border-2 border-emerald-300 text-emerald-950'
                    : 'bg-indigo-50/80 border border-indigo-200 text-indigo-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isCompletedDone && !isPaid
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-indigo-600 text-white shadow-2xs'
                      }`}
                    >
                      {isCompletedDone && !isPaid ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-bold text-xs sm:text-[13px] leading-tight">
                          {isCompletedDone && !isPaid
                            ? 'Work is Done! Deliverables are Ready'
                            : 'Project Completion & Delivery'}
                        </h5>
                        {isCompletedDone && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {isPaid ? 'Delivered & Settled' : 'Work Done • Payment Due'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {isCompletedDone && !isPaid
                          ? `Project deliverables are complete. Please settle the remaining balance of ${formatCurrency(
                              quotation.balance_amount !== undefined ? quotation.balance_amount : quotation.grand_total,
                              quotation.currency
                            )} for final sign-off and tax invoice.`
                          : quotation.completed_at
                          ? `Completed and handed over on ${formatDateTime(quotation.completed_at)}.`
                          : isCompletedDone
                          ? 'All project deliverables and scope have been officially completed.'
                          : 'Final stage: completion sign-off and tax invoice issuance upon delivery.'}
                        {quotation.has_issued_invoice && ` • Invoice INV-${quotation.invoice_number || ''} issued.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStepId(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 shrink-0 transition-colors cursor-pointer"
                    title="Close details"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* If completed but unpaid, show compact payment CTA */}
                {isCompletedDone && !isPaid && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-emerald-200">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Outstanding Balance:
                        </span>
                        <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {formatCurrency(
                            quotation.balance_amount !== undefined ? quotation.balance_amount : quotation.grand_total,
                            quotation.currency
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                      {paymentLinkUrl && (
                        <a
                          href={paymentLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all w-full sm:w-auto cursor-pointer"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Pay Now</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('payment-details-section');
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all w-full sm:w-auto cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Payment Details</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Dashboard / Admin view (Default - Apple-Style Slim Tracker)
  return (
    <div className={`rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 p-2 sm:px-3 sm:py-2.5 shadow-2xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Lifecycle Workflow
          </h4>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full border font-bold ${paidStepColor.badgeBg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${paidStepColor.dot}`} />
            {paidStepColor.label}
          </span>
          {isInProgressCurrent && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold">
              <span className="h-1 w-1 rounded-full bg-sky-500 animate-ping" />
              In Progress
              {quotation.estimated_days === 0
                ? ' (Today)'
                : typeof quotation.estimated_days === 'number'
                ? ` (${quotation.estimated_days}d)`
                : ''}
            </span>
          )}
          {status === 'APPROVED' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
              <Check className="h-2.5 w-2.5 text-emerald-600" />
              Approved
            </span>
          )}
          {isCompletedDone && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Slim 5-Stage Stepper Track */}
      <div className="flex items-center gap-1 sm:grid sm:grid-cols-5 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {steps.map((step, idx) => {
          let nodeBg = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700';
          let textColor = 'text-slate-600 dark:text-slate-400';
          let badgeBorder = 'border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70';

          if (step.id === 'step-paid') {
            nodeBg = step.customColor.nodeBg;
            textColor = step.customColor.titleColor;
            badgeBorder = `border-slate-200 dark:border-slate-800 ${step.customColor.badgeBg}`;
          } else if (step.isCompleted) {
            nodeBg = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs shadow-emerald-500/20';
            textColor = 'text-slate-900 dark:text-slate-100';
            badgeBorder = 'border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70';
          } else if (step.isCurrent) {
            nodeBg = 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-1 ring-indigo-500/20';
            textColor = 'text-slate-900 dark:text-slate-100';
            badgeBorder = 'border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50/80';
          }

          const isStepActive = activeStepId === step.id;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              className={`p-1.5 sm:px-2 rounded-lg border transition-all flex items-center gap-2 relative text-left cursor-pointer shrink-0 min-w-[130px] sm:min-w-0 ${badgeBorder} ${
                isStepActive ? 'ring-2 ring-indigo-400/40 dark:ring-indigo-600/40' : ''
              }`}
              title={`Click to view ${step.title} details`}
            >
              <div
                className={`h-5 w-5 rounded-md border flex items-center justify-center font-bold text-[9px] shrink-0 transition-transform ${nodeBg}`}
              >
                {step.id === 'step-paid' ? (
                  <CreditCard className="h-2.5 w-2.5" />
                ) : step.isCompleted ? (
                  <Check className="h-3 w-3 stroke-[2.5]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold leading-tight truncate ${textColor}`}>
                    {step.title}
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-snug truncate">
                  {step.subtitle}
                </p>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden sm:block absolute -right-1 top-1/2 -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700 pointer-events-none">
                  <ChevronRight className="h-2.5 w-2.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
