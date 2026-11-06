'use client';

import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface CurrencyInfo {
  symbol: string;
  code: string;
  label: string;
}

const CURRENCIES: CurrencyInfo[] = [
  { symbol: '₹', code: 'INR', label: 'Indian Rupee' },
  { symbol: '$', code: 'USD', label: 'US Dollar' },
  { symbol: '€', code: 'EUR', label: 'Euro' },
  { symbol: '£', code: 'GBP', label: 'British Pound' },
  { symbol: '¥', code: 'JPY', label: 'Japanese Yen' },
  { symbol: '⃃', code: 'AED', label: 'UAE Dirham' },
];

export function AnimatedCurrencyTicker({ className = '' }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % CURRENCIES.length);
        setIsTransitioning(false);
      }, 350);
    }, 2800);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const current = CURRENCIES[currentIndex];

  // If user prefers reduced motion, render clean static badge showing supported currencies
  if (prefersReducedMotion) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200/90 bg-white/80 backdrop-blur-xs text-xs font-semibold text-slate-700 shadow-2xs ${className}`}
      >
        <Globe className="h-3.5 w-3.5 text-indigo-600" />
        <span className="text-slate-500 font-medium">Global Multi-Currency:</span>
        <span className="font-mono font-bold tracking-wider text-indigo-700">₹ $ € £ ¥ ⃃</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-indigo-100/90 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50/80 backdrop-blur-xs text-xs font-medium text-slate-700 shadow-2xs hover:border-indigo-300 transition-all ${className}`}
      title={`QuoteFlow supports multi-currency: ${current.label} (${current.code})`}
    >
      <div className="flex items-center gap-1.5 text-indigo-700 font-semibold">
        <Globe className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Multi-Currency</span>
      </div>

      <div className="h-3.5 w-[1px] bg-slate-200" />

      {/* Animated Currency Slot with gentle vertical shift, fade & blur */}
      <div className="relative h-5 min-w-[72px] overflow-hidden flex items-center">
        <div
          className={`flex items-center gap-1.5 transition-all duration-350 ease-out transform ${
            isTransitioning
              ? '-translate-y-2.5 opacity-0 blur-[1px]'
              : 'translate-y-0 opacity-100 blur-none'
          }`}
        >
          <span className="font-black text-sm text-indigo-950 dark:text-indigo-900 font-sans tracking-tight">
            {current.symbol}
          </span>
          <span className="text-[11px] font-mono font-bold text-indigo-600">
            {current.code}
          </span>
        </div>
      </div>

      {/* Mini dots showing currency progression */}
      <div className="flex items-center gap-1 pl-0.5">
        {CURRENCIES.map((c, i) => (
          <span
            key={c.code}
            className={`transition-all duration-300 rounded-full ${
              i === currentIndex
                ? 'w-2 h-1.5 bg-indigo-600'
                : 'w-1 h-1 bg-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
