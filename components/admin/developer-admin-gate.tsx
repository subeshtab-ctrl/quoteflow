'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeveloperAdminGateProps {
  onAuthenticated: () => void;
  initialHasPassword?: boolean;
  hasPassword?: boolean;
  customerSessionConflict?: boolean;
  customerEmail?: string | null;
}

type AuthStep = 'password' | 'otp' | 'forgot-send' | 'forgot-reset';

export function DeveloperAdminGate({
  onAuthenticated,
  customerSessionConflict,
}: DeveloperAdminGateProps) {
  // Step state machine:
  // - 'password': Step 1 of login (Email + Password)
  // - 'otp': Step 2 of login (6-digit 2FA OTP)
  // - 'forgot-send': Step 1 of recovery (Enter email -> dispatch reset OTP)
  // - 'forgot-reset': Step 2 of recovery (Enter 6-digit OTP + New Password)
  const [step, setStep] = useState<AuthStep>('password');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);

  // Forgot password input states
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Messaging states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const resetOtpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus OTP inputs when navigating to verification steps
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    } else if (step === 'forgot-reset') {
      setTimeout(() => resetOtpInputRef.current?.focus(), 150);
    }
  }, [step]);

  // Clean error message parser that never exposes raw HTML/DOCTYPE syntax
  const parseSafeErrorMessage = (rawError: string | null | undefined, fallback: string): string => {
    if (!rawError) return fallback;
    if (rawError.includes('<!DOCTYPE') || rawError.includes('<html') || rawError.includes('Unexpected token')) {
      return 'Connection error. Please check your network and try again.';
    }
    return rawError;
  };

  // =========================================================================
  // LOGIN STEP 1: Verify Email + Password Credentials
  // =========================================================================
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your developer admin email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your admin password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials. Please verify your email and password.');
      }

      // Store fallback preAuthToken for resilient 2FA
      if (data.preAuthToken) {
        setPreAuthToken(data.preAuthToken);
      }

      if (data.requireOtp) {
        setStep('otp');
        setOtpCode('');
        setPassword('');
        setResendCooldown(30);
        setInfoMessage('A 6-digit verification code has been dispatched to your registered admin email.');
        if (data.devOtp) setDevOtpHint(data.devOtp);
        return;
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(parseSafeErrorMessage(err?.message, 'Invalid credentials. Please check your email and password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // LOGIN STEP 2: Verify 6-Digit Email OTP
  // =========================================================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: cleanCode,
          email: email.trim().toLowerCase(),
          preAuthToken,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired verification code. Please try again.');
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(parseSafeErrorMessage(err?.message, 'Verification failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP code for 2FA login
  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, preAuthToken }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setResendCooldown(30);
      setInfoMessage('A new 6-digit verification code has been dispatched to your registered admin email.');
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch (err: any) {
      setErrorMessage(parseSafeErrorMessage(err?.message, 'Error resending verification code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // RECOVERY STEP 1: Request Password Reset Code
  // =========================================================================
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your developer admin email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset code. Please try again.');
      }

      setStep('forgot-reset');
      setResetOtpCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResendCooldown(30);
      setInfoMessage('A 6-digit verification code has been dispatched to your registered admin email.');
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch (err: any) {
      setErrorMessage(parseSafeErrorMessage(err?.message, 'Error requesting reset code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend reset code during recovery
  const handleResendResetCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch reset code.');
      }

      setResendCooldown(30);
      setInfoMessage('A new 6-digit reset code has been dispatched to your registered admin email.');
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch (err: any) {
      setErrorMessage(parseSafeErrorMessage(err?.message, 'Error resending reset code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // RECOVERY STEP 2: Verify Code & Set New Password
  // =========================================================================
  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = resetOtpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          newPassword,
        }),
      });

      let data: any = {};
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed. Please check the code and try again.');
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(parseSafeErrorMessage(err?.message, 'Password reset failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    setStep('password');
    setPassword('');
    setOtpCode('');
    setResetOtpCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  // Title and Step pill labels
  const getHeaderInfo = () => {
    switch (step) {
      case 'password':
        return { title: 'Admin Authentication', stepBadge: 'Step 1 of 2' };
      case 'otp':
        return { title: 'Two-Factor Authentication', stepBadge: 'Step 2 of 2' };
      case 'forgot-send':
        return { title: 'Reset Admin Password', stepBadge: 'Recovery 1 of 2' };
      case 'forgot-reset':
        return { title: 'Set New Password', stepBadge: 'Recovery 2 of 2' };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="dark min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400 shadow-xl shadow-indigo-950/50 mb-4">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Developer Administration
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            blendandbold.com/admin
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">
          
          {/* Card Top Indicator */}
          <div className="px-6 pt-5 pb-3 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span>{headerInfo.title}</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {headerInfo.stepBadge}
            </span>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-8 space-y-5">
            {/* Customer Conflict Warning (Email strictly omitted per privacy directive) */}
            {customerSessionConflict && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-start gap-2 font-bold text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>403 Restricted — Internal QuoteFlow Staff Only</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Your current session does not have Internal Admin permissions. Sign in below with an authorized Developer Admin account.
                </p>
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-300 hover:text-indigo-200 underline"
                >
                  &larr; Return to Customer Dashboard
                </a>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Info Message */}
            {infoMessage && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{infoMessage}</span>
              </div>
            )}

            {/* Dev Mode OTP Auto-fill Helper (development / testing only) */}
            {devOtpHint && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Security Code: <strong>{devOtpHint}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (step === 'forgot-reset') setResetOtpCode(devOtpHint);
                    else setOtpCode(devOtpHint);
                  }}
                  className="text-[11px] font-bold underline hover:text-white"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* ============================================================= */}
            {/* STEP 1: EMAIL & PASSWORD (Unified Single Login Tab)           */}
            {/* ============================================================= */}
            {step === 'password' && (
              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      autoFocus
                      data-force-dark-autofill="true"
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                      className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 pl-10 text-sm !text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                    />
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('forgot-send');
                        setErrorMessage(null);
                        setInfoMessage(null);
                        setDevOtpHint(null);
                      }}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      data-force-dark-autofill="true"
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                      className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 pl-10 pr-10 text-sm !text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                    />
                    <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ============================================================= */}
            {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION                         */}
            {/* ============================================================= */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-300 leading-relaxed">
                    A 6-digit security code has been dispatched to your registered admin email.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block text-center">
                    Enter 6-Digit Email Verification Code
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                    className="w-full h-14 rounded-xl border border-slate-700/80 bg-slate-950/90 px-4 text-center tracking-[0.45em] font-mono text-2xl font-bold !text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                  />
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || otpCode.trim().length !== 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying Security Code...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Verify & Enter Dashboard</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleBackToSignIn}
                      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to sign in</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSubmitting || resendCooldown > 0}
                      className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================= */}
            {/* RECOVERY STEP 1: REQUEST PASSWORD RESET CODE                   */}
            {/* ============================================================= */}
            {step === 'forgot-send' && (
              <form onSubmit={handleRequestResetCode} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="leading-relaxed">
                    Enter your developer admin email. We will send a 6-digit verification code to reset your password.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Admin Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      autoFocus
                      data-force-dark-autofill="true"
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                      className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 pl-10 text-sm !text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                    />
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending Reset Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Code</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-start text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleBackToSignIn}
                      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to sign in</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================= */}
            {/* RECOVERY STEP 2: VERIFY CODE & SET NEW PASSWORD                */}
            {/* ============================================================= */}
            {step === 'forgot-reset' && (
              <form onSubmit={handleCompletePasswordReset} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="leading-relaxed">
                    A 6-digit reset code has been sent to your email. Enter the code and set your new password.
                  </span>
                </div>

                {/* 6-Digit OTP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    ref={resetOtpInputRef}
                    type="text"
                    maxLength={6}
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                    className="w-full h-12 rounded-xl border border-slate-700/80 bg-slate-950/90 px-4 text-center tracking-[0.4em] font-mono text-xl font-bold !text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                  />
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                      data-force-dark-autofill="true"
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                      className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 pl-10 pr-10 text-sm !text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                    />
                    <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={6}
                      data-force-dark-autofill="true"
                      style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', colorScheme: 'dark' }}
                      className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 pl-10 pr-10 text-sm !text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 [color-scheme:dark] caret-white transition-all shadow-inner"
                    />
                    <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting || resetOtpCode.trim().length !== 6 || newPassword.length < 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Resetting Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Reset Password & Sign In</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={handleBackToSignIn}
                      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to sign in</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendResetCode}
                      disabled={isSubmitting || resendCooldown > 0}
                      className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-mono">
            <Lock className="h-3 w-3 text-slate-600" />
            <span>Strictly authorized developer administration</span>
          </p>
        </div>
      </div>
    </div>
  );
}
