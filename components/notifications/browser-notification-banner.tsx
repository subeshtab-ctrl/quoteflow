'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, Sparkles } from 'lucide-react';
import {
  isBrowserNotificationSupported,
  getBrowserNotificationPermission,
  isNotificationPromptDismissed,
  dismissNotificationPrompt,
  requestBrowserNotificationPermission,
} from '@/lib/notifications/browser-notification-service';

export function BrowserNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [grantedMessage, setGrantedMessage] = useState(false);

  useEffect(() => {
    if (!isBrowserNotificationSupported()) return;
    if (isNotificationPromptDismissed()) return;

    const perm = getBrowserNotificationPermission();
    if (perm === 'default') {
      // Delay slightly for smooth login experience
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    const result = await requestBrowserNotificationPermission();
    setIsRequesting(false);
    if (result === 'granted') {
      setGrantedMessage(true);
      setTimeout(() => setVisible(false), 2400);
    } else {
      dismissNotificationPrompt();
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    dismissNotificationPrompt();
    setVisible(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/90 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/40 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
            {grantedMessage ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            ) : (
              <Bell className="h-5 w-5 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {grantedMessage
                  ? 'Smart Notifications Enabled!'
                  : 'Turn on Smart Browser Notifications'}
              </h4>
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 border border-indigo-200 dark:border-indigo-800">
                Real-Time
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {grantedMessage
                ? 'You will receive immediate alerts for quote views, client approvals, and payments.'
                : 'Get prioritized alerts when clients view or sign quotes, when invoices are overdue, or when payments arrive.'}
            </p>
          </div>
        </div>

        {!grantedMessage && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={handleDismiss}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isRequesting ? 'Enabling...' : 'Enable Notifications'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
