'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900">Reset Password</h1>
          <p className="text-xs text-slate-500">
            Enter your email and we will send password reset instructions.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200">
          {isSubmitted ? (
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Check your inbox</h3>
              <p className="text-xs text-slate-500">
                We sent a secure password reset link to <strong>{email}</strong>.
              </p>
              <Link href="/login" className="inline-block pt-2">
                <Button variant="outline" size="sm">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-4">
                <Input
                  label="Email Address *"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </CardContent>

              <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
                  Send Reset Link
                </Button>
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to sign in</span>
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
