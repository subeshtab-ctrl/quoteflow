'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, ExternalLink, HelpCircle } from 'lucide-react';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
  className?: string;
  redirect?: string;
  onError?: (error: string) => void;
}

export function GoogleSignInButton({
  mode = 'signin',
  className = '',
  redirect = '/dashboard',
  onError,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsSetupNeeded(false);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Authentication client could not be initialized.');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectUrl = `${origin}/auth/callback?next=${encodeURIComponent(redirect || '/dashboard')}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes('provider is not enabled') || lower.includes('not supported') || lower.includes('unsupported provider')) {
          setIsSetupNeeded(true);
          const setupMsg = 'Google authentication is not yet enabled in your Supabase project dashboard.';
          setErrorMsg(setupMsg);
          onError?.(setupMsg);
          setIsLoading(false);
          return;
        }
        throw error;
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      const msg = err.message || 'Failed to initialize Google sign in.';
      setErrorMsg(msg);
      onError?.(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {isSetupNeeded && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-100">
                Google Sign-In Needs Activation in Supabase
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                To enable Google login, turn on Google in your Supabase dashboard:
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-2.5 text-[11px] space-y-1.5 border border-amber-200/60 dark:border-amber-800/60 font-mono text-slate-700 dark:text-slate-300">
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100">1.</span> Open{' '}
              <a
                href="https://supabase.com/dashboard/project/qykxxxayympfhbymmnnw/auth/providers"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 underline font-semibold inline-flex items-center gap-0.5"
              >
                Supabase Auth Providers <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100">2.</span> Turn on <strong className="text-slate-900 dark:text-slate-100">Google</strong> &amp; paste your Google Client ID &amp; Secret
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100">3.</span> Redirect URI in Google Cloud Console:{' '}
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded select-all break-all">
                https://qykxxxayympfhbymmnnw.supabase.co/auth/v1/callback
              </span>
            </div>
          </div>
        </div>
      )}

      {errorMsg && !isSetupNeeded && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-60 cursor-pointer"
      >
        {isLoading ? (
          <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
      </button>
    </div>
  );
}
