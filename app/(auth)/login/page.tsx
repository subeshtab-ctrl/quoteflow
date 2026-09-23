'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const paramEmail = searchParams.get('email') || '';
  const redirectParam = searchParams.get('redirect') || '/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState(paramEmail || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [error, setError] = useState<string | null>(urlError || null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        router.push(redirectParam);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          setError(
            'Your email address has not been verified yet. Please check your inbox and click the verification link before signing in.'
          );
          setShowResend(true);
          setIsLoading(false);
          return;
        }
        throw authError;
      }

      // Ensure email is confirmed in Supabase Auth record
      if (data?.user && !data.user.email_confirmed_at && !data.user.confirmed_at) {
        await supabase.auth.signOut();
        setError('Your email address has not been verified yet. Please verify your email first.');
        setShowResend(true);
        setIsLoading(false);
        return;
      }

      // Sync user profile on login
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

      router.push(redirectParam);
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setIsResending(true);
    setResendSuccess(false);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });
      }
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
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
        <h1 className="text-2xl font-black text-slate-900">Sign in to QuoteFlow</h1>
        <p className="text-xs text-slate-500">
          Enter your credentials to access your organization dashboard.
        </p>
      </div>

      <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
        <form onSubmit={handleLogin}>
          <CardContent className="p-6 space-y-4">
            {/* Google Sign In Option */}
            <GoogleSignInButton mode="signin" />

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2.5 text-slate-400 font-bold tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>

            {verified && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Email verified successfully! You can now sign in.</span>
              </div>
            )}

            {resendSuccess && (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Verification email sent! Please check your inbox.</span>
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

            {showResend && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full text-xs text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1.5 disabled:opacity-50 py-1"
              >
                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Sending...' : 'Resend verification email'}</span>
              </button>
            )}
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
