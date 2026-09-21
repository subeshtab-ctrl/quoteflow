'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Lock,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 1. Create verified account and company workspace via server API
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
        throw new Error(data.error || 'Failed to create account.');
      }

      // 2. Automatically sign in with client session
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
      setIsLoading(false);
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
            Create QuoteFlow Workspace
          </h1>
          <p className="text-xs text-slate-500">
            Start issuing digital quotations and capturing client signatures in minutes.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200 overflow-hidden">
          {success ? (
            <div className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-emerald-900">Workspace Ready!</h2>
              <p className="text-xs text-emerald-700">
                Your account has been created and verified. Entering your dashboard...
              </p>
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

                <div className="rounded-xl bg-indigo-50/70 p-2.5 text-xs text-indigo-900 border border-indigo-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Instant activation: No waiting for confirmation emails.</span>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                <Button type="submit" variant="primary" isLoading={isLoading} className="w-full shadow-md">
                  <span>Register & Launch Workspace</span>
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
