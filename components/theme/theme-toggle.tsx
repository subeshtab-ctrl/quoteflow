'use client';

import React from 'react';
import { useTheme } from './theme-provider';
import { Sun, Moon, Laptop } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        title={`Current mode: ${resolvedTheme}. Click to toggle dark/light mode.`}
        aria-label="Toggle dark mode"
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
        ) : (
          <Moon className="h-4 w-4 text-slate-600 transition-transform rotate-0 scale-100" />
        )}
      </button>
    </div>
  );
}

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Moon className="h-3.5 w-3.5 text-indigo-400" />
        <span>Soft Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Laptop className="h-3.5 w-3.5 text-slate-400" />
        <span>System</span>
      </button>
    </div>
  );
}
