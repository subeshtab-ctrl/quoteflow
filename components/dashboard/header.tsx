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
  Loader2,
} from 'lucide-react';
import { Notification } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export interface UserProfileInfo {
  id?: string;
  email?: string;
  fullName?: string;
  companyName?: string;
  initials?: string;
  role?: string;
}

export function DashboardHeader({
  initialNotifications = [],
  initialUser = null,
}: {
  initialNotifications?: Notification[];
  initialUser?: UserProfileInfo | null;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(initialUser);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fetch authenticated user profile
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.authenticated && data.user) {
            setUserProfile(data.user);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch user profile:', err);
      }
    };

    fetchProfile();

    // Listen to Supabase auth events
    const supabase = createClient();
    if (supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          if (isMounted) setUserProfile(null);
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          fetchProfile();
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

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
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/quotations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const displayName = userProfile?.fullName || 'User';
  const displayEmail = userProfile?.email || '';
  const displayCompany = userProfile?.companyName || 'My Workspace';
  const displayInitials =
    userProfile?.initials ||
    (displayName ? displayName.slice(0, 2).toUpperCase() : 'U');

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

        {/* Dynamic User Profile / Organization Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            aria-label="User profile menu"
          >
            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm uppercase">
              {displayInitials}
            </div>
            <div className="hidden lg:block text-left max-w-[140px]">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {displayEmail || displayCompany}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User / Workspace info header */}
              <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 rounded-xl mb-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {displayCompany}
                  </p>
                  {userProfile?.role && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 uppercase tracking-wider">
                      {userProfile.role}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 font-medium truncate mt-1">
                  {displayName}
                </p>
                {displayEmail && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {displayEmail}
                  </p>
                )}
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span>Company Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
