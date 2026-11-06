'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Gift,
  Loader2,
} from 'lucide-react';

function RedeemContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    const qCode = searchParams.get('code');
    if (qCode) {
      setCode(qCode.trim().toUpperCase());
    }
  }, [searchParams]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a valid AppSumo voucher code.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setRequiresAuth(false);

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem voucher code.');
      }

      if (data.requiresAuth) {
        setRequiresAuth(true);
        setSuccess(data.message);
      } else {
        setSuccess(data.message || 'Lifetime Plan Activated Successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred while validating code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Quote<span className="text-indigo-600">Flow</span>
            </span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-2">
            <Gift className="h-3.5 w-3.5 text-amber-600" />
            AppSumo Partner Redemption
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Redeem Lifetime Access</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your AppSumo voucher code below to activate your QuoteFlow Pro plan.
          </p>
        </div>

        {/* Card */}
        <Card className="p-6 md:p-8 bg-white shadow-xl shadow-slate-200/50 border-slate-200/80 rounded-2xl">
          {success && !requiresAuth ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Lifetime Plan Active!</h2>
              <p className="text-sm text-slate-600">{success}</p>
              <div className="pt-4">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-100"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRedeem} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {requiresAuth && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-3">
                  <div className="flex items-start gap-2 font-medium">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>Voucher code verified! Please log in or create an account to assign it.</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/register?code=${encodeURIComponent(code)}`}
                      className="flex-1 text-center py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Create Account
                    </Link>
                    <Link
                      href={`/login?redirect=/redeem?code=${encodeURIComponent(code)}`}
                      className="flex-1 text-center py-2 px-3 bg-white border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-100/50"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  AppSumo Voucher Code
                </label>
                <Input
                  type="text"
                  placeholder="e.g. QF-XXXX-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="h-12 uppercase font-mono tracking-wider text-base rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Found on your AppSumo purchase receipt or redemption email.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Validating Code...
                  </>
                ) : (
                  <>
                    Activate QuoteFlow Pro <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Guaranteed Lifetime License via AppSumo
              </div>
            </form>
          )}
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Need help with your code? Contact{' '}
          <a href="mailto:support@blendandbold.com" className="text-indigo-600 hover:underline font-medium">
            support@blendandbold.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading...</div>}>
      <RedeemContent />
    </Suspense>
  );
}
