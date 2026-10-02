'use client';

import React, { useState, useEffect } from 'react';
import { DeveloperAdminGate } from '@/components/admin/developer-admin-gate';
import { AdminDashboardView } from '@/components/admin/admin-dashboard-view';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  LogOut,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

  // Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Check auth session on load
  const checkSession = async () => {
    try {
      const res = await fetch('/api/admin/auth/session');
      const data = await res.json();
      setIsAuthenticated(Boolean(data.authenticated));
      setHasPassword(Boolean(data.hasPassword));
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Handle Logout / Lock
  const handleLock = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
  };

  // Handle Save / Update Password from inside the console
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      setIsSavingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(null);

      const res = await fetch('/api/admin/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPasswordSuccess('Developer Admin password saved successfully!');
      setHasPassword(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-xs font-mono">Verifying Developer Admin access...</p>
      </div>
    );
  }

  // Not authenticated: render the secure gate
  if (!isAuthenticated) {
    return (
      <DeveloperAdminGate
        initialHasPassword={hasPassword}
        onAuthenticated={() => {
          setIsAuthenticated(true);
          checkSession();
        }}
      />
    );
  }

  // Authenticated Developer Admin Console
  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      } flex flex-col selection:bg-indigo-500 selection:text-white`}
    >
      {/* Developer Admin Header Bar */}
      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-colors ${
          theme === 'dark'
            ? 'border-slate-800 bg-slate-900/90 text-white'
            : 'border-slate-200 bg-white/90 text-slate-900 shadow-xs'
        }`}
      >
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`font-bold text-sm tracking-tight ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}
              >
                QuoteFlow Developer Console
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                www.blendandbold.com/admin
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Lock className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
              <span>Developer Account:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                m.subesh@outlook.com
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            className={`text-xs gap-1.5 transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-600" />
                <span>Dark Mode</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPasswordModalOpen(true);
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
            className={`text-xs gap-1.5 ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>{hasPassword ? 'Change Password' : 'Set Password'}</span>
          </Button>

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className={`text-xs gap-1.5 ${
                theme === 'dark'
                  ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
              }`}
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              <span>Customer App</span>
            </Button>
          </Link>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLock}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs gap-1.5 shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Lock Console</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <AdminDashboardView theme={theme} />
      </main>

      {/* Modal: Set / Change Password */}
      {passwordModalOpen && (
        <Modal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          title="Developer Admin Password"
        >
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Configure or update the master password for <strong className="text-slate-700 dark:text-slate-200">m.subesh@outlook.com</strong> to unlock this console directly.
            </p>

            {passwordError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                required
                className="text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSavingPassword}
                className="gap-2"
              >
                {isSavingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Save Password</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
