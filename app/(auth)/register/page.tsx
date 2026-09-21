'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl } from '@/lib/utils/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        router.push('/dashboard');
        return;
      }

      const redirectUrl = getAuthRedirectUrl();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        throw authError;
      }

      if (data.user) {
        setRegisteredUserId(data.user.id);

        // Pre-save user & company profile in database
        try {
          await fetch('/api/auth/save-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: email.trim(),
              fullName: fullName.trim(),
              companyName: companyName.trim(),
            }),
          });
        } catch (saveErr) {
          console.warn('Pre-save user details note:', saveErr);
        }

        // Also trigger backend OTP notification dispatch
        try {
          await fetch('/api/auth/send-verification-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim() }),
          });
        } catch (otpErr) {
          console.warn('Backend OTP dispatch note:', otpErr);
        }

        setIsVerificationSent(true);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length < 6) {
      setError('Please enter the complete verification code (6 to 8 digits).');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        router.push('/dashboard');
        return;
      }

      // 1. Verify OTP with Supabase Auth (type: signup)
      let authUser = null;
      let { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: 'signup',
      });

      if (verifyErr) {
        // Fallback retry with type: email
        const retryEmail = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: 'email',
        });

        if (retryEmail.error) {
          // Fallback retry with type: magiclink
          const retryMagic = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: cleanOtp,
            type: 'magiclink',
          });

          if (retryMagic.error) {
            throw verifyErr;
          }
          authUser = retryMagic.data?.user;
        } else {
          authUser = retryEmail.data?.user;
        }
      } else {
        authUser = data?.user;
      }

      // 2. Persist user and organization details
      try {
        await fetch('/api/auth/save-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUser?.id || registeredUserId,
            email: email.trim(),
            fullName: fullName.trim(),
            companyName: companyName.trim(),
          }),
        });
      } catch (err) {
        console.error('Save user post-verify error:', err);
      }

      setVerifySuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(
        err.message || 'Invalid or expired OTP code. Please check your email or click Resend.'
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendEmail = async () => {
    setError(null);
    setIsResending(true);
    setResendSuccess(false);

    try {
      const supabase = createClient();
      const redirectUrl = getAuthRedirectUrl();

      if (supabase) {
        await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
      }

      // Also trigger backend OTP notification
      await fetch('/api/auth/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {isVerificationSent ? 'Email OTP Verification' : 'Create QuoteFlow Account'}
          </h1>
          <p className="text-xs text-slate-500">
            {isVerificationSent
              ? 'Enter the verification code sent to your email.'
              : 'Start issuing digital quotations and capturing client signatures in minutes.'}
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
          {isVerificationSent ? (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
                  <KeyRound className="h-7 w-7 text-indigo-600" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">Enter Verification Code</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    We sent a verification code to:
                  </p>
                  <div className="mt-1 inline-block font-mono text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                    {email}
                  </div>
                </div>
              </div>

              {verifySuccess ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto animate-bounce" />
                  <h3 className="font-bold text-emerald-900 text-base">OTP Verified!</h3>
                  <p className="text-xs text-emerald-700">
                    Your account is active. Redirecting to your dashboard...
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
                      <span>New verification code sent! Please check your inbox.</span>
                    </div>
                  )}

                  {/* Monospace OTP Input (Supports 6 to 8 digits) */}
                  <div className="space-y-1.5">
                    <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Verification OTP Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="••••••••"
                      className="h-14 w-full rounded-xl border-2 border-slate-200 text-center font-mono text-2xl font-extrabold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner bg-slate-50/50"
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
                    <span>Verify Code & Activate Workspace</span>
                  </Button>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleResendEmail}
                      disabled={isResending}
                      className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                      <span>{isResending ? 'Sending...' : 'Resend Code'}</span>
                    </button>

                    <Link href="/login" className="text-slate-500 hover:text-slate-800">
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              <CardContent className="p-6 space-y-3.5">
                {error && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Input
                  label="Your Full Name *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rajesh Kumar"
                  required
                />

                <Input
                  label="Company / Business Name *"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Zenith Tech Solutions"
                  required
                />

                <Input
                  label="Work Email *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh@zenithtech.in"
                  required
                />

                <Input
                  label="Password *"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </CardContent>

              <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                <Button type="submit" variant="primary" isLoading={isLoading} className="w-full shadow-md">
                  <span>Send Verification OTP</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>

                <p className="text-center text-xs text-slate-500">
                  Already registered?{' '}
                  <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                    Sign In
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
