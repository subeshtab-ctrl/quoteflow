'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft, AlertCircle, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send password reset email.');
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please check your email and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend reset email.');
      }

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19] p-4 transition-colors">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Reset Password</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enter your email and we will send password reset instructions to your inbox.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {isSubmitted ? (
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Check your inbox</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We sent a secure password reset link and verification code to:
                </p>
                <p className="text-sm font-semibold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 py-1.5 px-3 rounded-lg inline-block">
                  {email}
                </p>
              </div>

              {resendSuccess && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Reset link resent successfully!</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 space-y-2.5">
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 text-xs font-bold shadow-md transition-all"
                >
                  <KeyRound className="h-4 w-4" />
                  <span>Enter 6-Digit Code / Set New Password</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Sending...' : 'Resend reset link'}</span>
                  </button>

                  <Link href="/login" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium">
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-4">
                {error && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Email Address *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </CardContent>

              <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                <Button type="submit" variant="primary" isLoading={isLoading} className="w-full shadow-md">
                  Send Reset Link
                </Button>
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to sign in</span>
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
