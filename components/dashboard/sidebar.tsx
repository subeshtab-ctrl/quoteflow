'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Package,
  BarChart3,
  Settings,
  Building2,
  GraduationCap,
  CreditCard,
  LifeBuoy,
  Clock,
} from 'lucide-react';
import { parseLogoUrl, getLogoShapeClass, getLogoFitClass, getCompanyInitials } from '@/lib/utils/logo';

interface SidebarProps {
  organizationName?: string;
  logoUrl?: string | null;
  mode?: string;
  userRole?: string;
  className?: string;
  initialSubStatus?: 'pro' | 'trial';
}

export function DashboardSidebar({
  organizationName = 'QuoteFlow',
  logoUrl,
  mode = 'live',
  userRole = 'STAFF',
  className,
  initialSubStatus,
}: SidebarProps) {
  const pathname = usePathname();
  const [orgData, setOrgData] = useState<{ name: string; logoUrl?: string | null; mode?: string }>({
    name: organizationName,
    logoUrl: logoUrl || undefined,
    mode,
  });
  const [subStatus, setSubStatus] = useState<'pro' | 'trial'>(initialSubStatus || 'trial');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.organization) {
          setOrgData({
            name: data.organization.name || organizationName,
            logoUrl: data.organization.logo_url,
            mode: data.organization.mode || 'live',
          });
        }
      })
      .catch(() => {});

    const loadSub = () => {
      fetch('/api/subscriptions', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data) => {
          if (data.subscription) {
            const isPro = data.subscription.status === 'active' || Boolean(data.subscription.is_trial_prepaid) || Boolean(data.access?.isPaid);
            setSubStatus(isPro ? 'pro' : 'trial');
          }
        })
        .catch(() => {});
    };

    loadSub();
    window.addEventListener('focus', loadSub);
    return () => window.removeEventListener('focus', loadSub);
  }, [organizationName, logoUrl]);

  const logoConfig = parseLogoUrl(orgData.logoUrl);
  const shapeClass = getLogoShapeClass(logoConfig.shape);
  const fitClass = getLogoFitClass(logoConfig.fit);
  const initials = getCompanyInitials(orgData.name);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Products & Services', href: '/products', icon: Package },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Subscription & Billing', href: '/billing', icon: CreditCard },
    { name: 'Training & Guides', href: '/training', icon: GraduationCap },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition-colors',
        className
      )}
    >
      <div className="space-y-6">
        {/* Company Header */}
        <div className="flex items-center gap-3 px-2 py-1.5 min-w-0">
          {logoConfig.cleanUrl ? (
            <div
              className={cn(
                'relative flex h-10 w-10 shrink-0 items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs ring-2 ring-indigo-500/10 overflow-hidden',
                shapeClass
              )}
            >
              <img
                src={logoConfig.cleanUrl}
                alt={orgData.name}
                className={cn('h-full w-full', fitClass)}
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-black text-sm tracking-wider shadow-sm ring-2 ring-indigo-500/20 select-none',
                shapeClass
              )}
              title={orgData.name}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2
              className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight leading-snug"
              title={orgData.name}
            >
              {orgData.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate leading-none">
                Workspace
              </p>
              {subStatus === 'pro' ? (
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-[#e8f8f0] dark:bg-[#064e3b]/35 text-[#047857] dark:text-[#34d399] border border-[#6ee7b7] dark:border-[#059669]/60 hover:bg-[#d1fae5] dark:hover:bg-[#064e3b]/50 shadow-xs transition-all select-none cursor-pointer"
                  title="Subscribed to QuoteFlow Pro • Click to view billing"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shrink-0" />
                  <span>PRO</span>
                </Link>
              ) : (
                <Link
                  href="/billing"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-[#fffbeb] dark:bg-[#78350f]/25 text-[#92400e] dark:text-[#fbbf24] border border-[#fcd34d] dark:border-[#b45309]/60 hover:bg-[#fef3c7] dark:hover:bg-[#78350f]/35 shadow-xs transition-all select-none cursor-pointer"
                  title="Trial Active • Click to upgrade to QuoteFlow Pro"
                >
                  <Clock className="w-2.5 h-2.5 text-[#d97706] dark:text-[#f59e0b] shrink-0 stroke-[2.5]" />
                  <span>TRIAL</span>
                </Link>
              )}
              {orgData.mode === 'test' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  TEST
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-[var(--brand-color,#4f46e5)] dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
        <p className="font-semibold text-slate-700 dark:text-slate-300">QuoteFlow Workspace</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Multi-Tenant Protected</p>
      </div>
    </aside>
  );
}
