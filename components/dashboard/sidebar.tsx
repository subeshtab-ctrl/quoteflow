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
import { isOwnerOrAdminRole } from '@/types/staff';

interface SidebarProps {
  organizationName?: string;
  logoUrl?: string | null;
  mode?: string;
  userRole?: string;
  isStaff?: boolean;
  isOwner?: boolean;
  className?: string;
  initialSubStatus?: 'pro' | 'trial';
}

export function DashboardSidebar({
  organizationName = 'QuoteFlow',
  logoUrl,
  mode = 'live',
  userRole = 'STAFF',
  isStaff,
  isOwner,
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
        { name: 'Help', href: '/support', icon: HelpCircle },
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
            {/* QuoteFlow Official Gradient [Q] Icon */}
            <div className="h-11 w-11 shrink-0 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200 bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-0.5">
              <img
                src="/quoteflow-icon.png"
                alt="QuoteFlow"
                className="h-full w-full object-contain rounded-[14px]"
              />
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
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
                        'flex items-center rounded-2xl text-xs transition-all group relative font-medium',
                        isSidebarCollapsed
                          ? 'justify-center h-11 w-11 mx-auto'
                          : 'gap-3 px-3.5 py-2.5',
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-500/25'
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
                        <div className="pointer-events-none absolute left-full ml-2 hidden rounded-xl bg-slate-900 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-white shadow-md group-hover:block z-50 whitespace-nowrap">
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
        {/* Payment Status / Trial Status Pill (Strictly hidden for all Staff accounts; Trial shown only to confirmed Owner) */}
        {isStaff || !isOwner || !isOwnerOrAdminRole(userRole) ? (
          !isSidebarCollapsed ? (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={orgData.name}>
                  {orgData.name}
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
            </div>
          )
        ) : !isSidebarCollapsed ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
            {subStatus === 'trial' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>14-Day Free Trial</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    Active
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full w-2/3" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span className="truncate max-w-[120px]">{orgData.name}</span>
                  <Link
                    href="/billing"
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Upgrade
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
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
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[130px] font-medium" title={orgData.name}>
                    {orgData.name}
                  </span>
                  <Link
                    href="/billing"
                    className="font-bold text-[10px] uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Pro
                  </Link>
                </div>
              </div>
            )}
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
            {subStatus === 'pro' && (
              <div
                className="h-2 w-2 rounded-full bg-emerald-500"
                title="Payment status: All good"
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
