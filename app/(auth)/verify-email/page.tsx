'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Mail,
  Loader2,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAuthRedirectUrl } from '@/lib/utils/auth';
import type { EmailOtpType } from '@supabase/supabase-js';

type VerificationStatus = 'verifying' | 'verified' | 'error';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const urlEmail = searchParams.get('email') || '';
  const urlError = searchParams.get('error') || searchParams.get('error_description');

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string>(urlEmail);

  // Resend state
  const [resendEmailInput, setResendEmailInput] = useState<string>(urlEmail);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  // Guard to ensure verification check & fireworks run only once
  const verificationAttemptedRef = useRef(false);
  const fireworksTriggeredRef = useRef(false);

  /**
   * Cracker / Firework celebration sequence using canvas-confetti
   */
  const triggerFireworks = async () => {
    if (fireworksTriggeredRef.current) return;
    fireworksTriggeredRef.current = true;

    // Respect user's reduced-motion preference
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    try {
      const confettiModule = await import('canvas-confetti');
      const confetti = confettiModule.default || confettiModule;

      const colors = ['#4f46e5', '#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'];

      // Burst 1 (t = 0ms): Center cracker burst
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { x: 0.5, y: 0.58 },
        colors,
        disableForReducedMotion: true,
        zIndex: 9999,
      });

      // Burst 2 (t = 300ms): Left-side cracker firing inward and upward
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 60,
          spread: 60,
          origin: { x: 0.12, y: 0.72 },
          colors,
          disableForReducedMotion: true,
          zIndex: 9999,
        });
      }, 300);

      // Burst 3 (t = 650ms): Right-side cracker firing inward and upward
      setTimeout(() => {
        confetti({
          particleCount: 40,
          angle: 120,
          spread: 60,
          origin: { x: 0.88, y: 0.72 },
          colors,
          disableForReducedMotion: true,
          zIndex: 9999,
        });
      }, 650);

      // Burst 4 (t = 1100ms): Grand finale celebration burst from center
      setTimeout(() => {
        confetti({
          particleCount: 60,
          spread: 100,
          origin: { x: 0.5, y: 0.5 },
          shapes: ['circle', 'square'],
          colors,
          disableForReducedMotion: true,
          zIndex: 9999,
        });
      }, 1100);
    } catch (confettiErr) {
      console.warn('Confetti animation note:', confettiErr);
    }
  };

  /**
   * Verify actual authentication state with Supabase
   */
  useEffect(() => {
    if (verificationAttemptedRef.current) return;
    verificationAttemptedRef.current = true;

    // If an explicit error was returned by Supabase via URL query
    if (urlError) {
      setStatus('error');
      setErrorMessage(urlError);
      return;
    }

    const verifyAuth = async () => {
      try {
        const supabase = createClient();
        if (!supabase) {
          setStatus('error');
          setErrorMessage('Authentication service is currently unavailable.');
          return;
        }

        // 1. Direct token verification (if arriving directly with token_hash & type)
        if (token_hash && type) {
          const { data, error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });

          if (verifyErr) {
            setStatus('error');
            setErrorMessage(verifyErr.message || 'Invalid or expired verification link.');
            return;
          }

          if (data?.user) {
            const confirmedUserEmail = data.user.email || urlEmail;
            setVerifiedEmail(confirmedUserEmail);

            // Sync user profile in background
            try {
              await fetch('/api/auth/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.user.id,
                  email: confirmedUserEmail,
                  fullName: data.user.user_metadata?.full_name,
                  companyName: data.user.user_metadata?.company_name,
                }),
              });
            } catch (syncErr) {
              console.warn('Sync profile note in verify-email:', syncErr);
            }

            // Transition to verified state and trigger celebration
            setStatus('verified');
            setTimeout(() => {
              triggerFireworks();
            }, 100);
            return;
          }
        }

        // 2. PKCE code exchange (if arriving directly with code)
        if (code) {
          const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeErr) {
            setStatus('error');
            setErrorMessage(exchangeErr.message || 'Invalid or expired verification code.');
            return;
          }

          if (data?.user) {
            const confirmedUserEmail = data.user.email || urlEmail;
            setVerifiedEmail(confirmedUserEmail);

            try {
              await fetch('/api/auth/save-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.user.id,
                  email: confirmedUserEmail,
                  fullName: data.user.user_metadata?.full_name,
                  companyName: data.user.user_metadata?.company_name,
                }),
              });
            } catch (syncErr) {
              console.warn('Sync profile note in PKCE verify-email:', syncErr);
            }

            setStatus('verified');
            setTimeout(() => {
              triggerFireworks();
            }, 100);
            return;
          }
        }

        // 3. Callback redirection verification (session already set via /auth/callback cookies)
        // Must confirm actual Supabase authenticated user with confirmed email
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
          // If no active session or invalid user, do NOT celebrate
          setStatus('error');
          setErrorMessage('Your verification link may have expired or already been used.');
          return;
        }

        // Check if user is actually confirmed
        const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
        if (isEmailConfirmed) {
          setVerifiedEmail(user.email || urlEmail);
          setStatus('verified');
          setTimeout(() => {
            triggerFireworks();
          }, 100);
        } else {
          setStatus('error');
          setErrorMessage('Your email address has not been confirmed yet.');
        }
      } catch (err: any) {
        console.error('Email verification error:', err);
        setStatus('error');
        setErrorMessage(
          err.message || 'Verification failed. Your link may have expired or already been used.'
        );
      }
    };

    // Small delay for smooth perception of the verification process
    const timer = setTimeout(verifyAuth, 600);
    return () => clearTimeout(timer);
  }, [token_hash, type, code, urlError, urlEmail]);

  /**
   * Resend Verification Email handler
   */
  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = resendEmailInput.trim() || verifiedEmail.trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      setResendError('Please enter a valid email address.');
      return;
    }

    setIsResending(true);
    setResendError(null);
    setResendMessage(null);

    try {
      const supabase = createClient();
      const redirectUrl = getAuthRedirectUrl();

      // 1. Resend via Supabase Auth client
      if (supabase) {
        await supabase.auth.resend({
          type: 'signup',
          email: targetEmail,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
      }

      // 2. Also trigger internal backend notification
      try {
        await fetch('/api/auth/send-verification-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        });
      } catch (backendErr) {
        console.warn('Backend resend trigger note:', backendErr);
      }

      setResendMessage(`Verification email resent to ${targetEmail}! Please check your inbox.`);
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setResendError(err.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0b0f19] p-4 transition-colors">
      {/* Subtle ambient gradient glow background */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/10 via-emerald-500/10 to-transparent blur-3xl dark:from-indigo-600/15 dark:via-emerald-600/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl dark:from-indigo-600/15 dark:via-purple-600/15"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-color,#4f46e5)] text-white font-black text-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            Q
          </div>
          <h1 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            QuoteFlow Security
          </h1>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none transition-all">
          {/* ======================================================== */}
          {/* STEP 1: INITIAL VERIFYING ANIMATION                     */}
          {/* ======================================================== */}
          {status === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
              {/* Modern pulsing orbital loader ring */}
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950/60 animate-ping opacity-25" />
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent animate-spin" />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="h-7 w-7 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                  VERIFYING EMAIL…
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Please wait a moment while we authenticate your credentials with Supabase...
                </p>
              </div>

              {/* Progress bar line */}
              <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2-4: VERIFIED + FIREWORKS + SUCCESS MESSAGE + LOGIN */}
          {/* ======================================================== */}
          {status === 'verified' && (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-6">
              {/* Bold Verified Badge with Smooth Scale + Fade-In */}
              <div className="flex flex-col items-center justify-center space-y-3 animate-verified-pop">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 dark:shadow-emerald-500/20 animate-pulse-glow">
                  <Check className="h-10 w-10 stroke-[3.5]" />
                </div>

                <div className="space-y-1 pt-1">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    ✓ VERIFIED
                  </h2>
                </div>
              </div>

              {/* Success Confirmation Text (Step 3) */}
              <div className="space-y-2 animate-fade-in-up">
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Your email has been successfully verified.
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  You can now access your dashboard.
                </p>

                {verifiedEmail && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Mail className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{verifiedEmail}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Login Button with Entrance Animation (Step 4) */}
              <div className="w-full pt-2 animate-fade-in-up">
                <Button
                  onClick={() => {
                    const loginUrl = verifiedEmail
                      ? `/login?email=${encodeURIComponent(verifiedEmail)}&verified=true`
                      : '/login?verified=true';
                    router.push(loginUrl);
                  }}
                  variant="primary"
                  className="w-full h-12 text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all group"
                >
                  <span>Login to Dashboard</span>
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>

                <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Ready to manage quotations, customers, and invoices.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ERROR STATE: Failed / Expired Verification              */}
          {/* ======================================================== */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-6">
              {/* Friendly Error Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 shadow-inner">
                <AlertTriangle className="h-8 w-8" />
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  Verification failed
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {errorMessage ||
                    'Your verification link may have expired or already been used.'}
                </p>
              </div>

              {/* Resend Status Notifications */}
              {resendMessage && (
                <div className="w-full rounded-xl bg-emerald-50 dark:bg-emerald-950/50 p-3 text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-left flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{resendMessage}</span>
                </div>
              )}

              {resendError && (
                <div className="w-full rounded-xl bg-rose-50 dark:bg-rose-950/50 p-3 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-left flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{resendError}</span>
                </div>
              )}

              {/* Optional Email Input for Resend if email is unknown */}
              {!verifiedEmail && !urlEmail && (
                <div className="w-full text-left space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Your Registered Email
                  </label>
                  <Input
                    type="email"
                    value={resendEmailInput}
                    onChange={(e) => setResendEmailInput(e.target.value)}
                    placeholder="name@company.com"
                    className="h-10 text-xs"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full space-y-3 pt-2">
                {/* Resend Verification Email Button */}
                <Button
                  onClick={() => handleResend()}
                  disabled={isResending}
                  variant="primary"
                  className="w-full h-11 text-xs font-bold shadow-md"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'Resending Link...' : 'Resend Verification Email'}</span>
                </Button>

                {/* Try Again Button */}
                <Link href="/login" className="block w-full">
                  <Button
                    variant="outline"
                    className="w-full h-11 text-xs font-semibold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    Try Again
                  </Button>
                </Link>
              </div>

              <div className="text-center text-xs text-slate-400 dark:text-slate-500">
                Need help?{' '}
                <Link
                  href="/register"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Register a new account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Loading verification...
            </p>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
