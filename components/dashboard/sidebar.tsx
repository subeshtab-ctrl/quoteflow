'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  PlusCircle,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  organizationName?: string;
  logoUrl?: string;
  className?: string;
}

export function DashboardSidebar({
  organizationName = 'QuoteFlow',
  logoUrl,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const [orgData, setOrgData] = useState<{ name: string; logoUrl?: string }>({
    name: organizationName,
    logoUrl,
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.organization) {
          setOrgData({
            name: data.organization.name || organizationName,
            logoUrl: data.organization.logo_url,
          });
        }
      })
      .catch(() => {});
  }, [organizationName, logoUrl]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Products & Services', href: '/products', icon: Package },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
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
        <div className="flex items-center gap-3 px-2 py-1">
          {orgData.logoUrl ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <img src={orgData.logoUrl} alt={orgData.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-color,#4f46e5)] text-white font-black text-lg shadow-md">
              Q
            </div>
          )}
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {orgData.name}
            </h2>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Quotation Management</p>
          </div>
        </div>

        {/* Create Quotation Button */}
        <Link href="/quotations/new">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-color,#4f46e5)] hover:brightness-105 active:brightness-95 text-white px-4 py-2.5 text-sm font-semibold shadow-md active:scale-[0.98] transition-all">
            <PlusCircle className="h-4 w-4" />
            <span>Create Quotation</span>
          </button>
        </Link>

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
