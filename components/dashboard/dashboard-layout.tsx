import React from 'react';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader, UserProfileInfo } from '@/components/dashboard/header';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

export async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    redirect('/login');
  }

  const cleanName = (auth.fullName || '').trim();
  let initials = 'U';
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    initials =
      parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : cleanName.slice(0, 2).toUpperCase();
  } else if (auth.email) {
    initials = auth.email.slice(0, 2).toUpperCase();
  }

  const userProfile: UserProfileInfo = {
    id: auth.userId,
    email: auth.email,
    fullName: auth.fullName,
    companyName: auth.organization.name,
    initials,
    role: auth.role,
  };

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
