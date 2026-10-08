'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Receipt,
  Users,
  LayoutDashboard,
  CreditCard,
  Settings,
  Sparkles,
  Moon,
  Sun,
  Package,
  BarChart3,
  HelpCircle,
  Plus,
  ArrowRight,
  X,
} from 'lucide-react';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';

interface CommandItem {
  id: string;
  label: string;
  category: 'Navigation' | 'Actions' | 'Theme';
  icon: any;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    closeCommandPalette,
    openAiModal,
    toggleTheme,
    resolvedTheme,
  } = useThemeCustomization();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // Actions
    {
      id: 'new-quote',
      label: 'Create New Quotation',
      category: 'Actions',
      icon: Plus,
      href: '/quotations/new',
      keywords: ['quote', 'new', 'draft', 'estimate'],
    },
    {
      id: 'new-invoice',
      label: 'Create New Invoice',
      category: 'Actions',
      icon: Receipt,
      href: '/invoices/new',
      keywords: ['invoice', 'bill', 'new'],
    },
    {
      id: 'ai-assistant',
      label: 'Open QuoteFlow AI Assistant',
      category: 'Actions',
      icon: Sparkles,
      action: () => {
        closeCommandPalette();
        openAiModal();
      },
      keywords: ['ai', 'chat', 'ask', 'generate', 'assistant'],
    },
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard Overview',
      category: 'Navigation',
      icon: LayoutDashboard,
      href: '/dashboard',
      keywords: ['home', 'kpi', 'metrics'],
    },
    {
      id: 'nav-quotes',
      label: 'Quotations',
      category: 'Navigation',
      icon: FileText,
      href: '/quotations',
      keywords: ['quotes', 'estimates', 'proposals'],
    },
    {
      id: 'nav-invoices',
      label: 'Invoices',
      category: 'Navigation',
      icon: Receipt,
      href: '/invoices',
      keywords: ['invoices', 'bills', 'unpaid', 'paid'],
    },
    {
      id: 'nav-customers',
      label: 'Customers & Clients',
      category: 'Navigation',
      icon: Users,
      href: '/customers',
      keywords: ['clients', 'contacts', 'accounts'],
    },
    {
      id: 'nav-products',
      label: 'Products & Services',
      category: 'Navigation',
      icon: Package,
      href: '/products',
      keywords: ['catalog', 'pricing', 'items'],
    },
    {
      id: 'nav-reports',
      label: 'Reports & Analytics',
      category: 'Navigation',
      icon: BarChart3,
      href: '/reports',
      keywords: ['analytics', 'sales', 'charts', 'revenue'],
    },
    {
      id: 'nav-billing',
      label: 'Subscription & Billing',
      category: 'Navigation',
      icon: CreditCard,
      href: '/billing',
      keywords: ['pro', 'plan', 'payment', 'upgrade', 'pricing'],
    },
    {
      id: 'nav-settings',
      label: 'Company Settings',
      category: 'Navigation',
      icon: Settings,
      href: '/settings',
      keywords: ['general', 'logo', 'currency', 'tax'],
    },
    {
      id: 'nav-appearance',
      label: 'Appearance & Theme Customization',
      category: 'Navigation',
      icon: Sparkles,
      href: '/settings?tab=appearance',
      keywords: ['theme', 'dark', 'light', 'color', 'accent', 'sidebar'],
    },
    {
      id: 'nav-help',
      label: 'Help & Support Desk',
      category: 'Navigation',
      icon: HelpCircle,
      href: '/settings?tab=support',
      keywords: ['ticket', 'help', 'contact', 'developer'],
    },
    // Theme
    {
      id: 'toggle-theme',
      label: `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
      category: 'Theme',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        closeCommandPalette();
      },
      keywords: ['dark', 'light', 'mode', 'theme', 'color'],
    },
  ];

  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const matchLabel = cmd.label.toLowerCase().includes(q);
    const matchCategory = cmd.category.toLowerCase().includes(q);
    const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
    return matchLabel || matchCategory || matchKeywords;
  });

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  const handleSelect = (cmd: CommandItem) => {
    closeCommandPalette();
    if (cmd.action) {
      cmd.action();
    } else if (cmd.href) {
      router.push(cmd.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3.5">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, search pages, or ask QuoteFlow..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
          <button
            onClick={closeCommandPalette}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-transparent">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              <p>No commands found matching &ldquo;{query}&rdquo;</p>
              <button
                onClick={() => {
                  closeCommandPalette();
                  openAiModal();
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask QuoteFlow AI instead</span>
              </button>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{cmd.label}</p>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {cmd.category}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-[10px]">QuoteFlow OS</span>
        </div>
      </div>
    </div>
  );
}
