'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { openAiModal } = useThemeCustomization();

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Quotes', href: '/quotations', icon: FileText },
    // Center is AI button
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Clients', href: '/customers', icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg px-3 py-1.5">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Item 1: Home */}
        <Link
          href="/dashboard"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors',
            pathname === '/dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Home</span>
        </Link>

        {/* Item 2: Quotes */}
        <Link
          href="/quotations"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors',
            pathname?.startsWith('/quotations')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <FileText className="h-4 w-4" />
          <span>Quotes</span>
        </Link>

        {/* Center: QuoteFlow AI Floating Button */}
        <div className="flex flex-col items-center -mt-5">
          <button
            onClick={openAiModal}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-900 active:scale-95 transition-transform"
            aria-label="Ask QuoteFlow AI"
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
            AI
          </span>
        </div>

        {/* Item 3: Invoices */}
        <Link
          href="/invoices"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors',
            pathname?.startsWith('/invoices')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <Receipt className="h-4 w-4" />
          <span>Invoices</span>
        </Link>

        {/* Item 4: Customers */}
        <Link
          href="/customers"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-colors',
            pathname?.startsWith('/customers')
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <Users className="h-4 w-4" />
          <span>Clients</span>
        </Link>
      </div>
    </nav>
  );
}
