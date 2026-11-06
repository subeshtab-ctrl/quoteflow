'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
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
import { isOwnerOrAdminRole } from '@/types/staff';

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
    /** IANA timezone resolved from user's IP, e.g. "Asia/Kolkata" */
    userTimezone?: string;
    userRole?: string;
    orgName?: string;
    adminEmail?: string;
    billingDetails?: {
      countryCode: string;
      countryName: string;
      flag: string;
      billingRegion: 'INDIA' | 'INTERNATIONAL';
      billingCurrency: 'INR' | 'USD';
      planAmount: number;
      paymentProvider: 'RAZORPAY' | 'NOWPAYMENTS';
      isEligible: boolean;
      unsupportedMessage: string | null;
    };
  };
}

export function BillingView({ initialData }: BillingViewProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Too expensive');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [urlPaymentStatus, setUrlPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get('payment_status');
      if (statusParam) {
        setUrlPaymentStatus(statusParam);
        if (statusParam === 'cancelled') {
          fetch('/api/billing/nowpayments/cancel', { method: 'POST' }).catch(() => {});
        }
        // Immediately clean URL so page refresh does not keep ?payment_status=cancelled
        try {
          window.history.replaceState({}, '', window.location.pathname);
        } catch {}
      }
    }
  }, []);

  // Synchronize incoming server data immediately
  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  // Support & Help Modal state
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  // Transaction Detail Modal state (Requirement 14)
  const [selectedTransaction, setSelectedTransaction] = useState<SubscriptionPayment | null>(null);
  const [isSyncingGateway, setIsSyncingGateway] = useState(false);

  const handleSyncGateway = async () => {
    setIsSyncingGateway(true);
    try {
      const res = await fetch('/api/billing/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setFeedbackMsg({
          type: 'success',
          text: json.message || 'Subscription status synchronized with Razorpay gateway.',
        });
        await fetchBillingData();
      } else {
        setFeedbackMsg({
          type: 'info',
          text: json.message || 'Gateway sync completed.',
        });
      }
    } catch {
      setFeedbackMsg({
        type: 'error',
        text: 'Could not contact payment gateway to verify status.',
      });
    } finally {
      setIsSyncingGateway(false);
    }
  };

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/subscriptions', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          ...json,
          userRole: json.userRole || prev?.userRole || initialData?.userRole || 'OWNER',
          orgName: json.orgName || prev?.orgName || initialData?.orgName || 'Your Organization',
          adminEmail: json.adminEmail || prev?.adminEmail || initialData?.adminEmail,
        }));
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

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchBillingData();
        router.refresh();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);
    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
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

      // 1. Create checkout on server for QuoteFlow Pro (₹149/month)
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: 'monthly_149' }),
      });

      const json = await res.json();
      if (!res.ok) {
        let errText = json.error || 'Failed to initialize subscription checkout';
        if (errText.includes('401') || errText.toLowerCase().includes('authentication failed')) {
          errText = 'Razorpay payment gateway authentication failed. Please try again or contact support.';
        }
        throw new Error(errText);
      }

      const { checkout } = json;

      // Validate Razorpay checkout data
      if (
        checkout.isMock ||
        !checkout.keyId ||
        checkout.keyId.includes('placeholder') ||
        checkout.subscriptionId?.startsWith('sub_mock_')
      ) {
        throw new Error(
          'Online payment gateway is currently unavailable. Please try again or contact support.'
        );
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
        description: `QuoteFlow Pro — ${SUBSCRIPTION_CONFIG.INDIA.formattedPrice}/month`,
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
                text: `Payment of ${SUBSCRIPTION_CONFIG.INDIA.formattedPrice} confirmed! QuoteFlow Pro is now active.`,
              });
              router.refresh();
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
          text: `Payment failed: ${resp.error?.description || 'Authorization declined'}. Please try again or contact support.`,
        });
        setIsProcessingCheckout(false);
      });

      rzp.open();
    } catch (err: any) {
      let text = err.message || 'Error launching payment modal';
      if (text.includes('401') || text.toLowerCase().includes('authentication failed')) {
        text = 'Razorpay payment gateway authentication failed. Please try again or contact support.';
      }
      setFeedbackMsg({ type: 'error', text });
      setIsProcessingCheckout(false);
    }
  };

  const handleInternationalSubscribe = async () => {
    try {
      setIsProcessingCheckout(true);
      setFeedbackMsg(null);

      const res = await fetch('/api/billing/nowpayments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to initialize cryptocurrency checkout');
      }

      if (json.invoice_url) {
        window.location.href = json.invoice_url;
      } else {
        throw new Error('No checkout URL received from payment provider');
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Payment initialization failed' });
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
        body: JSON.stringify({ plan_slug: SUBSCRIPTION_CONFIG.INDIA.slug }),
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
  // IANA timezone from user's IP (falls back to browser locale if not available)
  const userTimezone = data?.userTimezone || undefined;

  const billingDetails = data?.billingDetails || {
    countryCode: 'IN',
    countryName: 'India',
    flag: '🇮🇳',
    billingRegion: 'INDIA',
    billingCurrency: 'INR',
    planAmount: SUBSCRIPTION_CONFIG.INDIA.monthlyPrice,
    paymentProvider: 'RAZORPAY',
    isEligible: true,
    unsupportedMessage: null,
  };

  const isIndia = (billingDetails.billingRegion || 'INDIA') === 'INDIA';
  const isInternational = !isIndia;
  const isEligible = billingDetails.isEligible;
  const planSymbol = isIndia ? SUBSCRIPTION_CONFIG.INDIA.currencySymbol : SUBSCRIPTION_CONFIG.GLOBAL.currencySymbol;
  const planAmount = isIndia
    ? SUBSCRIPTION_CONFIG.INDIA.monthlyPrice
    : (billingDetails.planAmount ? Math.max(SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice, billingDetails.planAmount) : SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice);
  const planCurrency = isIndia ? 'INR' : 'USD';
  const paymentProviderName = isIndia ? 'Razorpay' : 'NOWPayments';

  // Real payment check: requires active paid status AND not expired or in grace period
  const isPeriodExpired = Boolean(
    sub?.current_period_end && new Date(sub.current_period_end).getTime() < Date.now()
  );

  const hasConfirmedPayment = Boolean(
    access?.isPaid &&
    !access?.isGracePeriod &&
    !access?.isPaymentOverdue &&
    !access?.isRestricted &&
    !isPeriodExpired
  );

  const trialDaysRemaining = access?.daysRemainingInTrial ?? 0;
  const inTrial = trialDaysRemaining > 0;

  const trialEndDateFormatted = access?.trialEndsAt
    ? new Date(access.trialEndsAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(userTimezone ? { timeZone: userTimezone } : {}),
      })
    : sub?.trial_end_at
    ? new Date(sub.trial_end_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(userTimezone ? { timeZone: userTimezone } : {}),
      })
    : null;

  const formattedPeriodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(userTimezone ? { timeZone: userTimezone } : {}),
      })
    : null;

  const nextPaymentDateFormatted = hasConfirmedPayment && (access?.nextPaymentDue || sub?.current_period_end)
    ? new Date(access?.nextPaymentDue || sub?.current_period_end!).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        ...(userTimezone ? { timeZone: userTimezone } : {}),
      })
    : formattedPeriodEnd;

  const isCancelledPeriodActive = Boolean(
    (sub?.cancel_at_period_end || access?.cancelAtPeriodEnd || sub?.status === 'cancelled') &&
    (access?.activeUntil || sub?.current_period_end) &&
    new Date(access?.activeUntil || sub?.current_period_end!).getTime() > Date.now()
  );

  const activeUntilDateFormatted = isCancelledPeriodActive
    ? new Date(access?.activeUntil || sub?.current_period_end!).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(userTimezone ? { timeZone: userTimezone } : {}),
      })
    : null;

  // Dedicated Staff Billing UI (Per Requirement: ONLY explicit staff roles restricted; Owner & Admin have full billing access)
  const currentRole = (data?.userRole || initialData?.userRole || 'OWNER').toUpperCase();
  const isStaffRestricted =
    currentRole !== 'OWNER' &&
    currentRole !== 'ADMIN' &&
    currentRole !== 'SUPER_ADMIN';

  if (isStaffRestricted) {
    const isExpired = access ? (!access.allowed || access.isRestricted || access.isExpired) : false;
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
              Subscription & Billing
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your QuoteFlow access is managed by your organization administrator.
            </p>
          </div>
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

        {/* Staff Subscription Status Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Current Plan</span>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  QuoteFlow Pro
                </h2>
                <Badge
                  className={
                    !isExpired
                      ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight bg-[#e8f8f0] dark:bg-[#064e3b]/35 text-[#047857] dark:text-[#34d399] border border-[#6ee7b7] dark:border-[#059669]/60'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 font-bold'
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${!isExpired ? 'bg-[#10b981]' : 'bg-rose-500'} shrink-0`} />
                  <span>{!isExpired ? 'Active Member' : 'Subscription Expired'}</span>
                </Badge>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block font-medium">Workspace</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {data.orgName || 'Your Organization'}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-medium text-slate-800 dark:text-slate-200">
              Subscription Management Notice
            </p>
            <p>
              Your organization&apos;s QuoteFlow subscription, billing details, and payment methods are managed by your account administrator{data.adminEmail ? ` (${data.adminEmail})` : ''}.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Staff accounts inherit the workspace plan and entitlement. For upgrades, renewals, receipts, or billing questions, please contact your administrator.
            </p>
          </div>
        </div>

        <SupportHelpModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
        />
      </div>
    );
  }

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
            {hasConfirmedPayment
              ? 'Manage your subscription, view next payment due dates, and download payment receipts.'
              : 'Manage your subscription, view trial status, and explore QuoteFlow Pro features.'}
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
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'error' && (
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="text-xs font-semibold underline text-rose-700 dark:text-rose-300 hover:opacity-80 shrink-0"
              >
                Contact Support
              </button>
            )}
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-600 ml-2 p-1 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status Alert Banner */}
      {!isEligible ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 shadow-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
            {billingDetails.unsupportedMessage ||
              'QuoteFlow online subscription payments are not currently available in your country. Please contact support.'}
          </p>
        </div>
      ) : access?.isRestricted ? (
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
                  Your {planSymbol}{planAmount} subscription payment is overdue. Please complete payment to restore full QuoteFlow access.
                </p>
              </div>
            </div>
            <Button
              onClick={isIndia ? handleSubscribe : handleInternationalSubscribe}
              disabled={isProcessingCheckout}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs shrink-0 font-bold"
            >
              Pay Now ({planSymbol}{planAmount})
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
                  {access.warningMessage || `Please complete your ${planSymbol}${planAmount} payment to keep your account active.`}
                </p>
              </div>
            </div>
            <Button
              onClick={isIndia ? handleSubscribe : handleInternationalSubscribe}
              disabled={isProcessingCheckout}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0 font-bold"
            >
              Pay Now ({planSymbol}{planAmount})
            </Button>
          </div>
        </div>
      ) : isCancelledPeriodActive ? (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                    Cancelled — Active until {activeUntilDateFormatted}
                  </span>
                  <Badge className="bg-amber-500 text-white text-[11px] px-2.5 py-0.5 font-semibold">
                    Cancelled
                  </Badge>
                </div>
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  Your subscription has been cancelled. You will continue to have full access until {activeUntilDateFormatted}. Autopay has been turned off and no further charges will occur.
                </p>
              </div>
            </div>
            <Button
              onClick={handleReactivate}
              disabled={isProcessingCheckout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 font-semibold gap-1.5 shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reactivate Subscription</span>
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
                  ? `Payment confirmed! Your QuoteFlow Pro plan is active. Free trial has ${trialDaysRemaining} days remaining, with your next renewal scheduled for ${nextPaymentDateFormatted}.`
                  : `Payment confirmed! Your QuoteFlow Pro plan is active. Next payment of ${planSymbol}${planAmount} is due on ${nextPaymentDateFormatted}.`}
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
                  {trialEndDateFormatted
                    ? `Trial ends on ${trialEndDateFormatted}. You can start your ${planSymbol}${planAmount}/month subscription anytime with zero disruption.`
                    : `You can start your ${planSymbol}${planAmount}/month subscription anytime with zero disruption.`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={isIndia ? handleSubscribe : handleInternationalSubscribe}
              disabled={isProcessingCheckout || !isEligible}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 font-semibold"
            >
              {isIndia ? `Subscribe for ${planSymbol}${planAmount}/month` : `Pay ${planSymbol}${planAmount}`}
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
                QuoteFlow Pro
              </h2>
              <Badge
                className={
                  isCancelledPeriodActive
                    ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : hasConfirmedPayment
                    ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight bg-[#e8f8f0] dark:bg-[#064e3b]/35 text-[#047857] dark:text-[#34d399] border border-[#6ee7b7] dark:border-[#059669]/60'
                    : inTrial
                    ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-tight bg-[#fffbeb] dark:bg-[#78350f]/25 text-[#92400e] dark:text-[#fbbf24] border border-[#fcd34d] dark:border-[#b45309]/60'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 font-bold'
                }
              >
                {isCancelledPeriodActive ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Cancelled — Active until {activeUntilDateFormatted}</span>
                  </>
                ) : hasConfirmedPayment ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
                    <span>Active</span>
                  </>
                ) : inTrial ? (
                  <>
                    <Clock className="w-3 h-3 text-[#d97706] dark:text-[#f59e0b] shrink-0 stroke-[2.5]" />
                    <span>14-Day Free Trial</span>
                  </>
                ) : (
                  'Payment Overdue'
                )}
              </Badge>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block font-medium">Amount</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {hasConfirmedPayment ? `${planSymbol}${planAmount}` : `${planSymbol}0`}
              <span className="text-sm font-normal text-slate-400">/ month</span>
            </p>
          </div>
        </div>

        {/* Account Billing Key Information Grid (Requirement 8) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Current Plan</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              QuoteFlow Pro
            </p>
            <p className="text-[10px] text-slate-400">{hasConfirmedPayment ? `${planSymbol}${planAmount}/mo` : `${SUBSCRIPTION_CONFIG.TRIAL_DAYS}-day free trial`}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Billing Country</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
              <span>{billingDetails.flag || (isIndia ? '🇮🇳' : '🌐')}</span>
              <span className="truncate">{billingDetails.countryName || (isIndia ? 'India' : 'International')}</span>
            </p>
            <p className="text-[10px] font-mono text-slate-400">{billingDetails.countryCode || (isIndia ? 'IN' : 'US')}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Billing Currency</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
              {planCurrency}
            </p>
            <p className="text-[10px] text-slate-400">{isIndia ? 'Indian Rupee' : 'US Dollar'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Payment Provider</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {paymentProviderName}
            </p>
            <p className="text-[10px] text-slate-400">{isIndia ? 'Direct & UPI' : 'Cryptocurrency'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Subscription Status</span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
              {isCancelledPeriodActive ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400">Cancelled</span>
                </>
              ) : access?.isGracePeriod ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400">Grace Period</span>
                </>
              ) : access?.isPaymentOverdue || access?.isRestricted ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span className="text-rose-600 dark:text-rose-400">Payment Overdue</span>
                </>
              ) : hasConfirmedPayment ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                </>
              ) : inTrial ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="text-indigo-600 dark:text-indigo-400">Trial</span>
                </>
              ) : (
                <span className="text-rose-600">Past Due</span>
              )}
            </p>
            <p className="text-[10px] text-slate-400">
              {access?.isGracePeriod
                ? `${access.graceDaysRemaining || 1} day(s) grace remaining`
                : access?.isPaymentOverdue
                ? 'Action required — renew now'
                : inTrial
                ? `${trialDaysRemaining} days left`
                : hasConfirmedPayment
                ? 'Active subscriber'
                : 'Action needed'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
              {isCancelledPeriodActive
                ? 'Access Concludes'
                : inTrial
                ? 'Trial Expiry'
                : access?.isGracePeriod || access?.isPaymentOverdue
                ? 'Expired On'
                : 'Subscription Expiry'}
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {isCancelledPeriodActive
                ? (activeUntilDateFormatted || '—')
                : inTrial && trialEndDateFormatted
                ? trialEndDateFormatted
                : (nextPaymentDateFormatted || '—')}
            </p>
            <p className="text-[10px] text-slate-400">
              {isCancelledPeriodActive
                ? 'Access concludes'
                : inTrial
                ? `Trial expires: ${trialEndDateFormatted || ''}`
                : access?.isGracePeriod
                ? `Expired: ${access.graceDaysRemaining || 1} day(s) grace left`
                : access?.isPaymentOverdue
                ? 'Expired — renewal required'
                : `Subscription renews: ${nextPaymentDateFormatted || ''}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            {isCancelledPeriodActive
              ? `Your subscription has been cancelled. Full Pro access remains active until ${activeUntilDateFormatted}.`
              : access?.isGracePeriod
              ? `⚠️ Renewal payment pending. Grace period active (${access.graceDaysRemaining || 1} day(s) remaining).`
              : access?.isPaymentOverdue
              ? `🔒 Subscription expired. Please complete payment to restore full access.`
              : hasConfirmedPayment
              ? 'Your subscription renews automatically. You can cancel anytime.'
              : `Subscribe to maintain uninterrupted access. (${planSymbol}${planAmount}/month)`}
          </p>

          <div className="flex items-center gap-2">
            {!hasConfirmedPayment || access?.isGracePeriod || access?.isPaymentOverdue ? (
              <Button
                onClick={isIndia ? handleSubscribe : handleInternationalSubscribe}
                disabled={isProcessingCheckout || !isEligible}
                className={`${
                  access?.isGracePeriod
                    ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs'
                    : access?.isPaymentOverdue
                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs'
                }`}
              >
                {isProcessingCheckout ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : access?.isGracePeriod ? (
                  `Renew Now (${planSymbol}${planAmount})`
                ) : access?.isPaymentOverdue ? (
                  `Pay Now (${planSymbol}${planAmount})`
                ) : isIndia ? (
                  `Subscribe ${planSymbol}${planAmount}`
                ) : (
                  `Pay ${planSymbol}${planAmount}`
                )}
              </Button>
            ) : isCancelledPeriodActive || sub?.cancel_at_period_end ? (
              <Button
                size="sm"
                onClick={handleReactivate}
                disabled={isProcessingCheckout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reactivate Subscription</span>
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

            {sub?.razorpay_subscription_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncGateway}
                disabled={isSyncingGateway}
                className="text-slate-600 hover:text-slate-700 border-slate-200 text-xs gap-1"
                title="Verify live subscription and bank mandate status with Razorpay"
              >
                <RotateCcw className={`h-3 w-3 ${isSyncingGateway ? 'animate-spin' : ''}`} />
                <span>Sync Gateway</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* NOWPayments Status Alert (Requirement 12) */}
      {isInternational && !hasConfirmedPayment && sub?.status !== 'active' && (sub?.payment_status || urlPaymentStatus) && (
        (() => {
          // If status is 'cancelled', ONLY show banner for that immediate session (urlPaymentStatus === 'cancelled')
          // Never persist 'cancelled' alert after page refresh (when urlPaymentStatus is null)
          const effectiveStatus = urlPaymentStatus === 'cancelled'
            ? 'cancelled'
            : (sub?.payment_status === 'cancelled' ? null : (urlPaymentStatus || sub?.payment_status));

          if (!effectiveStatus || effectiveStatus === 'paid' || effectiveStatus === 'finished') {
            return null;
          }

          return (
            <div className={`p-4 rounded-2xl border text-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              effectiveStatus === 'waiting'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-800 dark:text-amber-300'
                : effectiveStatus === 'confirming' || effectiveStatus === 'confirmed' || effectiveStatus === 'sending'
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 text-blue-800 dark:text-blue-300'
                : effectiveStatus === 'partially_paid'
                ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 text-orange-800 dark:text-orange-300'
                : effectiveStatus === 'cancelled'
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
                : effectiveStatus === 'expired'
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 text-slate-700 dark:text-slate-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                {effectiveStatus === 'cancelled' || effectiveStatus === 'failed' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0" />
                )}
                <span className="font-semibold">
                  {effectiveStatus === 'waiting' && 'Waiting for payment. If you exited checkout without paying, you can cancel or retry.'}
                  {(effectiveStatus === 'confirming' || effectiveStatus === 'confirmed' || effectiveStatus === 'sending') && 'Payment detected. Waiting for blockchain confirmation.'}
                  {effectiveStatus === 'partially_paid' && 'Partial payment received. Please complete the remaining amount.'}
                  {effectiveStatus === 'cancelled' && 'Payment was cancelled. You have not been charged.'}
                  {effectiveStatus === 'expired' && 'This payment request has expired. Create a new payment.'}
                  {effectiveStatus === 'failed' && 'Payment could not be completed. Please try again.'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {effectiveStatus === 'waiting' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await fetch('/api/billing/nowpayments/cancel', { method: 'POST' });
                        setData((prev) => prev ? {
                          ...prev,
                          subscription: prev.subscription ? { ...prev.subscription, payment_status: 'cancelled' } : null
                        } : null);
                        setUrlPaymentStatus('cancelled');
                      } catch {}
                    }}
                    className="text-amber-800 dark:text-amber-200 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs h-7 px-2.5"
                  >
                    Cancel
                  </Button>
                )}
                {(effectiveStatus === 'waiting' || effectiveStatus === 'cancelled' || effectiveStatus === 'expired' || effectiveStatus === 'failed') && (
                  <Button
                    size="sm"
                    onClick={handleInternationalSubscribe}
                    disabled={isProcessingCheckout}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 px-3 font-semibold shadow-xs"
                  >
                    Retry Payment ({planSymbol}{planAmount})
                  </Button>
                )}
                {effectiveStatus === 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUrlPaymentStatus(null);
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                    title="Dismiss notification"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* QuoteFlow Pro Plan Card (Requirements 2, 3, 7, 9) */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Available Subscription
        </h3>

        {isIndia ? (
          /* INDIA BILLING (Razorpay Only) */
          <div className="max-w-md rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Paid Plan
              </span>
              {hasConfirmedPayment ? (
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Active
                </Badge>
              ) : access?.isGracePeriod ? (
                <Badge className="bg-amber-600 text-white text-[10px]">
                  Grace Period Active
                </Badge>
              ) : access?.isPaymentOverdue || access?.isRestricted ? (
                <Badge className="bg-rose-600 text-white text-[10px]">
                  Payment Overdue
                </Badge>
              ) : null}
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
              <span className="text-3xl font-black text-slate-900 dark:text-white">{SUBSCRIPTION_CONFIG.INDIA.formattedPrice}</span>
              <span className="text-xs text-slate-400 ml-1 font-medium">/ month</span>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Unlimited Quotations &amp; Invoices</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Unguessable Client Approval Links</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>PDF Generation &amp; Email Receipts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Full Historical Data &amp; Reports Access</span>
              </li>
            </ul>

            <div className="pt-2 space-y-2">
              {hasConfirmedPayment ? (
                <Button
                  disabled
                  className="w-full bg-emerald-600 text-white text-xs font-bold opacity-100 cursor-default"
                >
                  QuoteFlow Pro Active ✓
                </Button>
              ) : access?.isGracePeriod ? (
                <Button
                  onClick={handleSubscribe}
                  disabled={isProcessingCheckout}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Renew QuoteFlow Pro (${SUBSCRIPTION_CONFIG.INDIA.formattedPrice}) — Grace Period Active`
                  )}
                </Button>
              ) : access?.isPaymentOverdue || access?.isRestricted ? (
                <Button
                  onClick={handleSubscribe}
                  disabled={isProcessingCheckout}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Pay Now (${SUBSCRIPTION_CONFIG.INDIA.formattedPrice})`
                  )}
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
                    `Subscribe ${SUBSCRIPTION_CONFIG.INDIA.formattedPrice}`
                  )}
                </Button>
              )}
              <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Secure payment via Razorpay</span>
              </p>
            </div>
          </div>
        ) : !isEligible ? (
          /* INTERNATIONAL: UNSUPPORTED COUNTRY */
          <div className="max-w-md rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-6 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  Online Payments Unavailable
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                  QuoteFlow online subscription payments are not currently available in your country ({billingDetails.countryName}). Please contact support.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSupportModalOpen(true)}
              className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
            >
              Contact Support
            </Button>
          </div>
        ) : (
          /* INTERNATIONAL BILLING (NOWPayments Only) */
          <div className="max-w-md rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Paid Plan
              </span>
              {hasConfirmedPayment ? (
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  Active
                </Badge>
              ) : access?.isGracePeriod ? (
                <Badge className="bg-amber-600 text-white text-[10px]">
                  Grace Period Active
                </Badge>
              ) : access?.isPaymentOverdue || access?.isRestricted ? (
                <Badge className="bg-rose-600 text-white text-[10px]">
                  Payment Overdue
                </Badge>
              ) : null}
            </div>

            <div>
              <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">
                QuoteFlow Pro
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Pay securely with cryptocurrency.
              </p>
            </div>

            <div className="pt-1">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{planSymbol}{planAmount}</span>
              <span className="text-xs text-slate-400 ml-1 font-medium">/ month</span>
            </div>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Unlimited Quotations &amp; Invoices</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Unguessable Client Approval Links</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>PDF Generation &amp; Email Receipts</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Full Historical Data &amp; Reports Access</span>
              </li>
            </ul>

            <div className="pt-2 space-y-2">
              {hasConfirmedPayment ? (
                <Button
                  disabled
                  className="w-full bg-emerald-600 text-white text-xs font-bold opacity-100 cursor-default"
                >
                  QuoteFlow Pro Active ✓
                </Button>
              ) : (
                <Button
                  onClick={handleInternationalSubscribe}
                  disabled={isProcessingCheckout}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                >
                  {isProcessingCheckout ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Pay ${planSymbol}${planAmount}`
                  )}
                </Button>
              )}
              <p className="text-[11px] text-center text-slate-400 leading-tight">
                Processing and blockchain network fees are calculated at checkout and paid by the customer.
              </p>
              <p className="text-[10px] text-center font-semibold text-slate-400 pt-1">
                Powered by NOWPayments
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History (Requirements 14 & 48) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs space-y-0">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-600" />
            <span>Payment History</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Your verified payments and official receipts.
          </p>
        </div>

        {(() => {
          const verifiedPayments = (data?.payments || []).filter(
            (p) => !p.razorpay_payment_id?.startsWith('pay_mock_') && !p.id?.startsWith('pay_mock_')
          );
          if (verifiedPayments.length === 0) {
            return (
              <div className="p-8 text-center text-slate-400 text-xs">
                No transactions recorded yet. Your verified payment receipts will appear here.
              </div>
            );
          }
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Gateway</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Payment Reference</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isPeriodExpired && !hasConfirmedPayment && (
                    <tr className="bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-500">
                      <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                        {formattedPeriodEnd || '—'}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {planSymbol}{planAmount}.00
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {paymentProviderName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <AlertCircle className="h-3 w-3" />
                          <span>Renewal Pending</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        Awaiting recurring debit or renewal
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                        QuoteFlow Pro Monthly Renewal ({formattedPeriodEnd})
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isIndia) handleSubscribe();
                            else handleInternationalSubscribe();
                          }}
                          disabled={isProcessingCheckout}
                          className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs px-2.5 font-semibold"
                        >
                          Renew Now
                        </Button>
                      </td>
                    </tr>
                  )}
                  {verifiedPayments.map((p) => {
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
                    const isSuccess = p.status === 'captured' || p.status === 'authorized' || p.status === 'paid' || p.status === 'finished';
                    const isExplicitGateway = p.provider === 'nowpayments' ||
                      (p.provider === 'razorpay' && !p.razorpay_payment_id?.toLowerCase().includes('manual')) ||
                      Boolean(p.crypto_currency);
                    const isManual = !isExplicitGateway && (
                      p.payment_method === 'manual_verification' ||
                      p.provider === 'manual' ||
                      (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes('manual')) ||
                      (p.id && p.id.toLowerCase().includes('manual'))
                    );
                    const isUsd = (p.currency || '').toUpperCase() === 'USD' || p.provider === 'nowpayments' || (isInternational && isManual);
                    const formattedAmount = isUsd
                      ? `$${(p.amount > 100 ? p.amount / 100 : p.amount).toFixed(2)}`
                      : `₹${(p.amount / 100).toFixed(2)}`;
                    const displayRef = p.nowpayments_payment_id || p.provider_payment_id || p.razorpay_payment_id || p.id;
                    const isNowPayments = !isManual && (p.provider === 'nowpayments' || Boolean(p.crypto_currency));
                    const gatewayName = isManual ? 'Manually Activated' : isNowPayments ? 'NOWPayments' : 'Razorpay';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedTransaction(p)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                          {txDate}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formattedAmount}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isManual
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : isNowPayments
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {gatewayName}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
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
                        <td className="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                          {displayRef}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                          QuoteFlow Pro Monthly Subscription
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
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
          );
        })()}
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
                  {(() => {
                    const isSelExplicitGateway = selectedTransaction.provider === 'nowpayments' ||
                      (selectedTransaction.provider === 'razorpay' && !selectedTransaction.razorpay_payment_id?.toLowerCase().includes('manual')) ||
                      Boolean(selectedTransaction.crypto_currency);
                    const isSelManual = !isSelExplicitGateway && (
                      selectedTransaction.payment_method === 'manual_verification' ||
                      selectedTransaction.provider === 'manual' ||
                      (selectedTransaction.razorpay_payment_id && selectedTransaction.razorpay_payment_id.toLowerCase().includes('manual'))
                    );
                    const isSelUsd = (selectedTransaction.currency || '').toUpperCase() === 'USD' || selectedTransaction.provider === 'nowpayments' || (isInternational && isSelManual);
                    return isSelUsd
                      ? `$${(selectedTransaction.amount > 100 ? selectedTransaction.amount / 100 : selectedTransaction.amount).toFixed(2)}`
                      : `₹${(selectedTransaction.amount / 100).toFixed(2)}`;
                  })()}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Currency</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  {(() => {
                    const isSelExplicitGateway = selectedTransaction.provider === 'nowpayments' ||
                      (selectedTransaction.provider === 'razorpay' && !selectedTransaction.razorpay_payment_id?.toLowerCase().includes('manual')) ||
                      Boolean(selectedTransaction.crypto_currency);
                    const isSelManual = !isSelExplicitGateway && (
                      selectedTransaction.payment_method === 'manual_verification' ||
                      selectedTransaction.provider === 'manual' ||
                      (selectedTransaction.razorpay_payment_id && selectedTransaction.razorpay_payment_id.toLowerCase().includes('manual'))
                    );
                    return selectedTransaction.currency || ((isInternational && isSelManual) || selectedTransaction.provider === 'nowpayments' ? 'USD' : 'INR');
                  })()}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Gateway</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {(() => {
                    const isSelExplicitGateway = selectedTransaction.provider === 'nowpayments' ||
                      (selectedTransaction.provider === 'razorpay' && !selectedTransaction.razorpay_payment_id?.toLowerCase().includes('manual')) ||
                      Boolean(selectedTransaction.crypto_currency);
                    const isSelManual = !isSelExplicitGateway && (
                      selectedTransaction.payment_method === 'manual_verification' ||
                      selectedTransaction.provider === 'manual' ||
                      (selectedTransaction.razorpay_payment_id && selectedTransaction.razorpay_payment_id.toLowerCase().includes('manual'))
                    );
                    if (isSelManual) return 'Manually Activated';
                    return selectedTransaction.provider === 'nowpayments' ? 'NOWPayments' : 'Razorpay';
                  })()}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Status</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedTransaction.status === 'captured' || selectedTransaction.status === 'authorized' || selectedTransaction.status === 'paid' || selectedTransaction.status === 'finished'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {selectedTransaction.status === 'captured' || selectedTransaction.status === 'paid' || selectedTransaction.status === 'finished' ? 'Paid' : selectedTransaction.status}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Payment Reference</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {selectedTransaction.nowpayments_payment_id || selectedTransaction.provider_payment_id || selectedTransaction.razorpay_payment_id || selectedTransaction.id || 'N/A'}
                </span>
              </div>

              {selectedTransaction.crypto_currency && (
                <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Crypto Details</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedTransaction.crypto_amount ? `${selectedTransaction.crypto_amount} ` : ''}
                    {selectedTransaction.crypto_currency.toUpperCase()}
                  </span>
                </div>
              )}

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
    </div>
  );
}
