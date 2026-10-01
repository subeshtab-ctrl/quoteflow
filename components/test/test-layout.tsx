import React from 'react';
import { redirect } from 'next/navigation';
import { TestSidebar } from '@/components/test/test-sidebar';
import { DashboardHeader, UserProfileInfo } from '@/components/dashboard/header';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';

export async function TestLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthenticatedUserContext();
  if (!auth) {
    redirect('/login');
  }

  // Strict isolation: if organization is in live production mode, redirect to live dashboard
  if ((auth.organization.mode || 'live') === 'live') {
    redirect('/dashboard');
  }

  // Seed demo customers for this org if not already present
  await store.seedTestDemoCustomers(auth.orgId);

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
    mode: 'test',
  };

  const brandColor = auth.organization.brand_color || '#4f46e5';

  return (
    <div
      className="flex min-h-screen bg-amber-50/30 dark:bg-[#0d0a00] text-slate-900 dark:text-slate-100 transition-colors"
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      {/* Test Sidebar */}
      <TestSidebar
        organizationName={auth.organization.name}
        logoUrl={auth.organization.logo_url || undefined}
        className="hidden md:flex shrink-0 sticky top-0 h-screen"
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Test Mode Indicator Bar */}
        <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-bold flex items-center gap-2 border-b border-amber-600/20">
          <span>🧪</span>
          <span>TEST / TRAINING MODE — Safe sandbox. No real emails, payments or data are affected.</span>
        </div>
        <DashboardHeader initialUser={userProfile} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
