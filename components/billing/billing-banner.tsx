'use client';

import React from 'react';
import Link from 'next/link';
import { SubscriptionAccess } from '@/types/database';
import { AlertCircle, Clock, ShieldAlert, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BillingBanner({ access }: { access: SubscriptionAccess | null }) {
  if (!access) return null;

  // Don't show if active paid with no issues
  if (access.isPaid && !access.isRestricted && !access.isGracePeriod && !access.isPastDue) {
    return null;
  }

  const trialEndDate = access.trialEndsAt
    ? new Date(access.trialEndsAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  // 1. Restricted after 3-day grace period
  if (access.isRestricted || access.accountAccess === 'restricted') {
    return (
      <div className="w-full border-b px-4 py-3 sm:px-6 bg-rose-600/10 border-rose-600/30 text-rose-900 dark:text-rose-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <Lock className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="font-medium">
              <span className="font-bold mr-1.5">🔒 Billing Required:</span>
              Your ₹99 subscription payment is overdue. Please complete payment to restore full QuoteFlow access.
            </p>
          </div>
          <Link href="/billing" className="shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs gap-1.5"
            >
              <span>Pay Now</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Grace Period Reminders (Day 1, Day 2, Day 3)
  if (access.isGracePeriod && !access.isPaid) {
    const daysLeft = access.graceDaysRemaining;
    const overdueDay = Math.min(3, Math.max(1, 4 - daysLeft));

    let title = `⚠️ Payment Overdue:`;
    let msg = `Your ₹99 QuoteFlow payment is overdue. Please complete payment to avoid interruption.`;

    if (overdueDay === 2) {
      msg = `Your ₹99 payment is 2 days overdue. Please pay now to keep your account active.`;
    } else if (overdueDay === 3) {
      title = `🚨 Final Payment Reminder:`;
      msg = `Your ₹99 QuoteFlow payment is 3 days overdue. Please complete payment today to avoid account restrictions.`;
    }

    return (
      <div className="w-full border-b px-4 py-3 sm:px-6 bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="font-medium">
              <span className="font-bold mr-1.5">{title}</span>
              {msg}
            </p>
          </div>
          <Link href="/billing" className="shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs gap-1.5"
            >
              <span>Pay Now</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Payment Due (Trial Expired without payment)
  if (access.isPaymentDue && !access.isPaid) {
    return (
      <div className="w-full border-b px-4 py-3 sm:px-6 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="font-medium">
              <span className="font-bold mr-1.5">⚠️ Payment Due:</span>
              ₹99 payment is due. Due date: {trialEndDate || 'today'}.
            </p>
          </div>
          <Link href="/billing" className="shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs gap-1.5"
            >
              <span>Pay Now</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Trial Reminder (<= 7 days remaining: 7, 5, 3, 1 days)
  if (access.isTrial && access.daysRemainingInTrial <= 7) {
    const days = access.daysRemainingInTrial;
    return (
      <div className="w-full border-b px-4 py-2.5 sm:px-6 bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <Clock className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <p className="font-medium">
              <span className="font-bold mr-1.5">⚠️ Trial Reminder:</span>
              Your free trial ends in {days} {days === 1 ? 'day' : 'days'}. After your trial: ₹99/month.
            </p>
          </div>
          <Link href="/billing" className="shrink-0">
            <Button
              size="sm"
              className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs gap-1.5"
            >
              <span>Subscribe</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
