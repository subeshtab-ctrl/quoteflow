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
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Too expensive');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Plan state for interactive selection
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('promo_99');

  // Support & Help Modal state
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Test Mode Simulation Modal state
  const [mockSimulationModalOpen, setMockSimulationModalOpen] = useState(false);
  const [mockCheckoutData, setMockCheckoutData] = useState<any>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subscriptions');
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
        image: typeof window !== 'undefined' ? `${window.location.origin}/uploads/logo-1790062784938.jpg` : undefined,
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
                text: checkout.isTrialScheduled
                  ? 'Payment confirmed & promotional rate locked in! Your full 30-day free trial continues uninterrupted, and your ₹99 plan begins automatically when trial ends.'
                  : 'Subscription successfully activated! Welcome to QuoteFlow Premium.',
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
        text: mockCheckoutData.isTrialScheduled
          ? 'Payment confirmed & promotional rate locked in! Your full 30-day free trial continues uninterrupted, and your ₹99 plan begins automatically when trial ends.'
          : 'Subscription successfully activated (Test Mode)! Welcome to QuoteFlow Premium.',
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
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Loading subscription details...</p>
      </div>
    );
  }

  const sub = data?.subscription;
  const access = data?.access;
  const isEligible = data?.isEligibleForPromo ?? true;

  const currentPriceFormatted =
    sub?.amount === 9900 ? '₹99.00' : sub?.amount === 19900 ? '₹199.00' : '₹0.00';

  const isPrepaidTrial = sub?.is_trial_prepaid && access?.isTrial;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Subscription & Billing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your plans, promotional pricing, payment schedules, and verified invoices.
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

      {/* Free Trial Early Payment Reassurance Banner */}
      {access?.isTrial && (
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
                  {isPrepaidTrial
                    ? `✓ Paid & Secured! Your first ₹99 cycle will apply only when your trial concludes on ${new Date(sub?.trial_end_at || Date.now()).toLocaleDateString()}.`
                    : `You can pay now to lock in your ₹99 promotional offer. Your billing cycle will ONLY begin after your trial ends on ${new Date(sub?.trial_end_at || Date.now()).toLocaleDateString()}.`}
                </p>
              </div>
            </div>

            {isPrepaidTrial ? (
              <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Cycle Scheduled</span>
              </Badge>
            ) : (
              <Button
                size="sm"
                onClick={() => handleSubscribe('promo_99')}
                disabled={isProcessingCheckout}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shrink-0 shadow-xs"
              >
                Lock In ₹99 Rate
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Razorpay Test Mode Guidance Banner */}
      {data?.isTestMode && (
        <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Razorpay Test Environment Active
            </p>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              To test recurring subscription mandates, Razorpay provides recurring domestic test card <span className="font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">4718 6091 0820 4366</span> (any future MM/YY & CVV), or select <span className="font-semibold">UPI</span> with test ID <span className="font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">success@razorpay</span>, or test <span className="font-semibold">Netbanking</span>.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {access?.isTrial
                ? `30-Day Free Trial. Zero charge. Ends on ${new Date(sub?.trial_end_at || Date.now()).toLocaleDateString()}.`
                : access?.isPaid
                ? `Recurring monthly billing verified via Razorpay.`
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
              ) : access?.isPaid ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCancelModalOpen(true)}
                  className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs"
                >
                  Cancel Plan
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
              <span>{access?.daysRemainingInTrial ?? 0} Days Left</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">30-day initial trial</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Promotional Cycles</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span>{sub?.promotional_cycles_completed ?? 0} of 3 Completed</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {sub?.promo_months_remaining ?? 3} ₹99 cycles remaining
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Next Renewal</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>
                {sub?.current_period_end
                  ? new Date(sub.current_period_end).toLocaleDateString()
                  : sub?.trial_end_at
                  ? new Date(sub.trial_end_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Renewal / start date</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Account Status</span>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>{isPrepaidTrial ? 'Pre-Paid' : access?.isPaid ? 'Active Paid' : 'Active Trial'}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Razorpay authorized</p>
          </div>
        </div>
      </div>

      {/* Available Plans Selection (Compact, Centered, Selectable) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Select Your Subscription Plan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any card to select. Checkout opens directly in-page without external redirection.
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
                {access?.isTrial ? 'Current Active Trial' : 'Trial Used'}
              </Button>
            </div>
          </div>

          {/* CARD 2: ₹99 Promotional Special Offer (Featured) */}
          <div
            onClick={() => isEligible && setSelectedPlanSlug('promo_99')}
            className={`relative rounded-2xl cursor-pointer transition-all duration-200 p-5 flex flex-col justify-between ${
              selectedPlanSlug === 'promo_99'
                ? 'border-2 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xl'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
            }`}
          >
            {/* Top Badge */}
            {isEligible && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                50% Promotional Offer
              </div>
            )}

            <div className="space-y-3.5">
              {/* Header & Radio */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Plan 2 • Special Offer
                </span>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                    selectedPlanSlug === 'promo_99'
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                >
                  {selectedPlanSlug === 'promo_99' && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Special Offer
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">₹99/mo for 3 billing cycles</p>
              </div>

              <div className="pt-1">
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">₹99</span>
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
                  <span>Applies after trial ends</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Cancel anytime at cycle end</span>
                </li>
              </ul>
            </div>

            <div className="pt-5">
              {isEligible ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe('promo_99');
                  }}
                  disabled={isProcessingCheckout || (sub?.amount === 9900 && !access?.isTrial) || isPrepaidTrial}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPrepaidTrial ? (
                    'Scheduled After Trial'
                  ) : sub?.amount === 9900 && !access?.isTrial ? (
                    'Active Plan'
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
              Verified transactions and subscription charges recorded via Razorpay.
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
                Real Razorpay API credentials and Plan IDs are not yet configured in Vercel. In simulation mode, you can immediately test the entire subscription activation flow, trial scheduling, and access policies without card errors.
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
              {mockCheckoutData.isTrialScheduled && (
                <div className="flex justify-between items-center text-slate-300 border-t border-slate-800 pt-2 text-[11px]">
                  <span>Free Trial Days:</span>
                  <span className="text-amber-400 font-semibold">Preserved until trial end</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400">
              💡 <strong>Developer Tip:</strong> To accept live customer cards and UPI payments, add your <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code>, and Razorpay Plan IDs in Vercel or Developer Admin (<code>/admin</code>).
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
