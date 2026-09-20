'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Building2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
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
          <h1 className="text-2xl font-black text-slate-900">Create QuoteFlow Account</h1>
          <p className="text-xs text-slate-500">
            Start issuing digital quotations and capturing client signatures in minutes.
          </p>
        </div>

        <Card className="rounded-2xl shadow-xl border-slate-200">
          <form onSubmit={handleRegister}>
            <CardContent className="p-6 space-y-3.5">
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
        </Card>
      </div>
    </div>
  );
}
