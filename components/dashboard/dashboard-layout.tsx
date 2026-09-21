import React from 'react';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader, UserProfileInfo } from '@/components/dashboard/header';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { store } from '@/lib/supabase/data-store';

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth check
  const supabase = await createServerSupabaseClient();
  let userProfile: UserProfileInfo | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    const org = await store.getOrganization();
    const fullName =
      user.user_metadata?.full_name ||
      (user.email ? user.email.split('@')[0] : 'User');
    const companyName =
      org?.name ||
      user.user_metadata?.company_name ||
      'My Company';

    const cleanName = (fullName || '').trim();
    let initials = 'U';
    if (cleanName) {
      const parts = cleanName.split(/\s+/).filter(Boolean);
      initials =
        parts.length >= 2
          ? (parts[0][0] + parts[1][0]).toUpperCase()
          : cleanName.slice(0, 2).toUpperCase();
    } else if (user.email) {
      initials = user.email.slice(0, 2).toUpperCase();
    }

    userProfile = {
      id: user.id,
      email: user.email,
      fullName: cleanName || 'User',
      companyName,
      initials,
    };
  }

  return (
    <div className="flex min-h-screen bg-slate-50/60">
      {/* Desktop Sidebar */}
      <DashboardSidebar className="hidden md:flex shrink-0 sticky top-0 h-screen" />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader initialUser={userProfile} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
