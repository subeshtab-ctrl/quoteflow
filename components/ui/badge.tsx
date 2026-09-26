import React from 'react';
import { cn } from '@/lib/utils';
import { QuotationStatus, InvoiceStatus } from '@/types/database';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'purple' | 'emerald' | 'cyan';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    secondary: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    outline: 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
  isPaid,
  completedUnpaid,
  paymentStatus,
  paidAmount,
}: {
  status: QuotationStatus | string;
  className?: string;
  isPaid?: boolean;
  completedUnpaid?: boolean;
  paymentStatus?: string;
  paidAmount?: number;
}) {
  const isPartiallyPaid =
    !isPaid && (paymentStatus === 'PARTIALLY_PAID' || (paidAmount !== undefined && paidAmount > 0));

  switch (status) {
    case 'COMPLETED':
      if (isPaid === false || completedUnpaid === true) {
        if (isPartiallyPaid) {
          return (
            <Badge
              variant="cyan"
              className={cn(
                'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-700 font-bold',
                className
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
              Completed (Partially Paid)
            </Badge>
          );
        }
        return (
          <Badge
            variant="warning"
            className={cn(
              'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700 font-bold',
              className
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
            Completed (Unpaid)
          </Badge>
        );
      }
      return (
        <Badge
          variant="success"
          className={cn(
            'bg-indigo-100/80 text-indigo-900 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-700 font-bold',
            className
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          Completed
        </Badge>
      );
    case 'PAYMENT_COMPLETED':
      return (
        <Badge variant="emerald" className={cn('bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700 font-bold', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          Payment Completed
        </Badge>
      );
    case 'APPROVED':
      if (isPaid) {
        return (
          <Badge variant="emerald" className={cn('bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700 font-bold', className)}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Approved (Paid)
          </Badge>
        );
      }
      if (isPartiallyPaid) {
        return (
          <Badge variant="cyan" className={cn('bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-700 font-bold', className)}>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
            Approved (Partially Paid)
          </Badge>
        );
      }
      return (
        <Badge variant="success" className={cn('bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Approved
        </Badge>
      );
    case 'SENT':
      return (
        <Badge variant="secondary" className={cn('bg-blue-100/70 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Sent
        </Badge>
      );
    case 'VIEWED':
      return (
        <Badge variant="purple" className={cn('bg-purple-100/70 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Viewed
        </Badge>
      );
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="warning" className={cn('bg-amber-100/70 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Pending
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={cn('bg-rose-100/70 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Rejected
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge variant="default" className={cn('bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Expired
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="default" className={cn('bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', className)}>
          Cancelled
        </Badge>
      );
    case 'DRAFT':
    default:
      return (
        <Badge variant="default" className={cn('bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Draft
        </Badge>
      );
  }
}

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus | string; className?: string }) {
  switch (status) {
    case 'PAID':
      return (
        <Badge variant="success" className={cn('bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Paid
        </Badge>
      );
    case 'PARTIAL':
      return (
        <Badge variant="warning" className={cn('bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 font-semibold', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Partial
        </Badge>
      );
    case 'ISSUED':
      return (
        <Badge variant="secondary" className={cn('bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 font-semibold', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Unpaid / Issued
        </Badge>
      );
    case 'OVERDUE':
      return (
        <Badge variant="destructive" className={cn('bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 font-bold', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Overdue
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="default" className={cn('bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400', className)}>
          Cancelled
        </Badge>
      );
    case 'DRAFT':
    default:
      return (
        <Badge variant="default" className={cn('bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Draft
        </Badge>
      );
  }
}
