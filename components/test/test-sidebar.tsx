'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Globe,
  GraduationCap,
  FlaskConical,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { parseLogoUrl, getLogoShapeClass, getLogoFitClass, getCompanyInitials } from '@/lib/utils/logo';

interface TestSidebarProps {
  organizationName?: string;
  logoUrl?: string | null;
  className?: string;
}

export function TestSidebar({
  organizationName = 'QuoteFlow',
  logoUrl,
  className,
}: TestSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgName, setOrgName] = useState(organizationName);
  const [orgLogo, setOrgLogo] = useState(logoUrl);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.organization) {
          setOrgName(data.organization.name || organizationName);
          setOrgLogo(data.organization.logo_url);
        }
      })
      .catch(() => {});
  }, [organizationName, logoUrl]);

  const logoConfig = parseLogoUrl(orgLogo);
  const shapeClass = getLogoShapeClass(logoConfig.shape);
  const fitClass = getLogoFitClass(logoConfig.fit);
  const initials = getCompanyInitials(orgName);

  const navigation = [
    { name: 'Test Dashboard', href: '/test/dashboard', icon: LayoutDashboard },
    { name: 'Test Quotes', href: '/test/quotations', icon: FileText },
    { name: 'Test Invoices', href: '/test/invoices', icon: Receipt },
    { name: 'Test Customers', href: '/test/customers', icon: Users },
    { name: 'Client Portal', href: '/test/client-portal', icon: Globe },
    { name: 'Staff Training', href: '/test/training', icon: GraduationCap },
  ];

  const handleGoLive = async () => {
    setIsSwitching(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live' }),
      });
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {}
    setIsSwitching(false);
  };

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col justify-between border-r border-amber-200/60 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 p-4 shadow-sm transition-colors',
        className
      )}
    >
      <div className="space-y-4">
        {/* Test Mode Header Badge */}
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/30">
          <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 leading-none">
              Test / Training Mode
            </p>
            <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">Safe sandbox environment</p>
          </div>
        </div>

        {/* Company Header */}
        <div className="flex items-center gap-3 px-2 py-1 min-w-0">
          {logoConfig.cleanUrl ? (
            <div
              className={cn(
                'relative flex h-9 w-9 shrink-0 items-center justify-center bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 shadow-xs overflow-hidden',
                shapeClass
              )}
            >
              <img src={logoConfig.cleanUrl} alt={orgName} className={cn('h-full w-full', fitClass)} />
            </div>
          ) : (
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-tr from-amber-500 to-amber-600 text-white font-black text-sm shadow-xs select-none',
                shapeClass
              )}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-snug" title={orgName}>
              {orgName}
            </h2>
            <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium">Test Workspace</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/test/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold shadow-xs border border-amber-200/60 dark:border-amber-700/40'
                    : 'text-amber-800/70 dark:text-amber-500 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 hover:text-amber-900 dark:hover:text-amber-300'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4.5 w-4.5',
                    isActive ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500/60 dark:text-amber-600'
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer — switch to live */}
      <div className="space-y-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Live Dashboard
        </Link>
        <div className="rounded-xl bg-amber-100/70 dark:bg-amber-950/30 p-3 border border-amber-200/50 dark:border-amber-800/30">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">🧪 Test Mode Active</p>
          <p className="text-[10px] text-amber-600/80 dark:text-amber-600/70 mt-0.5">
            No real emails, payments or data are affected.
          </p>
        </div>
      </div>
    </aside>
  );
}
