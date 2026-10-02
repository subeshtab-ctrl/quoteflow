'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DeveloperAdminGateProps {
  onAuthenticated: () => void;
  initialHasPassword?: boolean;
}

export function DeveloperAdminGate({
  onAuthenticated,
  initialHasPassword = false,
}: DeveloperAdminGateProps) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [authMode, setAuthMode] = useState<'password' | 'otp'>(
    initialHasPassword ? 'password' : 'otp'
  );

  // Password fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingInPassword, setIsLoggingInPassword] = useState(false);

  // OTP fields
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Set Password after verification
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Error / Info banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Fetch session status on mount to check if password exists
  useEffect(() => {
    fetch('/api/admin/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          onAuthenticated();
        } else {
          setHasPassword(data.hasPassword);
          if (data.hasPassword) {
            setAuthMode('password');
          } else {
            setAuthMode('otp');
          }
        }
      })
      .catch(() => {});
  }, [onAuthenticated]);

  // Handle password login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter your Developer Admin password.');
      return;
    }

    try {
      setIsLoggingInPassword(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const res = await fetch('/api/admin/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onAuthenticated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect password.');
    } finally {
      setIsLoggingInPassword(false);
    }
  };

  // Handle send OTP
  const handleSendOtp = async () => {
    try {
      setIsSendingOtp(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const res = await fetch('/api/admin/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'm.subesh@outlook.com' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setOtpSent(true);
      setInfoMsg('A 6-digit verification code has been dispatched to m.subesh@outlook.com.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification code invalid or expired.');
      }

      setOtpSuccess(true);
      // Immediately present the "password option after verification"
      setShowPasswordSetup(true);
      setInfoMsg('Verification successful! You can now set your Developer Admin password.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Save Password after verification
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please retype carefully.');
      return;
    }

    try {
      setIsSavingPassword(true);
      setErrorMsg(null);

      const res = await fetch('/api/admin/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set password.');
      }

      // Successfully saved password -> unlock console
      onAuthenticated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Top Icon and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400 shadow-xl shadow-indigo-950/50 mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Developer Administration
          </h1>
          <p className="text-xs font-mono text-indigo-300/80 mt-1">
            www.blendandbold.com/admin
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 font-medium mt-3">
            <Lock className="h-3 w-3 text-indigo-400" />
            <span>Strictly Developer Admin:</span>
            <span className="font-semibold text-white">m.subesh@outlook.com</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Info Message */}
          {infoMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* SCENARIO 1: POST-VERIFICATION PASSWORD SETUP */}
          {showPasswordSetup ? (
            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Email Identity Verified!</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Set your Developer Admin password now. You can use this password to unlock this console directly anytime.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  New Developer Admin Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                />
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  {isSavingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Save Password & Unlock Console</span>
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => onAuthenticated()}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5"
                >
                  Skip for now and enter console &rarr;
                </button>
              </div>
            </form>
          ) : authMode === 'password' && hasPassword ? (
            /* SCENARIO 2: PASSWORD LOGIN */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Developer Account
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value="m.subesh@outlook.com"
                    readOnly
                    disabled
                    className="bg-slate-950/50 border-slate-800 text-slate-400 font-mono text-xs pl-9 cursor-not-allowed select-none"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300">
                    Developer Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('otp');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot or use OTP?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    autoFocus
                    required
                    className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 text-sm pl-9 pr-10"
                  />
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoggingInPassword}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  {isLoggingInPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Unlock Developer Console</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('otp');
                    setErrorMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Sign in using Email Verification Code &rarr;
                </button>
              </div>
            </form>
          ) : (
            /* SCENARIO 3: EMAIL OTP VERIFICATION FLOW */
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Developer Account
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    value="m.subesh@outlook.com"
                    readOnly
                    disabled
                    className="bg-slate-950/50 border-slate-800 text-slate-400 font-mono text-xs pl-9 cursor-not-allowed select-none"
                  />
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              {!otpSent ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Click below to generate and send a 6-digit cryptographic verification code to your Outlook address.
                  </p>
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
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300">
                        Enter 6-Digit Code
                      </label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Resend</span>
                      </button>
                    </div>
                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      required
                      className="bg-slate-950/70 border-slate-700 text-white tracking-[0.5em] text-center font-mono text-lg font-bold"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </Button>
                </form>
              )}

              {hasPassword && (
                <div className="pt-2 border-t border-slate-800/80 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('password');
                      setErrorMsg(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    &larr; Return to Password Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security Footer Notice */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-500">
            Protected endpoint &bull; All unauthorized access attempts are monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
