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
  CreditCard,
  BarChart3,
  Package,
  UserCheck,
  Sparkles,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';
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
  const {
    isSidebarCollapsed,
    toggleSidebarCollapse,
    openAiModal,
  } = useThemeCustomization();

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
            const isPro =
              data.subscription.status === 'active' ||
              Boolean(data.subscription.is_trial_prepaid) ||
              Boolean(data.access?.isPaid);
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

  // Grouped Navigation structure inspired by the reference dashboard
  const navGroups = [
    {
      group: 'MAIN',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Quotes', href: '/quotations', icon: FileText },
        { name: 'Invoices', href: '/invoices', icon: Receipt },
        { name: 'Customers', href: '/customers', icon: Users },
      ],
    },
    {
      group: 'BUSINESS',
      items: [
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Products', href: '/products', icon: Package },
        { name: 'Team', href: '/settings?tab=team', icon: UserCheck },
      ],
    },
    {
      group: 'TOOLS',
      items: [
        {
          name: 'QuoteFlow AI',
          icon: Sparkles,
          isAction: true,
          action: openAiModal,
          badge: 'New',
        },
        { name: 'Settings', href: '/settings', icon: Settings },
        { name: 'Help', href: '/settings?tab=support', icon: HelpCircle },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'flex h-full flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 select-none shadow-xs',
        isSidebarCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-4',
        className
      )}
    >
      <div className="space-y-5">
        {/* Top Header: Official QuoteFlow Logo + Brand */}
        <div className="flex items-center justify-between min-w-0 px-1 py-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 min-w-0 group"
            title="QuoteFlow by blendandbold"
          >
            {/* QuoteFlow Gradient [Q] Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-extrabold text-lg tracking-tight shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/10 transition-transform group-hover:scale-105">
              Q
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    QuoteFlow
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-1">
                  by blendandbold
                </p>
              </div>
            )}
          </Link>

          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isSidebarCollapsed && (
                <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {group.group}
                </p>
              )}

              <nav className="space-y-1">
                {group.items.map((item: any) => {
                  const Icon = item.icon;

                  if (item.isAction) {
                    return (
                      <button
                        key={item.name}
                        onClick={item.action}
                        title={item.name}
                        className={cn(
                          'w-full flex items-center rounded-xl text-xs font-semibold transition-all group relative',
                          isSidebarCollapsed
                            ? 'justify-center h-10 w-10 mx-auto'
                            : 'gap-3 px-3 py-2.5',
                          'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40'
                        )}
                      >
                        <div className="relative">
                          <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 text-indigo-600 dark:text-indigo-400" />
                          {isSidebarCollapsed && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-600" />
                          )}
                        </div>

                        {!isSidebarCollapsed && (
                          <div className="flex flex-1 items-center justify-between min-w-0">
                            <span className="truncate">{item.name}</span>
                            {item.badge && (
                              <span className="rounded-full bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 tracking-wide">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  }

                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className={cn(
                        'flex items-center rounded-xl text-xs font-medium transition-all group relative',
                        isSidebarCollapsed
                          ? 'justify-center h-10 w-10 mx-auto'
                          : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-[var(--brand-color,#4f46e5)] text-white font-bold shadow-sm shadow-indigo-500/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                        )}
                      />

                      {!isSidebarCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}

                      {/* Tooltip for collapsed mode */}
                      {isSidebarCollapsed && (
                        <div className="pointer-events-none absolute left-full ml-2 hidden rounded-lg bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-md group-hover:block z-50 whitespace-nowrap">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Area: Workspace, Payment Status & Collapse Toggle */}
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Payment Status Pill */}
        {!isSidebarCollapsed ? (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
            {/* Status dot */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Payment status
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-md">
                All good
              </span>
            </div>

            {/* Organization / Workspace info */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className="truncate max-w-[130px] font-medium" title={orgData.name}>
                {orgData.name}
              </span>
              <span className="font-bold text-[10px] uppercase text-indigo-600 dark:text-indigo-400">
                {subStatus === 'pro' ? 'Pro' : 'Trial'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleSidebarCollapse}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div
              className="h-2 w-2 rounded-full bg-emerald-500"
              title="Payment status: All good"
            />
          </div>
        )}
      </div>
    </aside>
  );
}
