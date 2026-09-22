'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

interface GoogleSignInButtonProps {
  mode?: 'signin' | 'signup';
  className?: string;
  onError?: (error: string) => void;
}

export function GoogleSignInButton({
  mode = 'signin',
  className = '',
  onError,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      if (!supabase) {
        throw new Error('Supabase client could not be initialized.');
      }

      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;

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
        if (error.message.toLowerCase().includes('provider is not enabled') || error.message.toLowerCase().includes('not supported')) {
          const setupMsg = 'Google sign-in is not enabled yet in your Supabase project. In Supabase Dashboard -> Authentication -> Providers, turn on Google provider with your Google Client ID.';
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
    <div className={`space-y-2 ${className}`}>
      {errorMsg && (
        <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Google Provider Setup Required</p>
            <p className="text-[11px] leading-relaxed text-amber-800">{errorMsg}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-60 cursor-pointer"
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
