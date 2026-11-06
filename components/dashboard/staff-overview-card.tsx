'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ArrowRight, ShieldCheck, Briefcase, Calculator, Megaphone } from 'lucide-react';
import { isOwnerOrAdminRole } from '@/types/staff';

interface StaffOverviewCardProps {
  userRole?: string | null;
  isStaff?: boolean;
  isOwner?: boolean;
}

export function StaffOverviewCard({ userRole, isStaff, isOwner }: StaffOverviewCardProps) {
  const [stats, setStats] = useState<{
    active: number;
    managers: number;
    sales: number;
    accounts: number;
    marketing: number;
    total: number;
  } | null>(null);

  // Hidden for regular staff accounts; strictly visible to Owners and permitted Admins
  if (isStaff && userRole !== 'ADMIN' && userRole !== 'OWNER') {
    return null;
  }
  if (!isOwnerOrAdminRole(userRole)) {
    return null;
  }

  useEffect(() => {
    let isMounted = true;
    fetch('/api/staff/overview')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.stats) {
          setStats(data.stats);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  if (!stats) return null;

  return (
    <div className="rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/60 p-2 text-indigo-600 dark:text-indigo-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
              Staff & Team Overview
            </span>
            <span className="text-[11px] text-slate-400">Workspace Entitlement</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Staff: {stats.active}</span>
        </div>
      </div>

      {/* Role Breakdown Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/30 flex items-center justify-between">
          <span className="text-teal-700 dark:text-teal-300 font-medium">Managers:</span>
          <span className="font-bold text-teal-900 dark:text-teal-100">{stats.managers}</span>
        </div>

        <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
          <span className="text-amber-700 dark:text-amber-300 font-medium">Sales:</span>
          <span className="font-bold text-amber-900 dark:text-amber-100">{stats.sales}</span>
        </div>

        <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
          <span className="text-emerald-700 dark:text-emerald-300 font-medium">Accounts:</span>
          <span className="font-bold text-emerald-900 dark:text-emerald-100">{stats.accounts}</span>
        </div>

        <div className="p-2 rounded-xl bg-pink-50/60 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/30 flex items-center justify-between">
          <span className="text-pink-700 dark:text-pink-300 font-medium">Marketing:</span>
          <span className="font-bold text-pink-900 dark:text-pink-100">{stats.marketing}</span>
        </div>
      </div>

      {/* Link to Staff Settings */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Total Workspace Accounts: <strong className="text-slate-700 dark:text-slate-300">{stats.total}</strong>
        </span>
        <Link
          href="/settings?tab=team"
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 group"
        >
          <span>View Staff</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
