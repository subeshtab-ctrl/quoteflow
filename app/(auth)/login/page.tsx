'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const paramEmail = searchParams.get('email') || '';
  const initialOtpMode = searchParams.get('otp') === 'true';

  const [email, setEmail] = useState(paramEmail || 'admin@apextechnologies.io');
  const [password, setPassword] = useState('password123');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpMode, setIsOtpMode] = useState(initialOtpMode);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Demo account shortcut
      if (email.trim() === 'admin@apextechnologies.io') {
        setTimeout(() => {
          setIsLoading(false);
          router.push('/dashboard');
        }, 500);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        router.push('/dashboard');
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          setIsOtpMode(true);
          setError('Email is not verified yet. Please enter the 6-digit OTP code sent to your inbox.');
          setIsLoading(false);
          return;
        }
        throw authError;
      }

      // Sync user profile & metadata on login
      if (data.user) {
        try {
          await fetch('/api/auth/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              fullName: data.user.user_metadata?.full_name,
              companyName: data.user.user_metadata?.company_name,
            }),
          });
        } catch (saveErr) {
          console.warn('Sync user details note:', saveErr);
        }
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        router.push('/dashboard');
        return;
      }

      // 1. Verify OTP with Supabase Auth
      let authUser = null;
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: 'signup',
      });

      if (verifyErr) {
        // Fallback retry with type: 'email'
        const { data: retryData, error: retryErr } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: 'email',
        });

        if (retryErr) {
          throw verifyErr;
        }
        authUser = retryData?.user;
      } else {
        authUser = data?.user;
      }

      // 2. Persist user & company details
      if (authUser) {
        try {
          await fetch('/api/auth/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authUser.id,
              email: authUser.email || email.trim(),
              fullName: authUser.user_metadata?.full_name,
              companyName: authUser.user_metadata?.company_name,
            }),
          });
        } catch (saveErr) {
          console.warn('Save user post-verify note:', saveErr);
        }
      }

      setOtpSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(
        err.message || 'Invalid or expired OTP code. Please check your email or click Resend.'
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsResending(true);
    setResendSuccess(false);

    try {
      const supabase = createClient();
      if (supabase) {
        const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (resendError) throw resendError;
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200">
          Q
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          {isOtpMode ? 'Email OTP Verification' : 'Sign in to QuoteFlow'}
        </h1>
        <p className="text-xs text-slate-500">
          {isOtpMode
            ? 'Enter the 6-digit confirmation OTP sent to your email.'
            : 'Enter your credentials to access your organization dashboard.'}
        </p>
      </div>

      <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
        {isOtpMode ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
                <KeyRound className="h-7 w-7 text-indigo-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">Enter Verification Code</h2>
                <p className="text-xs text-slate-500 mt-0.5">Verification code sent to:</p>
                <div className="mt-1 inline-block font-mono text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                  {email}
                </div>
              </div>
            </div>

            {otpSuccess ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="font-bold text-emerald-900 text-base">OTP Verified!</h3>
                <p className="text-xs text-emerald-700">
                  Redirecting to your dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {resendSuccess && (
                  <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>New OTP sent! Please check your inbox.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="h-14 w-full rounded-xl border-2 border-slate-200 text-center font-mono text-2xl font-extrabold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner bg-slate-50/50"
                    required
                  />
                  <p className="text-[11px] text-slate-400 text-center">
                    Check your email inbox or spam folder for the code.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isVerifyingOtp}
                  disabled={otpCode.trim().length < 6}
                  className="w-full py-3 shadow-md gap-2 text-sm font-bold"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify OTP & Sign In</span>
                </Button>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                    <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpMode(false);
                      setError(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Back to Password Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <CardContent className="p-6 space-y-4">
              {verified && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Email verified successfully! You can now sign in.</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpMode(true);
                    setError(null);
                  }}
                  className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Have a 6-digit OTP? Verify here</span>
                </button>
              </div>

              <div className="rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 border border-indigo-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Demo account prefilled for immediate evaluation.</span>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col gap-3">
              <Button type="submit" variant="primary" isLoading={isLoading} className="w-full shadow-md">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>

              <p className="text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
                  Register Organization
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
