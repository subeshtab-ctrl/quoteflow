'use client';

import React from 'react';
import Link from 'next/link';
import { SubscriptionAccess } from '@/types/database';
import { AlertCircle, Clock, ShieldAlert, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
import { isOwnerOrAdminRole } from '@/types/staff';

export function BillingBanner({
  access,
  businessCountry,
  userRole,
}: {
  access: SubscriptionAccess | null;
  businessCountry?: string | null;
  userRole?: string;
}) {
  if (!access) return null;

  // For STAFF accounts (all non-Owner/Admin roles): only show expiration message without any payment buttons or pricing
  const effectiveRole = (userRole || 'OWNER').toUpperCase();
  const isStaff = effectiveRole !== 'OWNER' && effectiveRole !== 'ADMIN' && effectiveRole !== 'SUPER_ADMIN';
  if (isStaff) {
    if (
      access.isRestricted ||
      access.isExpired ||
      access.isPastDue ||
      access.isPaymentOverdue ||
      access.accountAccess === 'restricted' ||
      (access.isPaymentDue && !access.isPaid)
    ) {
      return (
        <div className="w-full border-b px-4 py-3 sm:px-6 bg-rose-600/10 border-rose-600/30 text-rose-900 dark:text-rose-200">
          <div className="max-w-7xl mx-auto flex items-center gap-2.5 text-xs sm:text-sm">
            <Lock className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="font-medium">
              Your organization&apos;s QuoteFlow subscription has expired. Please contact your administrator.
            </p>
          </div>
        </div>
      );
    }
    // Staff members do not see trial countdowns or pricing reminders
    return null;
  }

  // Don't show if active paid with no issues
  if (access.isPaid && !access.isRestricted && !access.isGracePeriod && !access.isPastDue) {
    return null;
  }

  const isIndia = businessCountry
    ? businessCountry.toUpperCase() === 'IN'
    : access.currency
    ? access.currency === 'INR'
    : true;
  const priceDisplay = access.priceDisplay || (isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedPrice : SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice);
  const pricePerMonth = isIndia ? SUBSCRIPTION_CONFIG.INDIA.formattedMonthly : SUBSCRIPTION_CONFIG.GLOBAL.formattedMonthly;
  const locale = isIndia ? 'en-IN' : 'en-US';

  const trialEndDate = access.trialEndsAt
    ? new Date(access.trialEndsAt).toLocaleDateString(locale, {
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
              Your {priceDisplay} subscription payment is overdue. Please complete payment to restore full QuoteFlow access.
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
    let msg = `Your ${priceDisplay} QuoteFlow payment is overdue. Please complete payment to avoid interruption.`;

    if (overdueDay === 2) {
      msg = `Your ${priceDisplay} payment is 2 days overdue. Please pay now to keep your account active.`;
    } else if (overdueDay === 3) {
      title = `🚨 Final Payment Reminder:`;
      msg = `Your ${priceDisplay} QuoteFlow payment is 3 days overdue. Please complete payment today to avoid account restrictions.`;
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
              <span className="font-bold mr-1.5">⚠️ Free Trial Expired:</span>
              Subscribe to QuoteFlow Pro for {pricePerMonth} to maintain full access to quotations and invoices.
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
              Your free trial ends in {days} {days === 1 ? 'day' : 'days'}. After your trial: {pricePerMonth}.
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
