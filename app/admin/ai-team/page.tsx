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
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminAITeamPage() {
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
      await fetch('/api/admin/auth/session', { method: 'DELETE' });
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Failed to logout admin', err);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-400 text-sm">Verifying Founder session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <DeveloperAdminGate
        hasPassword={hasPassword}
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
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black shadow-xs">
              QF
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                QuoteFlow AI Management
                <Bot className="h-3.5 w-3.5 text-indigo-600" />
              </span>
              <span className="text-[10px] text-slate-500 block">Autonomous Executive Team</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1"
          >
            &larr; Admin Overview
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-8 w-8 p-0 rounded-lg text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
        <AdminDashboardView theme={theme} defaultSection="admin_ai" defaultSubSection="ai_team" />
      </main>
    </div>
  );
}
