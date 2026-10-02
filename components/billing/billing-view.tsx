'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BusinessSubscription,
  SubscriptionAccess,
  SubscriptionPayment,
  SubscriptionPlan,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  X,
  Loader2,
  Calendar,
  Receipt,
  Headphones,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface BillingViewProps {
  initialData?: {
    subscription: BusinessSubscription | null;
    access: SubscriptionAccess | null;
    isEligibleForPromo: boolean;
    promoPlan: SubscriptionPlan;
    plans: SubscriptionPlan[];
    payments: SubscriptionPayment[];
  };
}

export function BillingView({ initialData }: BillingViewProps) {
  const [data, setData] = useState(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Too expensive');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subscriptions');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setFeedbackMsg({ type: 'error', text: json.error || 'Failed to load billing details' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Network error loading billing information' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchBillingData();
    }
  }, [initialData]);

  // Load Razorpay script dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planSlug: string) => {
    try {
      setIsProcessingCheckout(true);
      setFeedbackMsg(null);

      // 1. Initiate subscription checkout session on server
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: planSlug }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to initialize subscription checkout');
      }

      const { checkout } = json;

      // 2. Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay checkout script. Please check your connection.');
      }

      // 3. Open Razorpay Standard Web Checkout
      const options = {
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: 'QuoteFlow',
        description: checkout.planName,
        image: '/uploads/logo-1790062784938.jpg',
        handler: async function (response: any) {
          // 4. Verify payment signature on backend
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (verifyRes.ok) {
              setFeedbackMsg({
                type: 'success',
                text: 'Subscription successfully activated! Welcome to QuoteFlow Premium.',
              });
              await fetchBillingData();
            } else {
              setFeedbackMsg({
                type: 'error',
                text: verifyJson.error || 'Payment verification could not be confirmed',
              });
            }
          } catch {
            setFeedbackMsg({
              type: 'error',
              text: 'Error verifying payment signature with server',
            });
          }
        },
        theme: {
          color: '#4f46e5',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setFeedbackMsg({
          type: 'error',
          text: `Payment failed: ${resp.error?.description || 'Authorization declined'}`,
        });
      });
      rzp.open();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error launching payment' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          cancel_at_period_end: cancelAtPeriodEnd,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to cancel subscription');

      setFeedbackMsg({
        type: 'success',
        text: cancelAtPeriodEnd
          ? 'Subscription cancellation scheduled for the end of the current billing cycle. You maintain full access until then.'
          : 'Subscription cancelled immediately.',
      });
      setCancelModalOpen(false);
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error cancelling subscription' });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setIsProcessingCheckout(true);
      const res = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: 'monthly_199' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reactivate subscription');
      setFeedbackMsg({ type: 'success', text: 'Subscription reactivated!' });
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error reactivating' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Loading subscription details...</p>
      </div>
    );
  }

  const sub = data?.subscription;
  const access = data?.access;
  const isEligible = data?.isEligibleForPromo ?? true;

  const currentPriceFormatted =
    sub?.amount === 9900 ? '₹99.00' : sub?.amount === 19900 ? '₹199.00' : '₹0.00';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Subscription & Billing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your QuoteFlow plans, promotional cycles, payment history, and invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/support">
            <Button variant="outline" size="sm" className="gap-2">
              <Headphones className="h-4 w-4 text-slate-600" />
              <span>Billing Support</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 ml-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Current Plan</span>
              <Badge
                className={
                  access?.isPaid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200'
                    : access?.isTrial
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200'
                }
              >
                {access?.status?.toUpperCase()}
              </Badge>
              {sub?.cancel_at_period_end && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  Cancelling at cycle end
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{access?.planName || 'QuoteFlow Free Trial'}</span>
              {access?.promoActive && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Special Offer Active</span>
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {access?.isTrial
                ? `30-Day Free Trial. Zero charge. Ends on ${new Date(sub?.trial_end_at || Date.now()).toLocaleDateString()}.`
                : access?.isPaid
                ? `Recurring monthly billing via Razorpay.`
                : 'Account needs reactivation.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-right sm:pr-4 border-slate-200 dark:border-slate-800 sm:border-r">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentPriceFormatted}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
              <p className="text-xs text-slate-500">Billed monthly in INR</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {sub?.cancel_at_period_end ? (
                <Button
                  size="sm"
                  onClick={handleReactivate}
                  disabled={isProcessingCheckout}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  <span>Resume Subscription</span>
                </Button>
              ) : access?.isPaid ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCancelModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  Cancel Plan
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Trial Countdown</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span>{access?.daysRemainingInTrial ?? 0} Days Left</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">30-day initial trial</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Promotional Cycles</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>{sub?.promotional_cycles_completed ?? 0} of 3 Completed</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {sub?.promo_months_remaining ?? 3} ₹99 cycles remaining
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Current Billing Cycle</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>
                {sub?.current_period_end
                  ? new Date(sub.current_period_end).toLocaleDateString()
                  : 'N/A'}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Next renewal date</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Payment State</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>{access?.isPastDue ? 'Past Due' : access?.isGracePeriod ? 'Grace Period' : 'Verified'}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Razorpay server confirmed</p>
          </div>
        </div>
      </div>

      {/* Available Plans Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Choose Your Plan
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Subscribe securely through Razorpay. Automatic server transitions guarantee your promotional pricing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Plan 1: Free Trial */}
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan 1</span>
                {access?.isTrial && (
                  <Badge variant="outline" className="border-indigo-400 text-indigo-600 text-xs">
                    Current Plan
                  </Badge>
                )}
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Free Trial
                </h4>
                <p className="text-xs text-slate-500 mt-1">30 days full feature access</p>
              </div>
              <div className="pt-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">₹0</span>
                <span className="text-xs text-slate-400 ml-1">/30 days</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Unlimited Quotations & Invoices</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Client PIN Approval Portal</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>One trial per business</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <Button
                variant="outline"
                disabled
                className="w-full text-xs font-medium border-slate-200 text-slate-400"
              >
                {access?.isTrial ? 'Trial Active' : 'Trial Used'}
              </Button>
            </div>
          </div>

          {/* Plan 2: ₹99 Special Offer (Featured) */}
          <div className={`relative rounded-2xl border-2 ${isEligible ? 'border-indigo-500 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'border-slate-200 dark:border-slate-800 opacity-70'} bg-white dark:bg-slate-900 p-6 flex flex-col justify-between`}>
            {isEligible && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                Special Offer
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Introductory Offer
                </span>
                {sub?.amount === 9900 && (
                  <Badge className="bg-indigo-600 text-white text-xs">Active Plan</Badge>
                )}
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Special Offer
                </h4>
                <p className="text-xs text-slate-500 mt-1">₹99/mo for first 3 successful billing cycles</p>
              </div>
              <div className="pt-2">
                <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">₹99</span>
                <span className="text-xs text-slate-400 ml-1">/month</span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Then automatically ₹199/month thereafter
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>3 Months at 50% discount</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Automatic server-side plan transition</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>No need to re-subscribe manually</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Cancel anytime at period end</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              {isEligible ? (
                <Button
                  onClick={() => handleSubscribe('promo_99')}
                  disabled={isProcessingCheckout || sub?.amount === 9900}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs shadow-xs"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : sub?.amount === 9900 ? (
                    'Active Plan'
                  ) : (
                    'Claim ₹99 Offer'
                  )}
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full text-xs text-slate-400">
                  Offer Already Redeemed
                </Button>
              )}
            </div>
          </div>

          {/* Plan 3: ₹199 Standard */}
          <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Standard Plan</span>
                {sub?.amount === 19900 && (
                  <Badge className="bg-emerald-600 text-white text-xs">Active Plan</Badge>
                )}
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Standard
                </h4>
                <p className="text-xs text-slate-500 mt-1">Recurring monthly subscription</p>
              </div>
              <div className="pt-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">₹199</span>
                <span className="text-xs text-slate-400 ml-1">/month</span>
                <p className="text-[11px] text-slate-500 mt-1">Recurring indefinitely until cancelled</p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Unlimited Quotations & Revisions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Tax Invoice Sequential Numbering</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Interactive Client PIN Gate Portal</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>7-Day Payment Grace Period</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <Button
                variant={sub?.amount === 19900 ? 'outline' : 'primary'}
                onClick={() => handleSubscribe('monthly_199')}
                disabled={isProcessingCheckout || sub?.amount === 19900}
                className="w-full text-xs font-semibold"
              >
                {isProcessingCheckout ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sub?.amount === 19900 ? (
                  'Active Plan'
                ) : (
                  'Subscribe at ₹199'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <span>Payment History</span>
            </h4>
            <p className="text-xs text-slate-500">
              Verified recurring transactions recorded via Razorpay webhooks.
            </p>
          </div>
        </div>

        {data?.payments && data.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Payment ID</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">{p.razorpay_payment_id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      ₹{(p.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 uppercase text-slate-500">{p.payment_method || 'CARD'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'captured' || p.status === 'authorized'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments recorded yet. Active payments will show here after confirmed Razorpay billing cycles.
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Subscription">
          <div className="space-y-4 p-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              We are sorry to see you go. If you cancel, your paid subscription will not renew, but you will retain full access until the end of your current cycle.
            </p>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Reason for cancellation:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
              >
                <option value="Too expensive">Too expensive</option>
                <option value="Not using enough">Not using enough</option>
                <option value="Missing feature">Missing feature</option>
                <option value="Technical issue">Technical issue</option>
                <option value="Moving to another service">Moving to another service</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="cancelAtEnd"
                checked={cancelAtPeriodEnd}
                onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="cancelAtEnd" className="text-slate-600 dark:text-slate-300">
                Cancel at period end (Keep access until current cycle completes)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>
                Keep My Plan
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
