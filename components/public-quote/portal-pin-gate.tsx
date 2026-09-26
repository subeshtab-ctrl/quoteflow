'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface PortalPinGateProps {
  token: string;
  quotationNumber: string;
  companyName: string;
  hasPin: boolean;
  customerEmailMasked?: string;
  onAuthenticated: () => void;
}

export function PortalPinGate({
  token,
  quotationNumber,
  companyName,
  hasPin: initialHasPin,
  customerEmailMasked,
  onAuthenticated,
}: PortalPinGateProps) {
  const [mode, setMode] = useState<'VERIFY' | 'REGISTER_EMAIL' | 'REGISTER_PIN' | 'RESET'>(
    initialHasPin ? 'VERIFY' : 'REGISTER_EMAIL'
  );

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Step 1: Verify Email for First-Time Registration
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/public/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'check_email',
          email: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Email does not match quotation records');
      }

      setMode('REGISTER_PIN');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Register 6-Digit PIN
  const handleRegisterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setError('PIN must be exactly 6 digits (numbers 0-9 only).');
      return;
    }

    if (cleanPin !== confirmPin.trim()) {
      setError('PIN confirmation does not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/public/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'register',
          email: email.trim(),
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register PIN');
      }

      setSuccessMsg('Security PIN registered! Unlocking portal...');
      setTimeout(() => {
        onAuthenticated();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Returning Client: Verify 6-Digit PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setError('Please enter your complete 6-digit PIN.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/public/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'verify',
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect 6-digit PIN. Please try again.');
      }

      setSuccessMsg('Access granted! Loading quotation...');
      setTimeout(() => {
        onAuthenticated();
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset PIN with Registered Email
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your registered email.');
      return;
    }

    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      setError('New PIN must be exactly 6 digits (numbers 0-9 only).');
      return;
    }

    if (cleanPin !== confirmPin.trim()) {
      setError('PIN confirmation does not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/public/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'reset',
          email: email.trim(),
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset PIN');
      }

      setSuccessMsg('PIN updated successfully! Unlocking portal...');
      setTimeout(() => {
        onAuthenticated();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Client Portal Security
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {companyName} • <span className="font-semibold text-slate-700 dark:text-slate-300">{quotationNumber}</span>
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p className="font-medium">{successMsg}</p>
          </div>
        )}

        {/* MODE 1: Enter 6-Digit PIN (Returning Customer) */}
        {mode === 'VERIFY' && (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Enter 6-Digit Access PIN
              </label>
              {customerEmailMasked && (
                <p className="text-[11px] text-slate-400">
                  Registered for account: <span className="font-mono text-slate-600 dark:text-slate-300">{customerEmailMasked}</span>
                </p>
              )}
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || pin.length !== 6}
              isLoading={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              <span>Unlock Quotation</span>
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPin('');
                  setConfirmPin('');
                  setMode('RESET');
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Forgot your PIN? Reset with registered email
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: First-Time Setup - Step 1 Email Match Verification */}
        {mode === 'REGISTER_EMAIL' && (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-indigo-600" />
                  First Time Setup
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Please enter the email address where this quotation was received to establish your secure 6-digit access PIN.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@company.com"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              isLoading={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md"
            >
              <span>Verify Email</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>
        )}

        {/* MODE 3: First-Time Setup - Step 2 Set 6-Digit PIN */}
        {mode === 'REGISTER_PIN' && (
          <form onSubmit={handleRegisterPin} className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-[11px]">
                  Email verified! Now create your 6-digit access PIN for future visits.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Create 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  autoFocus
                  required
                  className="w-full text-center tracking-[0.4em] text-xl font-mono py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Confirm 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  required
                  className="w-full text-center tracking-[0.4em] text-xl font-mono py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
              isLoading={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              <span>Save PIN & Access Portal</span>
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setPin('');
                setConfirmPin('');
                setMode('REGISTER_EMAIL');
              }}
              className="w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-center"
            >
              Change Email
            </button>
          </form>
        )}

        {/* MODE 4: Reset PIN */}
        {mode === 'RESET' && (
          <form onSubmit={handleResetPin} className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold mb-1">Reset Your Security PIN</p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Enter your registered client email to reset your 6-digit access PIN.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com"
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  New 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  required
                  className="w-full text-center tracking-[0.4em] text-xl font-mono py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  required
                  className="w-full text-center tracking-[0.4em] text-xl font-mono py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || pin.length !== 6 || confirmPin.length !== 6 || !email.trim()}
              isLoading={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span>Reset PIN & Unlock</span>
            </Button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setPin('');
                setConfirmPin('');
                setMode('VERIFY');
              }}
              className="w-full text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-center"
            >
              Back to PIN Access
            </button>
          </form>
        )}

        {/* Security badge footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            <span>256-Bit Encrypted Client Approval Portal</span>
          </p>
        </div>
      </div>
    </div>
  );
}
