'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user already has an active session from recovery link
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setHasSession(true);
        setSessionUserEmail(user.email || null);
        if (user.email && !email) {
          setEmail(user.email);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setHasSession(true);
        setSessionUserEmail(session.user.email || null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    if (!hasSession && (!email.trim() || !otp.trim())) {
      setError('Please provide both your registered email and the 6-digit recovery code.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, any> = {
        newPassword,
      };

      if (!hasSession) {
        payload.email = email.trim();
        payload.otp = otp.trim();
      }

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Set New Password</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create a new strong password for your QuoteFlow account.
        </p>
      </div>

      <Card className="rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Password Updated!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your password has been changed securely. You can now sign in with your new password.
              </p>
            </div>

            <div className="pt-3">
              <Button
                onClick={() => {
                  const targetEmail = sessionUserEmail || email;
                  router.push(targetEmail ? `/login?email=${encodeURIComponent(targetEmail)}` : '/login');
                }}
                variant="primary"
                className="w-full shadow-md"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-4">
              {hasSession ? (
                <div className="rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 p-3 text-xs text-indigo-900 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    Authenticated recovery session for{' '}
                    <strong>{sessionUserEmail || email || 'your account'}</strong>.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2">
                    <Mail className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      Enter your email and the 6-digit verification code received in your reset email.
                    </span>
                  </div>

                  <Input
                    label="Email Address *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                  />

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      6-Digit Security Code *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-slate-100 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                label="New Password *"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />

              <Input
                label="Confirm New Password *"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                minLength={6}
              />
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col gap-3">
              <Button type="submit" variant="primary" isLoading={isLoading} className="w-full shadow-md">
                <Lock className="h-4 w-4 mr-1.5" />
                <span>Save New Password</span>
              </Button>

              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19] p-4 transition-colors">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading password reset...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
