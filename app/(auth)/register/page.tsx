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
  Building,
  User,
  Lock,
  Sparkles,
  KeyRound,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Mode: 'password' | 'otp'
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  // OTP flow step: 'details' | 'verify'
  const [otpStep, setOtpStep] = useState<'details' | 'verify'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userAlreadyExists, setUserAlreadyExists] = useState(false);

  // 1. Password-based registration
  const handleRegisterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUserAlreadyExists(false);
    setIsLoading(true);

    try {
      // 1. Create verified account and company workspace via server API
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.error?.toLowerCase().includes('already exists')) {
          setUserAlreadyExists(true);
        }
        throw new Error(data.error || 'Failed to create account.');
      }

      // 2. Automatically sign in with client session
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  // 2. Send OTP code for email verification
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!companyName.trim()) {
      setError('Please enter your company or business name.');
      return;
    }

    setError(null);
    setIsSendingOtp(true);
    setDevOtpCode(null);

    try {
      // Dispatch OTP via server
      const res = await fetch('/api/auth/send-verification-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          companyName: companyName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      if (data.otpCode) {
        setDevOtpCode(data.otpCode);
      }

      setOtpStep('verify');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to dispatch verification OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 3. Verify OTP code and activate workspace
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length < 6) {
      setError('Please enter the full verification code (at least 6 digits).');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Supabase client unavailable.');
      }

      // Verify OTP with Supabase Auth
      let authUser = null;
      let { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanOtp,
        type: 'magiclink',
      });

      if (verifyErr) {
        const retrySignup = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: cleanOtp,
          type: 'signup',
        });

        if (retrySignup.error) {
          const retryEmail = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: cleanOtp,
            type: 'email',
          });

          if (retryEmail.error) {
            throw verifyErr;
          }
          authUser = retryEmail.data?.user;
        } else {
          authUser = retrySignup.data?.user;
        }
      } else {
        authUser = data?.user;
      }

      // Ensure private organization workspace is created for this user
      if (authUser) {
        await fetch('/api/auth/save-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUser.id,
            email: authUser.email,
            fullName: fullName.trim() || authUser.user_metadata?.full_name,
            companyName: companyName.trim() || authUser.user_metadata?.company_name,
          }),
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Invalid or expired verification code.');
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Create QuoteFlow Workspace
          </h1>
          <p className="text-xs text-slate-500">
            Start issuing digital quotations and capturing client signatures in minutes.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
          {success ? (
            <div className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-emerald-900">Workspace Ready!</h2>
              <p className="text-xs text-emerald-700">
                Your account has been verified. Entering your dashboard...
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* 1. Google Sign Up Option */}
              <div className="space-y-3">
                <GoogleSignInButton mode="signup" />

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white px-2.5 text-slate-400 font-bold tracking-wider">
                      Or register with work email
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Verification Mode Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('password');
                    setError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all ${
                    authMethod === 'password'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Password Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setError(null);
                  }}
                  className={`py-1.5 px-3 rounded-lg font-semibold transition-all ${
                    authMethod === 'otp'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Email OTP Verification
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                  {userAlreadyExists && (
                    <div className="pt-2 border-t border-rose-200/60 flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/login?email=${encodeURIComponent(email)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50"
                      >
                        <span>Sign In with Password →</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('otp');
                          setError(null);
                          setUserAlreadyExists(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50"
                      >
                        <span>Verify with OTP Code →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 1: Password Registration Form */}
              {authMethod === 'password' && (
                <form onSubmit={handleRegisterPassword} className="space-y-3.5">
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

                  <div className="rounded-xl bg-indigo-50/70 p-2.5 text-xs text-indigo-900 border border-indigo-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Instant activation: Launches your private workspace immediately.</span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="w-full shadow-md mt-2"
                  >
                    <span>Register & Launch Workspace</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </form>
              )}

              {/* METHOD 2: Email OTP Registration Flow */}
              {authMethod === 'otp' && (
                <>
                  {otpStep === 'details' ? (
                    <form onSubmit={handleSendOtp} className="space-y-3.5">
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

                      <div className="rounded-xl bg-purple-50 p-2.5 text-xs text-purple-900 border border-purple-100 flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-purple-600 shrink-0" />
                        <span>A 6-digit verification code will be dispatched to your email.</span>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSendingOtp}
                        className="w-full shadow-md mt-2 bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="h-4 w-4 mr-1.5" />
                        <span>Send Verification OTP Code</span>
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="text-center space-y-1">
                        <p className="text-xs text-slate-500">Verification code sent to:</p>
                        <span className="inline-block font-mono text-xs font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg">
                          {email}
                        </span>
                      </div>

                      {/* Instant Code Fallback Badge */}
                      {devOtpCode && (
                        <button
                          type="button"
                          onClick={() => setOtpCode(devOtpCode)}
                          className="w-full rounded-xl bg-indigo-50 border border-indigo-200 p-2.5 text-center text-xs text-indigo-900 font-medium hover:bg-indigo-100 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          title="Click to auto-fill code"
                        >
                          <span>Instant Code:</span>
                          <span className="font-mono text-sm font-bold tracking-widest text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                            {devOtpCode}
                          </span>
                          <span className="text-[11px] text-indigo-600 underline font-normal">(Click to fill)</span>
                        </button>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Enter 6-Digit OTP Code
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
                          className="h-14 w-full rounded-xl border-2 border-slate-200 text-center font-mono text-2xl font-extrabold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-500/10 shadow-inner bg-slate-50/50"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isVerifyingOtp}
                        disabled={otpCode.trim().length < 6}
                        className="w-full shadow-md bg-purple-600 hover:bg-purple-700"
                      >
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        <span>Verify & Launch Workspace</span>
                      </Button>

                      <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                        <button
                          type="button"
                          onClick={() => setOtpStep('details')}
                          className="hover:text-indigo-600"
                        >
                          ← Change Email
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          Resend Code
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* Bottom Sign In Link */}
              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
