'use client';

import React, { useState, useEffect } from 'react';
import { DeveloperAdminGate } from '@/components/admin/developer-admin-gate';
import { AdminDashboardView } from '@/components/admin/admin-dashboard-view';
import {
  ShieldCheck,
  KeyRound,
  LogOut,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import Link from 'next/link';

export default function DeveloperAdminCustomersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [adminActor, setAdminActor] = useState<any>(null);
  const [customerConflict, setCustomerConflict] = useState<{ conflict: boolean; email: string | null }>({
    conflict: false,
    email: null,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    const saved = localStorage.getItem('quoteflow_admin_theme') as 'dark' | 'light';
    if (saved) {
      setTheme(saved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('quoteflow_admin_theme', next);
  };

  const checkSession = async () => {
    try {
      const res = await fetch('/api/admin/auth/session');
      const data = await res.json();
      setIsAuthenticated(Boolean(data.authenticated));
      setHasPassword(Boolean(data.hasPassword));
      if (data.actor) setAdminActor(data.actor);
      setCustomerConflict({
        conflict: Boolean(data.customerSessionConflict),
        email: data.customerEmail || null,
      });
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const handleLock = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs font-mono">Verifying Developer Admin access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <DeveloperAdminGate
        initialHasPassword={hasPassword}
        customerSessionConflict={customerConflict.conflict}
        customerEmail={customerConflict.email}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          checkSession();
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      } flex flex-col selection:bg-indigo-500 selection:text-white`}
    >
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-md px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          theme === 'dark'
            ? 'border-slate-800 bg-slate-900/95 text-white'
            : 'border-slate-200/80 bg-white/95 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-xs hover:scale-105 transition-transform">
            <ShieldCheck className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-bold text-sm tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                QuoteFlow Developer Admin — Global Customers
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Ops
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Authenticated as{' '}
              <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}>
                {adminActor?.email || 'Developer Staff'}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className={`text-xs gap-1.5 transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLock}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Lock</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <AdminDashboardView theme={theme} defaultSection="businesses" defaultSubSection="all" />
      </main>
    </div>
  );
}
