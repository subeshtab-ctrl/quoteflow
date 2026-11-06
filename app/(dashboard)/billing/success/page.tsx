'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get('order_id') || '';
  const invoiceId = searchParams.get('invoice_id') || '';
  const isSimulated = searchParams.get('simulated_nowpayments') === 'true';

  const [status, setStatus] = useState<
    'waiting' | 'confirming' | 'finished' | 'partially_paid' | 'failed' | 'expired' | 'loading'
  >(isSimulated ? 'finished' : 'loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isSimulated && invoiceId && orderId) {
      // Simulate IPN callback for dev/sandbox environment
      fetch('/api/webhooks/nowpayments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nowpayments-sig': 'dev-simulated-sig',
        },
        body: JSON.stringify({
          payment_id: `np_sim_${Date.now()}`,
          payment_status: 'finished',
          pay_amount: 10,
          actually_paid: 10,
          pay_currency: 'usdttrc20',
          order_id: orderId,
          price_amount: 10,
          price_currency: 'usd',
        }),
      })
        .then(() => {
          setStatus('finished');
          setMessage('Payment successful. QuoteFlow Pro is now active.');
        })
        .catch(() => {
          setStatus('finished');
          setMessage('Payment received. Your subscription is being activated.');
        });
      return;
    }

    // Poll subscription status from server
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch('/api/subscriptions', { cache: 'no-store' });
        const json = await res.json();
        if (json.subscription?.payment_status === 'finished' || json.subscription?.status === 'active') {
          setStatus('finished');
          setMessage('Payment successful. QuoteFlow Pro is now active.');
          clearInterval(interval);
        } else if (json.subscription?.payment_status === 'partially_paid') {
          setStatus('partially_paid');
          setMessage('Partial payment received. Please complete the remaining amount.');
        } else if (json.subscription?.payment_status === 'confirming') {
          setStatus('confirming');
          setMessage('Payment detected. Waiting for blockchain confirmation.');
        } else if (attempts >= 10) {
          setStatus('waiting');
          setMessage('Waiting for payment confirmation on the blockchain. Your account will automatically activate once confirmed.');
          clearInterval(interval);
        }
      } catch {
        if (attempts >= 5) {
          clearInterval(interval);
          setStatus('waiting');
          setMessage('Waiting for payment. Please check your blockchain wallet or payment status.');
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderId, invoiceId, isSimulated]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0b0f19]">
      <Card className="w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-6">
        {status === 'finished' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Payment Successful!
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {message || 'Payment successful. QuoteFlow Pro is now active.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">QuoteFlow Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">$10 USD / month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Provider:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">NOWPayments</span>
              </div>
              {orderId && (
                <div className="flex justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">{orderId}</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard')}
                className="w-full h-11 text-sm font-bold shadow-lg shadow-indigo-500/20 rounded-xl flex items-center justify-center gap-2"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link
                href="/billing"
                className="inline-block text-xs font-semibold text-slate-500 hover:text-indigo-600"
              >
                View Billing & Receipts →
              </Link>
            </div>
          </>
        ) : status === 'confirming' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <Clock className="h-9 w-9 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Confirming Payment
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {message || 'Payment detected. Waiting for blockchain confirmation.'}
              </p>
            </div>
            <Link href="/billing">
              <Button variant="outline" className="w-full">Return to Billing</Button>
            </Link>
          </>
        ) : status === 'partially_paid' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 shadow-inner">
              <AlertCircle className="h-9 w-9 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Partial Payment Received
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {message || 'Partial payment received. Please complete the remaining amount.'}
              </p>
            </div>
            <Link href="/billing">
              <Button variant="outline" className="w-full">Return to Billing</Button>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shadow-inner">
              <Clock className="h-9 w-9 text-slate-500 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Waiting for Payment
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {message || 'Waiting for payment confirmation. You will receive access once the transaction is confirmed.'}
              </p>
            </div>
            <Link href="/billing">
              <Button variant="outline" className="w-full">Return to Billing</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0b0f19]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <BillingSuccessContent />
    </React.Suspense>
  );
}
