'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Lock,
  Sparkles,
  Send,
  ExternalLink,
} from 'lucide-react';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStaffError, setIsStaffError] = useState(false);
  const [userAlreadyExists, setUserAlreadyExists] = useState(false);

  // Verification link dispatched state
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsStaffError(false);
    setUserAlreadyExists(false);
    setIsLoading(true);

    try {
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
        if (data.error?.toLowerCase().includes('team member') || data.error?.toLowerCase().includes('staff accounts cannot register')) {
          setIsStaffError(true);
        } else if (res.status === 409 || data.error?.toLowerCase().includes('already exists')) {
          setUserAlreadyExists(true);
        }
        throw new Error(data.error || 'Registration failed. Please check your information.');
      }

      setVerificationLink(data.verificationLink || null);
      setVerificationSent(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f19] p-4 py-8 transition-colors">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-color,#4f46e5)] text-white font-black text-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Create Company Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Register your company to generate professional quotations and digital approval links.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden">
          {verificationSent ? (
            /* Post-Registration Verification Notice */
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-inner">
                <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Verification Link Sent!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We have sent an activation link to:
                </p>
                <p className="text-sm font-semibold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 py-1.5 px-3 rounded-lg inline-block">
                  {email}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <span>Next Step: Activate Your Workspace</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Please check your inbox (and spam folder). Click the verification link to confirm your email and set up your company details, logo, and quotations.
                </p>
              </div>

              {/* Verification Actions */}
              <div className="pt-2 space-y-3">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 text-left flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Email validation is required before you can access your company workspace. Please open the email we just sent you to verify.
                  </span>
                </div>

                <Link
                  href={`/login?email=${encodeURIComponent(email)}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-color,#4f46e5)] hover:brightness-105 active:brightness-95 text-white py-3 px-4 text-xs font-semibold shadow-md transition-all"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <div className="pt-1 text-center text-xs text-slate-400">
                  Didn&apos;t receive the email?{' '}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/send-verification-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: email.trim() }),
                        });
                        alert('Verification link resent! Please check your inbox.');
                      } catch {
                        alert('Failed to resend. Please try again in a few moments.');
                      }
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Resend Verification Link
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <div className="p-6 space-y-5">
              {/* Google Sign Up */}
              <div className="space-y-3">
                <GoogleSignInButton mode="signup" />

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2.5 text-slate-400 dark:text-slate-500 font-bold tracking-wider">
                      Or register with email
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Notification */}
              {error && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>

                  {isStaffError ? (
                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/60">
                      <Link
                        href={`/login?email=${encodeURIComponent(email)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-xs"
                      >
                        <span>Sign In to Your Company Workspace →</span>
                      </Link>
                    </div>
                  ) : userAlreadyExists ? (
                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/60">
                      <Link
                        href={`/login?email=${encodeURIComponent(email)}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 shadow-xs"
                      >
                        <span>Sign In with Password →</span>
                      </Link>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Standard Email Registration Form */}
              <form onSubmit={handleRegister} className="space-y-3.5">
                <Input
                  label="Your Full Name *"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  required
                />

                <Input
                  label="Company / Business Name *"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Blend & Bold Inc."
                  required
                />

                <Input
                  label="Work Email *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />

                <Input
                  label="Password *"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />

                <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 text-xs text-indigo-900 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>A verification link will be sent to your email to activate your workspace.</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full shadow-md mt-2"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  <span>Register & Send Verification Link</span>
                </Button>
              </form>

              {/* Bottom Sign In Link */}
              <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
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
