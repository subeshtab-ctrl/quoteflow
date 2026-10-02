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
import {
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Clock,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  X,
  Loader2,
  Calendar,
  Receipt,
  Headphones,
  Check,
  ShieldAlert,
  Info,
  ExternalLink,
  Printer,
  Copy,
  Zap,
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
    isTestMode?: boolean;
    keyId?: string | null;
  };
}

export function BillingView({ initialData }: BillingViewProps) {
  const [data, setData] = useState(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isUpdatingTiming, setIsUpdatingTiming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Too expensive');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Plan state for interactive selection
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('promo_99');

  // Support & Help Modal state
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Receipt Modal state
  const [activeReceipt, setActiveReceipt] = useState<SubscriptionPayment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        if (json.isEligibleForPromo) {
          setSelectedPlanSlug('promo_99');
        } else {
          setSelectedPlanSlug('monthly_199');
        }
      } else {
        setFeedbackMsg({ type: 'error', text: json.error || 'Failed to load billing details' });
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Network error loading billing information' });
    } finally {
      setIsLoading(false);
    }
  };

  // Always fetch fresh real-time data on client mount to eliminate stale server-render cache
  useEffect(() => {
    fetchBillingData();
  }, []);

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

      // In mock simulation mode (real keys not yet set in Vercel), do not open broken Razorpay popup
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

      // 2. Load Razorpay SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay checkout script. Please check your network connection.');
      }

      // 3. Open Razorpay Standard In-Page Modal (No external redirect)
      const options = {
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: 'QuoteFlow',
        description: checkout.planName,
        image: typeof window !== 'undefined' ? `${window.location.origin}/quoteflow-logo.png` : undefined,
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
                text: 'Payment of ₹99.00 confirmed! QuoteFlow Special Offer is now secured with Razorpay Autopay.',
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

      // Open in-page modal popup
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to simulate payment');

      setFeedbackMsg({
        type: 'success',
        text: 'Payment of ₹99.00 simulated & verified! QuoteFlow Special Offer is now active with Autopay.',
      });
      setMockSimulationModalOpen(false);
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error simulating test payment' });
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const handleUpdateActivationSchedule = async (mode: 'immediate' | 'after_trial') => {
    try {
      setIsUpdatingTiming(true);
      setFeedbackMsg(null);
      const res = await fetch('/api/subscriptions/activation-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update plan activation schedule');

      setFeedbackMsg({
        type: 'success',
        text: mode === 'immediate'
          ? '✓ Plan is now active immediately starting from today. Next auto-debit set to 30 days from now.'
          : `✓ Plan scheduled to activate after your 30-day free trial on ${new Date(json.subscription?.next_charge_at || json.subscription?.trial_end_at).toLocaleDateString()}. Free trial preserved with zero charge.`,
      });
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Could not update activation timing' });
    } finally {
      setIsUpdatingTiming(false);
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
          ? 'Recurring subscription cancellation scheduled. Razorpay Autopay is disabled for future cycles, and you maintain full access until your current period concludes.'
          : 'Subscription and Razorpay Autopay cancelled immediately.',
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
        body: JSON.stringify({ plan_slug: 'promo_99' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reactivate subscription');
      setFeedbackMsg({ type: 'success', text: 'Subscription and Razorpay Autopay reactivated!' });
      await fetchBillingData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error reactivating' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
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
  const isEligible = data?.isEligibleForPromo ?? true;

  // Determine if the customer has made a real payment or is on a confirmed paid plan
  const hasConfirmedPayment = Boolean(
    sub?.last_payment_id ||
    (sub?.promotional_cycles_completed && sub.promotional_cycles_completed > 0) ||
    sub?.is_trial_prepaid ||
    access?.isPaid
  );

  const isImmediateMode = access?.planStartMode === 'immediate';

  const currentPriceFormatted =
    sub?.amount === 9900 || hasConfirmedPayment
      ? '₹99.00'
      : sub?.amount === 19900
      ? '₹199.00'
      : '₹0.00';

  const nextRenewalDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString()
    : sub?.trial_end_at
    ? new Date(sub.trial_end_at).toLocaleDateString()
    : 'N/A';

  const trialEndDate = sub?.trial_end_at
    ? new Date(sub.trial_end_at).toLocaleDateString()
    : 'N/A';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Subscription & Billing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your plans, promotional pricing, payment schedules, autopay, and verified tax receipts.
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

      {/* 1. TOP BANNER: Dynamic based on Paid Status vs Free Trial */}
      {hasConfirmedPayment ? (
        /* Confirmed Payment & Secured Banner */
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-indigo-50/40 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-indigo-950/20 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                    QuoteFlow Special Offer
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[11px] px-2.5 py-0.5 font-semibold">
                    Paid & Secured ✓
                  </Badge>
                  <Badge variant="outline" className="text-[11px] border-emerald-400 text-emerald-700 dark:text-emerald-300">
                    Cycle {sub?.promotional_cycles_completed || 1} of 3 (₹99/mo)
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isImmediateMode
                    ? `Payment confirmed! Your promotional ₹99 plan is active immediately from today. Next renewal auto-debit is scheduled for ${nextRenewalDate}.`
                    : `Payment confirmed & locked in! Your 30-day free trial continues uninterrupted at ₹0 until ${trialEndDate}, after which your pre-paid ₹99 plan begins automatically with Autopay.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Autopay</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : access?.isTrial ? (
        /* Unpaid Free Trial Banner */
        <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 shadow-xs">
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
                    {access.daysRemainingInTrial} Days Left
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Pay ₹99 now to lock in your 50% discount for 3 cycles. Your billing cycle will only begin after your free trial ends on {trialEndDate}.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleSubscribe('promo_99')}
              disabled={isProcessingCheckout}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shrink-0 shadow-xs"
            >
              Lock In ₹99 Rate
            </Button>
          </div>
        </div>
      ) : null}

      {/* 2. Current Plan Overview Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Current Plan</span>
              <Badge
                className={
                  hasConfirmedPayment
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200'
                    : access?.isTrial
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200'
                }
              >
                {hasConfirmedPayment ? 'ACTIVE' : access?.status?.toUpperCase()}
              </Badge>
              {sub?.cancel_at_period_end && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  Autopay Cancelling at cycle end
                </Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{access?.planName || (hasConfirmedPayment ? 'QuoteFlow Special Offer' : 'QuoteFlow Free Trial')}</span>
              {(access?.promoActive || hasConfirmedPayment) && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Special Offer Active</span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hasConfirmedPayment
                ? `Recurring monthly billing verified via Razorpay Autopay.`
                : access?.isTrial
                ? `30-Day Free Trial. Zero charge. Ends on ${trialEndDate}.`
                : 'Account needs reactivation.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-right sm:pr-4 border-slate-200 dark:border-slate-800 sm:border-r">
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {currentPriceFormatted}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </p>
              <p className="text-[11px] text-slate-400">Billed monthly in INR</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {sub?.cancel_at_period_end ? (
                <Button
                  size="sm"
                  onClick={handleReactivate}
                  disabled={isProcessingCheckout}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  <span>Resume Subscription</span>
                </Button>
              ) : hasConfirmedPayment ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCancelModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
                >
                  Cancel Plan & Autopay
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Trial Countdown</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span>{hasConfirmedPayment ? (isImmediateMode ? 'Upgraded' : `${access?.daysRemainingInTrial ?? 30} Days Left`) : `${access?.daysRemainingInTrial ?? 0} Days Left`}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {hasConfirmedPayment ? (isImmediateMode ? 'Plan Active Today' : 'Free Days Preserved') : '30-day initial trial'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Promotional Cycles</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>{sub?.promotional_cycles_completed || (hasConfirmedPayment ? 1 : 0)} of 3 Completed</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {sub?.promo_months_remaining ?? 2} ₹99 cycles remaining
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Next Renewal / Charge</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>{nextRenewalDate}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Auto-debit renewal date</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Account Status</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>{hasConfirmedPayment ? 'Active Paid' : 'Active Trial'}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Razorpay authorized</p>
          </div>
        </div>
      </div>

      {/* 3. PLAN ACTIVATION TIMING SELECTOR (Option for Active Now vs After Trial) */}
      {hasConfirmedPayment && (
        <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Plan Activation Timing</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You have pre-paid ₹99. Choose whether your paid plan starts immediately today or begins after your 30-day free trial concludes.
              </p>
            </div>
            {isUpdatingTiming && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Updating schedule...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* OPTION A: Start After Free Trial */}
            <div
              onClick={() => !isUpdatingTiming && !isImmediateMode && handleUpdateActivationSchedule('after_trial')}
              className={`relative rounded-xl p-4.5 border transition-all cursor-pointer ${
                !isImmediateMode
                  ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Start After Free Trial
                    </span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Keep your remaining free trial days until <strong>{trialEndDate}</strong> at ₹0 charge. Your ₹99 plan begins automatically when trial concludes.
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                    First Auto-Debit: {trialEndDate} (₹99.00)
                  </p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    !isImmediateMode
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {!isImmediateMode && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* OPTION B: Activate Immediately from Today */}
            <div
              onClick={() => !isUpdatingTiming && isImmediateMode !== true && handleUpdateActivationSchedule('immediate')}
              className={`relative rounded-xl p-4.5 border transition-all cursor-pointer ${
                isImmediateMode
                  ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Active Immediately From Payment Date
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Start Cycle 1 right now from your payment date. Next auto-debit renewal will occur 30 days after payment.
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1">
                    Next Auto-Debit: {nextRenewalDate} (₹99.00)
                  </p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    isImmediateMode
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isImmediateMode && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. RAZORPAY AUTOPAY & RECURRING BILLING CARD */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <span>Razorpay Recurring Autopay</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated recurring billing mandate authorized directly via Razorpay Gateway.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sub?.cancel_at_period_end ? (
              <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/40 text-xs px-2.5 py-1">
                Autopay Cancelled at Period End
              </Badge>
            ) : hasConfirmedPayment ? (
              <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Autopay Enabled</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400 text-xs">
                Not Yet Configured
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Subscription Mandate ID</span>
            <div className="flex items-center justify-between mt-1">
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate mr-2">
                {sub?.razorpay_subscription_id || 'N/A'}
              </p>
              {sub?.razorpay_subscription_id && (
                <button
                  onClick={() => copyToClipboard(sub.razorpay_subscription_id!)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  title="Copy Mandate ID"
                >
                  {copiedId === sub.razorpay_subscription_id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Verified Razorpay recurring reference</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Next Auto-Debit Amount</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {currentPriceFormatted}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {hasConfirmedPayment ? 'Cycle 2 of 3 (₹99.00/mo)' : '₹0.00 during free trial'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Next Auto-Debit Date</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {nextRenewalDate}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Automatically charged via mandate</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Payment Method</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
              <span>Card / UPI Mandate</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">PCI-DSS compliant via Razorpay</p>
          </div>
        </div>

        {/* Autopay Action / Cancellation Controls */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <p>
            To stop automatic recurring charges, you can cancel your subscription and autopay mandate at any time.
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {sub?.cancel_at_period_end ? (
              <Button
                size="sm"
                onClick={handleReactivate}
                disabled={isProcessingCheckout}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Resume Autopay</span>
              </Button>
            ) : hasConfirmedPayment ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
                className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
              >
                Cancel Subscription & Autopay
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. Available Plans Selection (Compact, Centered, Selectable) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Subscription Plans
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select or review your plan. Checkout opens securely in-page without external redirection.
            </p>
          </div>
        </div>

        {/* 3 Compact, Refined Cards with Selection Option */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
          {/* CARD 1: Free Trial */}
          <div
            onClick={() => setSelectedPlanSlug('free_trial')}
            className={`relative rounded-2xl cursor-pointer transition-all duration-200 p-5 flex flex-col justify-between ${
              selectedPlanSlug === 'free_trial'
                ? 'border-2 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-lg'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            <div className="space-y-3.5">
              {/* Card Header & Radio */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Plan 1
                </span>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                    selectedPlanSlug === 'free_trial'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {selectedPlanSlug === 'free_trial' && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Free Trial
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">30 days zero-cost exploration</p>
              </div>

              <div className="pt-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">₹0</span>
                <span className="text-xs text-slate-400 ml-1">/ 30 days</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited Quotes & Invoices</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Client PIN Portal Approval</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>One trial per business</span>
                </li>
              </ul>
            </div>

            <div className="pt-5">
              <Button
                variant="outline"
                disabled
                className="w-full text-xs font-medium border-slate-200 text-slate-400"
              >
                {hasConfirmedPayment ? 'Plan Upgraded to Special Offer' : 'Current Active Trial'}
              </Button>
            </div>
          </div>

          {/* CARD 2: ₹99 Promotional Special Offer (Featured) */}
          <div
            onClick={() => isEligible && setSelectedPlanSlug('promo_99')}
            className={`relative rounded-2xl cursor-pointer transition-all duration-200 p-5 flex flex-col justify-between ${
              hasConfirmedPayment
                ? 'border-2 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xl'
                : selectedPlanSlug === 'promo_99'
                ? 'border-2 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xl'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            {/* Top Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
              {hasConfirmedPayment ? 'Active Plan' : '50% Promotional Offer'}
            </div>

            <div className="space-y-3.5">
              {/* Header & Radio */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Plan 2 • Special Offer
                </span>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                    hasConfirmedPayment
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : selectedPlanSlug === 'promo_99'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {(hasConfirmedPayment || selectedPlanSlug === 'promo_99') && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Special Offer
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">₹99/mo for 3 billing cycles</p>
              </div>

              <div className="pt-1">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹99</span>
                <span className="text-xs text-slate-400 ml-1">/ month</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Then automatically ₹199/month
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>3 Cycles at 50% discount</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Automatic transition to ₹199</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Razorpay Recurring Autopay</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Cancel anytime at cycle end</span>
                </li>
              </ul>
            </div>

            <div className="pt-5">
              {hasConfirmedPayment ? (
                <div className="space-y-1.5">
                  <Button
                    disabled
                    className="w-full bg-emerald-600 text-white font-semibold text-xs shadow-xs gap-1.5 opacity-100 cursor-default"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Current Active Plan ✓</span>
                  </Button>
                  <p className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    Autopay Active via Razorpay
                  </p>
                </div>
              ) : isEligible ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe('promo_99');
                  }}
                  disabled={isProcessingCheckout}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Pay & Lock In ₹99'
                  )}
                </Button>
              ) : (
                <Button disabled variant="outline" className="w-full text-xs text-slate-400">
                  Already Redeemed
                </Button>
              )}
            </div>
          </div>

          {/* CARD 3: ₹199 Standard Plan */}
          <div
            onClick={() => setSelectedPlanSlug('monthly_199')}
            className={`relative rounded-2xl cursor-pointer transition-all duration-200 p-5 flex flex-col justify-between ${
              selectedPlanSlug === 'monthly_199'
                ? 'border-2 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xl'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            <div className="space-y-3.5">
              {/* Header & Radio */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Plan 3 • Standard
                </span>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                    selectedPlanSlug === 'monthly_199'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {selectedPlanSlug === 'monthly_199' && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Standard
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">Recurring monthly subscription</p>
              </div>

              <div className="pt-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">₹199</span>
                <span className="text-xs text-slate-400 ml-1">/ month</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Recurring indefinitely</p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Full Commercial Tax Invoices</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Sequential Invoice Numbering</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>7-Day Payment Grace Period</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Dedicated Developer Support</span>
                </li>
              </ul>
            </div>

            <div className="pt-5">
              <Button
                variant={sub?.amount === 19900 ? 'outline' : 'primary'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubscribe('monthly_199');
                }}
                disabled={isProcessingCheckout || sub?.amount === 19900}
                className="w-full text-xs font-semibold"
              >
                {isProcessingCheckout ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sub?.amount === 19900 ? (
                  'Active Plan'
                ) : hasConfirmedPayment ? (
                  'Upcoming After 3 Cycles'
                ) : (
                  'Subscribe at ₹199'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. PAYMENT HISTORY & VERIFIED TAX RECEIPTS TABLE */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600" />
              <span>Payment History & Receipts</span>
            </h4>
            <p className="text-xs text-slate-500">
              Verified transactions, autopay charges, and tax receipts processed via Razorpay.
            </p>
          </div>
        </div>

        {data?.payments && data.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Transaction ID</th>
                  <th className="px-5 py-3">Plan / Description</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Payment Method</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Invoice Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {p.paid_at ? new Date(p.paid_at).toLocaleString() : new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{p.razorpay_payment_id}</span>
                        <button
                          onClick={() => copyToClipboard(p.razorpay_payment_id)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy Transaction ID"
                        >
                          {copiedId === p.razorpay_payment_id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-200">
                      QuoteFlow Special Offer
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      ₹{(p.amount / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.card_details || (p.payment_method ? p.payment_method.toUpperCase() : 'CARD')}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
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
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {p.invoice_url ? (
                          <a
                            href={p.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold"
                          >
                            <span>Receipt</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <button
                            onClick={() => setActiveReceipt(p)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                          >
                            <span>View Details</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments recorded yet. Confirmed transactions will appear here automatically.
          </div>
        )}
      </div>

      {/* Floating Need Help Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setSupportModalOpen(true)}
          className="rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 flex items-center gap-2 text-xs font-semibold ring-4 ring-indigo-500/20"
        >
          <Headphones className="h-4 w-4" />
          <span>Support & Help</span>
        </Button>
      </div>

      {/* In-Page Receipt Details Modal */}
      {activeReceipt && (
        <Modal
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
          title="Payment Tax Receipt"
        >
          <div className="space-y-4 p-2 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-start pb-2 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">QuoteFlow SaaS</h4>
                  <p className="text-[11px] text-slate-400">Subscription Tax Invoice</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    {activeReceipt.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Payment ID:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{activeReceipt.razorpay_payment_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date & Time:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {activeReceipt.paid_at ? new Date(activeReceipt.paid_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Subscription Mandate:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{activeReceipt.razorpay_subscription_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Method:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{activeReceipt.card_details || activeReceipt.payment_method || 'Card'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total Paid:</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{(activeReceipt.amount / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                <span>Print</span>
              </Button>
              {activeReceipt.invoice_url && (
                <a
                  href={activeReceipt.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-500"
                >
                  <span>Official Razorpay Receipt</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Subscription & Autopay">
          <div className="space-y-4 p-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              If you cancel, Razorpay automated recurring debit will be disabled immediately. You will retain full access until the end of your current cycle.
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
                Cancel at period end (Keep benefits until current cycle completes on {nextRenewalDate})
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

      {/* Test Mode Simulation Modal */}
      {mockSimulationModalOpen && mockCheckoutData && (
        <Modal
          isOpen={mockSimulationModalOpen}
          onClose={() => setMockSimulationModalOpen(false)}
          title="⚡ Razorpay Simulation Mode Active"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-1">
              <p className="font-semibold text-sm text-amber-200">Test Credentials Active</p>
              <p className="text-xs text-amber-300/90 leading-relaxed">
                In simulation mode, you can immediately test the entire subscription activation flow, trial scheduling, and access policies.
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>Selected Plan:</span>
                <span className="font-bold text-white">{mockCheckoutData.planName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Billing Amount:</span>
                <span className="font-bold text-emerald-400">₹{(mockCheckoutData.amount / 100).toFixed(2)}/mo</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMockSimulationModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSimulateTestPayment}
                disabled={isSimulatingPayment}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2"
              >
                {isSimulatingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Simulate Payment Activation</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Support & Help Popup Modal */}
      {supportModalOpen && (
        <SupportHelpModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          defaultCategory="Billing"
        />
      )}
    </div>
  );
}
