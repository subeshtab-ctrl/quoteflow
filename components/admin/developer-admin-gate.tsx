'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeveloperAdminGateProps {
  onAuthenticated: () => void;
  initialHasPassword?: boolean;
}

export function DeveloperAdminGate({ onAuthenticated }: DeveloperAdminGateProps) {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fallback OTP Mode
  const [useOtpMode, setUseOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Handle standard email + password sign in
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your developer admin email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials. Please verify your email and password.');
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP dispatch fallback
  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email to receive a verification code.');
      return;
    }
    try {
      setIsSendingOtp(true);
      setErrorMessage(null);
      setInfoMessage(null);

      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setOtpSent(true);
      setInfoMessage('A 6-digit security code has been sent to your administrator address.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setErrorMessage(null);

      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification code invalid or expired.');
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
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
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5">
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

          {!useOtpMode ? (
            /* STANDARD EMAIL & PASSWORD LOGIN FORM */
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    autoFocus
                    required
                    className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm pl-9"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseOtpMode(true);
                      setErrorMessage(null);
                      setInfoMessage(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Use One-Time Code?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
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
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Developer Console</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* FALLBACK OTP / CODE VERIFICATION FORM */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Developer Email
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter developer email"
                    className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm pl-9"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {!otpSent ? (
                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    {isSendingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        <span>Send Security Code</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Enter 6-Digit Code
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      required
                      className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-600 text-center tracking-[0.5em] font-mono text-lg font-bold"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setUseOtpMode(false);
                    setErrorMessage(null);
                    setInfoMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  &larr; Back to Email & Password Login
                </button>
              </div>
            </div>
          )}
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
