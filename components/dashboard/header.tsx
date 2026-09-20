'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Check,
  Building,
  User,
  LogOut,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Notification } from '@/types/database';
import { formatDate, formatDateTime } from '@/lib/utils';

export function DashboardHeader({
  initialNotifications = [],
}: {
  initialNotifications?: Notification[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Poll notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data.notifications) {
            setNotifications(data.notifications);
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      //
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/quotations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search quotations, customers (e.g. Q-000002 or John)..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </form>

      {/* Right Navigation & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Test Public Customer Link */}
        <Link
          href="/q/demo_token_sent_q002"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
          title="Open live customer approval view in a new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Client Approval Portal</span>
        </Link>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl text-xs transition-colors ${
                        n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 border border-indigo-100'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {formatDateTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User / Organization Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
              AD
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">Admin User</p>
              <p className="text-[10px] text-slate-400">admin@apextechnologies.io</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">Apex Technologies</p>
                <p className="text-[11px] text-slate-500">Owner Account</p>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <Building className="h-3.5 w-3.5" />
                  Company Settings
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
