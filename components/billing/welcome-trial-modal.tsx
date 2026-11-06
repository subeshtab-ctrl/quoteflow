'use client';

import React, { useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Check,
  FileText,
  Send,
  Users,
  BarChart3,
  X,
  ArrowRight,
} from 'lucide-react';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';

export interface WelcomeTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialEndsAt?: string | Date | null;
  businessCountry?: string | null;
  planPrice?: string | null;
  billingCurrency?: string | null;
}

export function WelcomeTrialModal({
  isOpen,
  onClose,
  trialEndsAt,
  businessCountry,
  billingCurrency,
}: WelcomeTrialModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isIndia =
    (businessCountry || 'IN').toUpperCase() === 'IN' ||
    (billingCurrency || '').toUpperCase() === 'INR';

  // Pricing from centralized subscription configuration
  const price = isIndia
    ? SUBSCRIPTION_CONFIG.INDIA.formattedPrice
    : SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice;

  // Format real trial end date, defaulting dynamically to now + trial duration if not specified
  const formattedTrialEndDate = useMemo(() => {
    let date: Date | null = null;
    if (trialEndsAt) {
      const parsed = new Date(trialEndsAt);
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    }

    if (!date) {
      date = new Date(Date.now() + (SUBSCRIPTION_CONFIG.TRIAL_DAYS || 14) * 24 * 60 * 60 * 1000);
    }

    return new Intl.DateTimeFormat(isIndia ? 'en-IN' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }, [trialEndsAt, isIndia]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-[4px] p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-welcome-title"
    >
      {/* Backdrop click dismiss */}
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Card */}
      <div
        className="
          relative
          w-full max-w-[660px]
          max-h-[calc(100dvh-24px)]
          overflow-y-auto
          rounded-[28px]
          border border-white/80 dark:border-slate-800
          bg-white dark:bg-slate-900
          shadow-[0_30px_90px_rgba(44,36,120,0.28)]
          animate-in zoom-in-95 duration-200
        "
      >
        {/* Decorative Top Glow */}
        <div
          className="
            pointer-events-none absolute inset-x-0 top-0 h-64
            bg-gradient-to-b
            from-violet-100/80 via-fuchsia-50/40 to-transparent
            dark:from-violet-950/30 dark:via-fuchsia-950/10 dark:to-transparent
          "
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="
            absolute right-5 top-5 z-20
            flex h-9 w-9 items-center justify-center
            rounded-full
            text-slate-400
            transition
            hover:bg-slate-100 dark:hover:bg-slate-800
            hover:text-slate-700 dark:hover:text-slate-200
            focus:outline-none focus:ring-2 focus:ring-violet-400
          "
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 px-5 pb-6 pt-9 sm:px-8 sm:pb-8 sm:pt-10">
          {/* Logo & Tasteful Confetti / Stars Celebration Decoration */}
          <div className="mb-5 flex justify-center">
            <div className="relative flex items-center justify-center">
              {/* Confetti Ribbons & Stars */}
              <span className="absolute -left-16 top-4 text-xl select-none animate-bounce [animation-duration:2.5s]">
                🎉
              </span>
              <span className="absolute -right-16 top-3 text-xl select-none animate-pulse">
                ✨
              </span>
              <span className="absolute -left-9 -top-3 text-sm select-none text-amber-400 font-bold">
                ⭐
              </span>
              <span className="absolute -right-9 -top-3 text-sm select-none text-amber-400 font-bold">
                ⭐
              </span>

              {/* Colorful Confetti Dots/Ribbons matching reference design */}
              <div className="absolute -left-20 -top-1 w-2.5 h-4 bg-cyan-400 rounded-full rotate-45 opacity-80" />
              <div className="absolute -left-12 -top-5 w-2 h-2 bg-pink-500 rounded-full opacity-80" />
              <div className="absolute 16 -top-5 w-2 h-2 bg-purple-500 rounded-full opacity-80" />
              <div className="absolute -right-20 -top-1 w-2.5 h-4 bg-blue-500 rounded-full -rotate-45 opacity-80" />
              <div className="absolute -right-14 8 w-2 h-3.5 bg-fuchsia-500 rounded-full rotate-12 opacity-80" />

              {/* Official QuoteFlow Logo Asset */}
              <div
                className="
                  flex h-[76px] w-[76px]
                  items-center justify-center
                  rounded-[24px]
                  bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-500
                  p-1
                  shadow-[0_15px_35px_rgba(124,58,237,0.32)]
                  overflow-hidden
                "
              >
                <img
                  src="/quoteflow-icon.png"
                  alt="QuoteFlow"
                  className="h-full w-full object-contain rounded-[20px]"
                />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2
              id="trial-welcome-title"
              className="
                text-[28px] font-extrabold tracking-tight
                text-slate-900 dark:text-white
                sm:text-[36px]
              "
            >
              Welcome to{' '}
              <span
                className="
                  bg-gradient-to-r
                  from-blue-500 via-indigo-500 to-violet-600
                  bg-clip-text text-transparent
                "
              >
                QuoteFlow!
              </span>
            </h2>

            <p className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-200 sm:text-lg">
              Your{' '}
              <span className="font-extrabold text-emerald-500">
                14-day free trial
              </span>{' '}
              is now active.
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Start creating professional quotes and grow your business faster.
            </p>
          </div>

          {/* Trial / Price Card (Two Sections) */}
          <div
            className="
              mt-6 grid grid-cols-1 sm:grid-cols-2
              overflow-hidden
              rounded-[22px]
              border border-violet-100 dark:border-slate-800
              bg-gradient-to-r from-rose-50/70 via-white to-violet-50/70
              dark:from-slate-800/80 dark:via-slate-850 dark:to-slate-800/80
            "
          >
            {/* LEFT: Trial ends */}
            <div className="flex items-center gap-4 p-5 sm:p-6">
              <div
                className="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-2xl
                  bg-pink-100 dark:bg-pink-950/60
                  text-pink-500 dark:text-pink-400
                "
              >
                <CalendarDays className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Trial ends
                </p>
                <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {formattedTrialEndDate}
                </p>
              </div>
            </div>

            {/* RIGHT: After your trial */}
            <div
              className="
                border-t border-violet-100 dark:border-slate-800
                p-5 sm:p-6
                sm:border-l sm:border-t-0
                flex flex-col justify-center
              "
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                After your trial
              </p>
              <p className="mt-0.5 text-[26px] sm:text-[28px] font-extrabold text-rose-500 dark:text-rose-400 tracking-tight">
                {price}
                <span className="text-base sm:text-lg font-bold text-rose-500/80 dark:text-rose-400/80">
                  {' '}
                  / month
                </span>
              </p>
            </div>
          </div>

          {/* 4 Feature Blocks */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Feature
              icon={<FileText className="h-5 w-5" />}
              title="Create"
              description="professional quotes"
              iconClass="bg-blue-100 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400"
            />

            <Feature
              icon={<Send className="h-5 w-5" />}
              title="Send via"
              description="WhatsApp or Email"
              iconClass="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 dark:text-emerald-400"
            />

            <Feature
              icon={<Users className="h-5 w-5" />}
              title="Get"
              description="approvals faster"
              iconClass="bg-violet-100 dark:bg-violet-950/60 text-violet-500 dark:text-violet-400"
            />

            <Feature
              icon={<BarChart3 className="h-5 w-5" />}
              title="Track"
              description="sales & payments"
              iconClass="bg-orange-100 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400"
            />
          </div>

          {/* Subscription Reassurance Message */}
          <div
            className="
              mt-6 flex items-start gap-3
              rounded-[20px]
              border border-emerald-100 dark:border-emerald-900/40
              bg-gradient-to-r from-emerald-50 to-teal-50
              dark:from-emerald-950/30 dark:to-teal-950/20
              px-4 py-3.5 sm:px-5
              text-xs sm:text-sm text-slate-700 dark:text-slate-200
            "
          >
            <div
              className="
                mt-0.5 flex h-6 w-6 sm:h-7 sm:w-7 shrink-0
                items-center justify-center
                rounded-full
                bg-emerald-500
                text-white
                shadow-xs
              "
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3]" />
            </div>

            <p className="leading-relaxed">
              You can start your subscription anytime during your trial with
              zero disruption.
            </p>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onClose}
            className="
              group mt-6
              flex min-h-[56px] w-full
              items-center justify-center gap-3
              rounded-[20px]
              bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600
              px-6
              text-base font-bold text-white
              shadow-[0_14px_35px_rgba(79,70,229,0.30)]
              transition duration-200
              hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(79,70,229,0.38)]
              active:translate-y-0
              focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-800
              cursor-pointer
            "
          >
            <span>Continue to QuoteFlow</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconClass: string;
}

function Feature({ icon, title, description, iconClass }: FeatureProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl p-2 sm:p-1.5">
      <div
        className={`
          flex h-10 w-10 shrink-0
          items-center justify-center
          rounded-xl
          ${iconClass}
        `}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">
          {description}
        </p>
      </div>
    </div>
  );
}
