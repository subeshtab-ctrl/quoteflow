'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building,
  UserCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in link. Please verify your link.');
      setIsLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/users/invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid or expired invitation link.');
        }

        setInvitation(data.invitation);
        setFullName(data.invitation.fullName || '');
      } catch (err: any) {
        setError(err.message || 'Failed to validate invitation.');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/users/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      // Auto login with Supabase
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Error setting password.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-4 rounded-2xl shadow-xl border-slate-200">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Invitation Link Invalid</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary" className="w-full">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Join {invitation?.companyName || 'Team'}
          </h1>
          <p className="text-xs text-slate-500">
            You&apos;ve been invited to join <strong>{invitation?.companyName}</strong> on QuoteFlow as a <strong>{invitation?.role}</strong>. Set your password to get started.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
          {success ? (
            <div className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-emerald-900">Account Activated!</h2>
              <p className="text-xs text-emerald-700">
                You are now signed into {invitation?.companyName}&apos;s workspace. Entering dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email (Invitation)
                </label>
                <input
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs text-slate-500 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Verma"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={6}
                />
              </div>

              <div className="rounded-xl bg-indigo-50/70 p-2.5 text-xs text-indigo-900 border border-indigo-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  You will have access to <strong>{invitation?.companyName}</strong>&apos;s quotations and customers.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full shadow-md mt-2"
              >
                <span>Activate Account & Enter Workspace</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
