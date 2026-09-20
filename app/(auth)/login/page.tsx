'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@apextechnologies.io');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate instantaneous authentication & redirect to dashboard
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-200">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900">Sign in to QuoteFlow</h1>
          <p className="text-xs text-slate-500">
            Enter your credentials to access your organization dashboard.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200">
          <form onSubmit={handleLogin}>
            <CardContent className="p-6 space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 border border-indigo-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Demo account prefilled for immediate evaluation.</span>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 flex flex-col gap-3">
              <Button type="submit" variant="primary" isLoading={isLoading} className="w-full shadow-md">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>

              <p className="text-center text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-indigo-600 font-semibold hover:underline">
                  Register Organization
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
