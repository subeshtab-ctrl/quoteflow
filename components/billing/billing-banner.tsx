'use client';

import React from 'react';
import Link from 'next/link';
import { SubscriptionAccess } from '@/types/database';
import { AlertCircle, Clock, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BillingBanner({ access }: { access: SubscriptionAccess | null }) {
  if (!access) return null;

  // Don't show if active paid with no issues
  if (access.isPaid && !access.isPastDue && !access.isGracePeriod) {
    return null;
  }

  // Active trial with > 14 days left: subtle banner or none to avoid annoyance
  if (access.isTrial && access.daysRemainingInTrial > 7) {
    return null;
  }

  let bannerConfig = {
    bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-900 dark:text-indigo-200',
    icon: Clock,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    title: 'Free Trial Active',
    message: `Your QuoteFlow trial ends in ${access.daysRemainingInTrial} ${access.daysRemainingInTrial === 1 ? 'day' : 'days'}.`,
    actionText: 'Subscribe Now',
    actionHref: '/billing',
  };

  if (access.isTrial && access.daysRemainingInTrial <= 3) {
    bannerConfig = {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
      icon: AlertCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Trial Ending Soon',
      message: `Your QuoteFlow trial ends in ${access.daysRemainingInTrial} ${access.daysRemainingInTrial === 1 ? 'day' : 'days'}. Subscribe today to keep creating quotes and invoices.`,
      actionText: 'Upgrade to Save 50%',
      actionHref: '/billing',
    };
  } else if (access.isExpired) {
    bannerConfig = {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200',
      icon: ShieldAlert,
      iconColor: 'text-rose-600 dark:text-rose-400',
      title: 'Free Trial Expired',
      message: 'Your 30-day free trial has expired. Your data is completely safe, but paid features are locked.',
      actionText: 'Activate Subscription',
      actionHref: '/billing',
    };
  } else if (access.isGracePeriod) {
    bannerConfig = {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200',
      icon: AlertCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Payment Grace Period',
      message: `Your subscription payment could not be processed. Grace period active (${access.graceDaysRemaining} days remaining).`,
      actionText: 'Retry Payment',
      actionHref: '/billing',
    };
  } else if (access.isPastDue || access.isHalted) {
    bannerConfig = {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200',
      icon: ShieldAlert,
      iconColor: 'text-rose-600 dark:text-rose-400',
      title: 'Subscription Attention Needed',
      message: 'Your QuoteFlow subscription has been halted due to unconfirmed payment.',
      actionText: 'Update Billing',
      actionHref: '/billing',
    };
  }

  const Icon = bannerConfig.icon;

  return (
    <div className={`w-full border-b px-4 py-2.5 sm:px-6 transition-colors ${bannerConfig.bg}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <Icon className={`h-4 w-4 shrink-0 ${bannerConfig.iconColor}`} />
          <p className="font-medium">
            <span className="font-bold mr-1.5">{bannerConfig.title}:</span>
            {bannerConfig.message}
          </p>
        </div>
        <Link href={bannerConfig.actionHref} className="shrink-0">
          <Button
            size="sm"
            className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs gap-1.5"
          >
            <span>{bannerConfig.actionText}</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
