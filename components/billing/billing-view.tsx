'use client';

import React, { useState, useEffect } from 'react';
import {
  BusinessSubscription,
  SubscriptionAccess,
  SubscriptionPayment,
  SubscriptionPlan,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { SupportHelpModal } from '@/components/support/support-help-modal';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Clock,
  ShieldCheck,
  RotateCcw,
  X,
  Loader2,
  Calendar,
  Receipt,
  Headphones,
  Check,
  Lock,
  ExternalLink,
  Zap,
  ArrowLeft,
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
    isEligibleForPromo?: boolean;
    promoPlan?: SubscriptionPlan;
    plans?: SubscriptionPlan[];
    payments?: SubscriptionPayment[];
    isTestMode?: boolean;
    keyId?: string | null;
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

  // Support & Help Modal state
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Transaction Detail Modal state (Requirement 14)
  const [selectedTransaction, setSelectedTransaction] = useState<SubscriptionPayment | null>(null);

  // Test Mode Simulation Modal state
  const [mockSimulationModalOpen, setMockSimulationModalOpen] = useState(false);
  const [mockCheckoutData, setMockCheckoutData] = useState<any>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subscriptions', { cache: 'no-store' });
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
    fetchBillingData();
  }, []);

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

  const handleSubscribe = async () => {
    try {
      setIsProcessingCheckout(true);
      setFeedbackMsg(null);

      // 1. Create checkout on server for QuoteFlow Pro (₹99/month)
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: 'monthly_99' }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to initialize subscription checkout');
      }

      const { checkout } = json;

      // In mock simulation mode (no live Razorpay keys configured yet)
      if (
        checkout.isMock ||
        !checkout.keyId ||
        checkout.keyId.includes('placeholder') ||
        checkout.subscriptionId?.startsWith('sub_mock_')
      ) {
        setMockCheckoutData(checkout);
        setMockSimulationModalOpen(true);
        setIsProcessingCheckout(false);
        return;
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay checkout script. Please check your network connection.');
      }

      // 3. Open Razorpay in-page checkout modal
      const options = {
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: 'QuoteFlow',
        description: 'QuoteFlow Pro — ₹99/month',
        image: typeof window !== 'undefined' ? `${window.location.origin}/quoteflow-logo.png` : 'https://www.blendandbold.com/quoteflow-logo.png',
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            setIsProcessingCheckout(false);
          },
        },
        prefill: {
          name: checkout.customerName || '',
          email: checkout.customerEmail || '',
          contact: checkout.customerPhone || '',
        },
        theme: {
          color: '#4f46e5',
        },
        handler: async function (response: any) {
          // 4. Verify payment signature strictly on server
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
                text: 'Payment of ₹99.00 confirmed! QuoteFlow Pro is now active.',
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
          } finally {
            setIsProcessingCheckout(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setFeedbackMsg({
          type: 'error',
          text: `Payment failed: ${resp.error?.description || 'Authorization declined'}`,
        });
        setIsProcessingCheckout(false);
      });

      rzp.open();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error launching payment modal' });
      setIsProcessingCheckout(false);
    }
  };

  const handleSimulateTestPayment = async () => {
    if (!mockCheckoutData) return;
    try {
      setIsSimulatingPayment(true);
      const mockPayId = `pay_mock_${Date.now()}`;
      const mockSig = `mock_sig_${Date.now()}`;
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_subscription_id: mockCheckoutData.subscriptionId,
          razorpay_payment_id: mockPayId,
          razorpay_signature: mockSig,
        }),
      });
      const dataRes = await res.json();
      if (!res.ok) throw new Error(dataRes.error || 'Failed to simulate payment');

      setFeedbackMsg({
        type: 'success',
        text: 'Payment of ₹99.00 verified! QuoteFlow Pro is now active.',
      });
      setMockSimulationModalOpen(false);
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error simulating test payment' });
    } finally {
      setIsSimulatingPayment(false);
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
          ? 'Cancellation scheduled. You will continue to have full access until your billing period concludes.'
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
        body: JSON.stringify({ plan_slug: 'monthly_99' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reactivate subscription');
      setFeedbackMsg({ type: 'success', text: 'QuoteFlow Pro subscription reactivated!' });
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error reactivating' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Loading subscription details...</p>
      </div>
    );
  }

  const sub = data?.subscription;
  const access = data?.access;

  // Real payment check
  const hasConfirmedPayment = Boolean(
    access?.isPaid ||
    sub?.status === 'active' ||
    sub?.last_payment_id
  );

  const trialDaysRemaining = access?.daysRemainingInTrial ?? 0;
  const inTrial = trialDaysRemaining > 0;

  const nextPaymentDateFormatted = access?.nextPaymentDue
    ? new Date(access.nextPaymentDue).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : sub?.trial_end_at
    ? new Date(sub.trial_end_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Back Button */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors group px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Billing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your subscription, view next payment due dates, and download payment receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSupportModalOpen(true)}
            className="gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-xs"
          >
            <Headphones className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Support & Help</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center justify-between border shadow-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600 ml-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status Alert Banner */}
      {access?.isRestricted ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-rose-950 dark:text-rose-200 uppercase tracking-wider">
                  🔒 Billing Required
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Your ₹99 subscription payment is overdue. Please complete payment to restore full QuoteFlow access.
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubscribe}
              disabled={isProcessingCheckout}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs shrink-0 font-bold"
            >
              Pay Now (₹99)
            </Button>
          </div>
        </div>
      ) : access?.isGracePeriod ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                  ⚠️ Payment Due — Grace Period Active
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {access.warningMessage || 'Please complete your ₹99 payment to keep your account active.'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSubscribe}
              disabled={isProcessingCheckout}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 font-bold"
            >
              Pay Now (₹99)
            </Button>
          </div>
        </div>
      ) : hasConfirmedPayment ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                  QuoteFlow Pro Active
                </span>
                <Badge className="bg-emerald-600 text-white text-[11px] px-2.5 py-0.5 font-semibold">
                  Active ✓
                </Badge>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {inTrial
                  ? `Payment confirmed! Your ₹99 QuoteFlow Pro plan is active. Free trial has ${trialDaysRemaining} days remaining, with your next renewal scheduled for ${nextPaymentDateFormatted}.`
                  : `Payment confirmed! Your QuoteFlow Pro plan is active. Next payment of ₹99 is due on ${nextPaymentDateFormatted}.`}
              </p>
            </div>
          </div>
        </div>
      ) : inTrial ? (
        <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/30 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                    Free Trial Active
                  </span>
                  <Badge variant="outline" className="text-[11px] border-indigo-400 text-indigo-600">
                    {trialDaysRemaining} Days Remaining
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Trial ends on {nextPaymentDateFormatted}. You can start your ₹99/month subscription anytime with zero disruption.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSubscribe}
              disabled={isProcessingCheckout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 font-semibold"
            >
              Subscribe for ₹99/month
            </Button>
          </div>
        </div>
      ) : null}

      {/* Current Plan Overview Card (Requirements 13 & 15) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Current Plan</span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {hasConfirmedPayment ? 'QuoteFlow Pro' : 'Free Trial'}
              </h2>
              <Badge
                className={
                  hasConfirmedPayment
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                    : inTrial
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                }
              >
                {hasConfirmedPayment ? 'Active' : inTrial ? 'Trial' : 'Payment Overdue'}
              </Badge>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block font-medium">Amount</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {hasConfirmedPayment ? '₹99' : '₹0'}
              <span className="text-sm font-normal text-slate-400">/ month</span>
            </p>
          </div>
        </div>

        {/* Customer-Friendly Key Billing Info Grid (Strictly NO Mandate IDs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Status</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{hasConfirmedPayment ? 'Active' : inTrial ? 'Trial Active' : 'Payment Overdue'}</span>
            </p>
            <p className="text-[11px] text-slate-400">Account status</p>
          </div>

          {inTrial && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Free Trial</span>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-500" />
                <span>{trialDaysRemaining} days remaining</span>
              </p>
              <p className="text-[11px] text-slate-400">30-day initial exploration</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-medium">Next Payment Due</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>{nextPaymentDateFormatted}</span>
            </p>
            <p className="text-[11px] text-slate-400">Amount: ₹99</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            {hasConfirmedPayment
              ? 'Your subscription renews automatically. You can cancel anytime.'
              : 'Subscribe to maintain uninterrupted access after your trial.'}
          </p>

          <div className="flex items-center gap-2">
            {!hasConfirmedPayment ? (
              <Button
                onClick={handleSubscribe}
                disabled={isProcessingCheckout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
              >
                {isProcessingCheckout ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Subscribe for ₹99/month'
                )}
              </Button>
            ) : sub?.cancel_at_period_end ? (
              <Button
                size="sm"
                onClick={handleReactivate}
                disabled={isProcessingCheckout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Resume Subscription</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
                className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* QuoteFlow Pro Plan Card (Requirement 6) */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Available Subscription
        </h3>

        <div className="max-w-md rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Paid Plan
            </span>
            {hasConfirmedPayment && (
              <Badge className="bg-emerald-600 text-white text-[10px]">
                Active
              </Badge>
            )}
          </div>

          <div>
            <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
              QuoteFlow Pro
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Full access to estimates, quotes, invoicing, and client portal.
            </p>
          </div>

          <div className="pt-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">₹99</span>
            <span className="text-xs text-slate-400 ml-1 font-medium">/ month</span>
          </div>

          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Unlimited Quotations & Invoices</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Unguessable Client Approval Links</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>PDF Generation & Email Receipts</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Full Historical Data & Reports Access</span>
            </li>
          </ul>

          <div className="pt-2">
            {hasConfirmedPayment ? (
              <Button
                disabled
                className="w-full bg-emerald-600 text-white text-xs font-bold opacity-100 cursor-default"
              >
                QuoteFlow Pro Active ✓
              </Button>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={isProcessingCheckout}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
              >
                {isProcessingCheckout ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Subscribe for ₹99/month'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History (Requirements 14 & 48) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-0">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-600" />
            <span>Transaction History</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Your verified payments and official receipts.
          </p>
        </div>

        {data?.payments && data.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Payment Reference</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.payments.map((p) => {
                  const txDate = p.paid_at
                    ? new Date(p.paid_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : new Date(p.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                  const isSuccess = p.status === 'captured' || p.status === 'authorized';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedTransaction(p)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 font-medium">
                        {txDate}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                        ₹{(p.amount / 100).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {isSuccess ? 'Paid' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        {p.razorpay_payment_id || 'PAY-REF'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        QuoteFlow Pro Monthly Subscription
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction(p);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 h-7 text-xs px-2"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions recorded yet. Your first payment receipt will appear here.
          </div>
        )}
      </div>

      {/* Transaction Detail Modal (Requirement 14) */}
      {selectedTransaction && (
        <Modal
          isOpen={Boolean(selectedTransaction)}
          onClose={() => setSelectedTransaction(null)}
          title="Transaction Details"
        >
          <div className="p-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Transaction Date</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTransaction.paid_at
                    ? new Date(selectedTransaction.paid_at).toLocaleString()
                    : new Date(selectedTransaction.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  ₹{(selectedTransaction.amount / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Currency</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTransaction.currency || 'INR'}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Status</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedTransaction.status === 'captured' || selectedTransaction.status === 'authorized'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {selectedTransaction.status === 'captured' ? 'Paid' : selectedTransaction.status}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Payment Reference</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {selectedTransaction.razorpay_payment_id || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Description</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  QuoteFlow Pro Monthly Subscription
                </span>
              </div>
            </div>

            {selectedTransaction.invoice_url && (
              <div>
                <a
                  href={selectedTransaction.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  <span>Download Official Receipt PDF</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedTransaction(null)}
                className="w-full text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Subscription Modal */}
      {cancelModalOpen && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Subscription"
        >
          <div className="p-5 space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to cancel your QuoteFlow Pro subscription?
            </p>

            <div>
              <label className="font-semibold block mb-1">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
              >
                <option value="Too expensive">Too expensive</option>
                <option value="Missing features">Missing features</option>
                <option value="Switching to another tool">Switching to another tool</option>
                <option value="Temporary pause">Temporary pause</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="cancelPeriodEnd"
                checked={cancelAtPeriodEnd}
                onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <label htmlFor="cancelPeriodEnd" className="text-slate-600 dark:text-slate-400">
                Maintain access until current billing period ends
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(false)}
                disabled={isCancelling}
                className="text-xs"
              >
                Keep Plan
              </Button>
              <Button
                size="sm"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Support & Help Modal */}
      {supportModalOpen && (
        <SupportHelpModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
        />
      )}

      {/* Test Mode Simulation Modal */}
      {mockSimulationModalOpen && mockCheckoutData && (
        <Modal
          isOpen={mockSimulationModalOpen}
          onClose={() => setMockSimulationModalOpen(false)}
          title="Payment Simulation (Development Mode)"
        >
          <div className="p-5 space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              In test mode, simulate completing the ₹99 QuoteFlow Pro payment to verify backend activation:
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] space-y-1">
              <p>Plan: QuoteFlow Pro (₹99/mo)</p>
              <p>Amount: ₹99.00</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMockSimulationModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSimulateTestPayment}
                disabled={isSimulatingPayment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                {isSimulatingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Complete Test Payment (₹99)'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
