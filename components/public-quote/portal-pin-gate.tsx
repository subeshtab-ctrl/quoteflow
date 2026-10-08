'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

interface PortalPinGateProps {
  token: string;
  quotationNumber: string;
  companyName: string;
  hasPin?: boolean;
  authMethod?: string;
  phoneCountryCode?: string;
  customerPhoneMasked?: string;
  customerEmailMasked?: string;
  onAuthenticated: (authSecret?: string) => void;
}

export function PortalPinGate({
  token,
  quotationNumber,
  companyName,
  onAuthenticated,
}: PortalPinGateProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isLocked) return;

    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError('Please enter the 6-digit access PIN.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/public/portal-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          pin: cleanPin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setIsLocked(true);
        }
        throw new Error(data.error || 'Incorrect PIN. Please try again.');
      }

      onAuthenticated(data.secret);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric / digits, max 8 chars
    const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '').slice(0, 8);
    setPin(val);
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md bg-slate-850/90 dark:bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Security Icon Badge */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/10">
          <Lock className="h-6 w-6" />
        </div>

        {/* Header Info */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>PIN-Protected Quotation</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Quotation {quotationNumber}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
            This proposal from <span className="text-slate-200 font-semibold">{companyName}</span> is protected with a security PIN. Enter the PIN provided to view.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5 text-left animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* PIN Entry Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={8}
              value={pin}
              onChange={handlePinChange}
              placeholder="••••••"
              disabled={loading || isLocked}
              autoFocus
              className="w-full text-center tracking-[0.4em] font-mono text-2xl font-bold py-3.5 px-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading || isLocked || pin.length < 4}
            className="w-full py-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying PIN...</span>
              </>
            ) : (
              <>
                <span>Unlock Quotation</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Footer Security Note */}
        <p className="text-[11px] text-slate-500">
          Secured by QuoteFlow. No account or password required.
        </p>
      </div>
    </div>
  );
}
