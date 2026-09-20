import React from 'react';
import { cn } from '@/lib/utils';
import { QuotationStatus } from '@/types/database';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'purple';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    secondary: 'bg-brand-50 text-brand-700 border-brand-200',
    outline: 'border border-slate-300 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
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

export function StatusBadge({ status, className }: { status: QuotationStatus | string; className?: string }) {
  switch (status) {
    case 'APPROVED':
      return (
        <Badge variant="success" className={cn('bg-emerald-100/70 text-emerald-800 border-emerald-300', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Approved
        </Badge>
      );
    case 'SENT':
      return (
        <Badge variant="secondary" className={cn('bg-blue-100/70 text-blue-800 border-blue-300', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Sent
        </Badge>
      );
    case 'VIEWED':
      return (
        <Badge variant="purple" className={cn('bg-purple-100/70 text-purple-800 border-purple-300', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          Viewed
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="warning" className={cn('bg-amber-100/70 text-amber-800 border-amber-300', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Pending
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge variant="destructive" className={cn('bg-rose-100/70 text-rose-800 border-rose-300', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Rejected
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge variant="default" className={cn('bg-slate-100 text-slate-600 border-slate-300', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Expired
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="default" className={cn('bg-slate-200 text-slate-700 border-slate-400', className)}>
          Cancelled
        </Badge>
      );
    case 'DRAFT':
    default:
      return (
        <Badge variant="default" className={cn('bg-slate-100 text-slate-600 border-slate-200', className)}>
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Draft
        </Badge>
      );
  }
}
