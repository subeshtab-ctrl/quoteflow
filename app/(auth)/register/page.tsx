'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationSent, setIsVerificationSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        // If Supabase is not configured, redirect to dashboard
        router.push('/dashboard');
        return;
      }

      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;
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

      // If user created, show verification pending screen
      if (data.user) {
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

  const handleResendEmail = async () => {
    setError(null);
    setIsResending(true);
    setResendSuccess(false);

    try {
      const supabase = createClient();
      if (supabase) {
        const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (resendError) throw resendError;
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
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
            {isVerificationSent ? 'Verify Your Email' : 'Create QuoteFlow Account'}
          </h1>
          <p className="text-xs text-slate-500">
            {isVerificationSent
              ? 'Almost done! Check your inbox to activate your business workspace.'
              : 'Start issuing digital quotations and capturing client signatures in minutes.'}
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
          {isVerificationSent ? (
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
                <Mail className="h-8 w-8 text-indigo-600" />
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Verification Email Sent
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We have sent an activation link to:
                </p>
                <div className="inline-block font-mono text-sm font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                  {email}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 text-left space-y-1.5">
                <p className="font-semibold text-slate-700">Next steps:</p>
                <p>1. Open your email client and check your inbox.</p>
                <p>2. Click the verification link to confirm your account.</p>
                <p>3. If you don't see the email, check your spam or promotions folder.</p>
              </div>

              {resendSuccess && (
                <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Verification link resent successfully!</span>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  isLoading={isResending}
                  className="w-full text-xs gap-1.5 shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Resend Verification Email</span>
                </Button>

                <Link href="/login" className="block">
                  <Button variant="primary" className="w-full shadow-md gap-1.5">
                    <span>Go to Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
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
                  <span>Complete Registration</span>
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
