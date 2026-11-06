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
import { Input } from '@/components/ui/input';

interface DeveloperAdminGateProps {
  onAuthenticated: () => void;
  initialHasPassword?: boolean;
  hasPassword?: boolean;
  customerSessionConflict?: boolean;
  customerEmail?: string | null;
}

export function DeveloperAdminGate({
  onAuthenticated,
  customerSessionConflict,
  customerEmail,
}: DeveloperAdminGateProps) {
  // Active login tab: 'email-otp' or 'password'
  const [activeTab, setActiveTab] = useState<'email-otp' | 'password'>('password');

  // Step state for password tab: 'password' (Step 1) -> 'otp' (Step 2)
  const [step, setStep] = useState<'password' | 'otp'>('password');

  // Step state for email-otp tab: 'send' (enter email) -> 'verify' (enter code)
  const [otpTabStep, setOtpTabStep] = useState<'send' | 'verify'>('send');

  // Shared state
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Password state (Step 1 of password tab)
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Email OTP state (Step 2 of password tab / email-otp tab)
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const otpTabInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus OTP input when transitioning to Step 2 (password tab)
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => { otpInputRef.current?.focus(); }, 100);
    }
  }, [step]);

  // Focus OTP input when transitioning to verify step (email-otp tab)
  useEffect(() => {
    if (otpTabStep === 'verify') {
      setTimeout(() => { otpTabInputRef.current?.focus(); }, 100);
    }
  }, [otpTabStep]);

  // Reset all state when switching tabs
  const handleTabSwitch = (tab: 'email-otp' | 'password') => {
    setActiveTab(tab);
    setStep('password');
    setOtpTabStep('send');
    setOtpCode('');
    setPassword('');
    setErrorMessage(null);
    setInfoMessage(null);
    setDevOtpHint(null);
    setResendCooldown(0);
  };

  // =========================================================================
  // PASSWORD TAB — STEP 1: Normal Password Login
  // =========================================================================
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setErrorMessage('Please enter your developer admin email.'); return; }
    if (!password) { setErrorMessage('Please enter your password.'); return; }

    try {
      setIsSubmittingPassword(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials. Please verify your email and password.');

      if (data.requireOtp) {
        setStep('otp');
        setOtpCode('');
        setPassword('');
        setResendCooldown(30);
        setInfoMessage(data.message || `Password verified! A 6-digit security code has been sent to ${cleanEmail}.`);
        if (data.devOtp) setDevOtpHint(data.devOtp);
        return;
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // =========================================================================
  // PASSWORD TAB — STEP 2: Email OTP Verification
  // =========================================================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) { setErrorMessage('Please enter the full 6-digit verification code.'); return; }

    try {
      setIsVerifyingOtp(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: cleanCode, email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification code invalid or expired. Please check your email.');

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP (used in both tabs)
  const handleResendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;

    try {
      setIsSendingOtp(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch verification code.');

      setResendCooldown(30);
      setInfoMessage(data.message || `A new 6-digit security code has been sent to ${cleanEmail}.`);
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resending verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // =========================================================================
  // EMAIL OTP TAB — STEP 1: Send OTP directly (no password required)
  // =========================================================================
  const handleSendOtpDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setErrorMessage('Please enter your developer admin email.'); return; }

    try {
      setIsSendingOtp(true);
      setErrorMessage(null);
      setInfoMessage(null);
      setDevOtpHint(null);

      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');

      setOtpTabStep('verify');
      setOtpCode('');
      setResendCooldown(30);
      setInfoMessage(data.message || `A 6-digit security code has been sent to ${cleanEmail}.`);
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // EMAIL OTP TAB — STEP 2: Verify OTP (same as password tab step 2)
  const handleVerifyOtpDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6) { setErrorMessage('Please enter the full 6-digit verification code.'); return; }

    try {
      setIsVerifyingOtp(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: cleanCode, email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification code invalid or expired. Please check your email.');

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleBackToPassword = () => {
    setStep('password');
    setOtpCode('');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleBackToOtpSend = () => {
    setOtpTabStep('send');
    setOtpCode('');
    setErrorMessage(null);
    setInfoMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      {/* Ambient background lighting */}
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
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">

          {/* ─── TAB BAR ─── */}
          <div className="flex border-b border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={() => handleTabSwitch('email-otp')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all ${
                activeTab === 'email-otp'
                  ? 'bg-slate-800/80 text-white border-b-2 border-indigo-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Email OTP</span>
              {activeTab === 'email-otp' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('password')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all ${
                activeTab === 'password'
                  ? 'bg-blue-600/20 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Master Password</span>
            </button>
          </div>

          {/* ─── CARD BODY ─── */}
          <div className="p-6 sm:p-8 space-y-5">

            {/* Customer Conflict Warning */}
            {customerSessionConflict && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-start gap-2 font-bold text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>403 Restricted — Internal QuoteFlow Staff Only</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  Your current customer session (<strong>{customerEmail}</strong>) does not have Internal Admin permissions. Sign in below with an authorized Developer Admin account.
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
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Info Message */}
            {infoMessage && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Dev Mode OTP Auto-fill Helper */}
            {devOtpHint && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Security Code: <strong>{devOtpHint}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devOtpHint)}
                  className="text-[11px] font-bold underline hover:text-white"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* ============================================================= */}
            {/* EMAIL OTP TAB                                                  */}
            {/* ============================================================= */}
            {activeTab === 'email-otp' && (
              <>
                {/* Sub-step: Enter email & send OTP */}
                {otpTabStep === 'send' && (
                  <form onSubmit={handleSendOtpDirect} className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Enter your admin email address to receive a one-time verification code. No password required.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Email Address</label>
                      <div className="relative">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@example.com"
                          required
                          autoFocus
                          className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm pl-9"
                        />
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      </div>
                    </div>

                    <div className="pt-1">
                      <Button
                        type="submit"
                        disabled={isSendingOtp}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                      >
                        {isSendingOtp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending Code...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Send Verification Code</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Sub-step: Enter OTP */}
                {otpTabStep === 'verify' && (
                  <form onSubmit={handleVerifyOtpDirect} className="space-y-4">
                    {/* Recipient preview */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleBackToOtpSend}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline shrink-0 ml-2"
                      >
                        Change
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block text-center">
                        Enter 6-Digit Verification Code
                      </label>
                      <Input
                        ref={otpTabInputRef}
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        required
                        className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-600 text-center tracking-[0.5em] font-mono text-2xl font-bold py-3"
                      />
                    </div>

                    <div className="pt-1 space-y-2.5">
                      <Button
                        type="submit"
                        disabled={isVerifyingOtp || otpCode.trim().length !== 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Verifying Code...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>Verify & Enter Dashboard</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={handleBackToOtpSend}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          <span>Use Email OTP instead?</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSendingOtp || resendCooldown > 0}
                          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                          <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* ============================================================= */}
            {/* MASTER PASSWORD TAB                                            */}
            {/* ============================================================= */}
            {activeTab === 'password' && (
              <>
                {/* Step 1: Password */}
                {step === 'password' && (
                  <form onSubmit={handlePasswordSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Email Address</label>
                      <div className="relative">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@example.com"
                          required
                          className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm pl-9"
                        />
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">Password</label>
                        <button
                          type="button"
                          onClick={() => handleTabSwitch('email-otp')}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Use Email OTP instead?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          required
                          autoFocus
                          className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm pl-9 pr-10"
                        />
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isSubmittingPassword}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                      >
                        {isSubmittingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Verifying Credentials...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In with Password</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Step 2: Email OTP verification after password */}
                {step === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {/* Step indicator */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Two-Factor Authentication</span>
                      </span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
                        Step 2 of 2
                      </span>
                    </div>

                    {/* Recipient notice */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="truncate text-slate-400">Security code sent to your registered admin email</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleBackToPassword}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline shrink-0 ml-2"
                      >
                        Back
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block text-center">
                        Enter 6-Digit Email Verification Code
                      </label>
                      <Input
                        ref={otpInputRef}
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        autoFocus
                        required
                        className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-600 text-center tracking-[0.5em] font-mono text-2xl font-bold py-3"
                      />
                    </div>

                    <div className="pt-2 space-y-2.5">
                      <Button
                        type="submit"
                        disabled={isVerifyingOtp || otpCode.trim().length !== 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                      >
                        {isVerifyingOtp ? (
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

                      <div className="flex items-center justify-between pt-2 text-xs">
                        <button
                          type="button"
                          onClick={handleBackToPassword}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <ArrowLeft className="h-3 w-3" />
                          <span>Back to password</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isSendingOtp || resendCooldown > 0}
                          className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                          <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}

          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3 text-slate-600" />
            <span>Strictly authorized developer administration</span>
          </p>
        </div>
      </div>
    </div>
  );
}
