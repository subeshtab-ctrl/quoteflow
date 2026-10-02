import React from 'react';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader, UserProfileInfo } from '@/components/dashboard/header';
import { TestModeBanner } from '@/components/dashboard/test-mode-banner';
import { BillingBanner } from '@/components/billing/billing-banner';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { subscriptionService } from '@/lib/billing/subscription-service';

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

  const isTestMode = auth.organization.mode === 'test';

  const userProfile: UserProfileInfo = {
    id: auth.userId,
    email: auth.email,
    fullName: auth.fullName,
    companyName: auth.organization.name,
    initials,
    role: auth.role,
    mode: isTestMode ? 'test' : 'live',
  };

  const brandColor = auth.organization.brand_color || '#4f46e5';

  let subscriptionAccess = null;
  try {
    subscriptionAccess = await subscriptionService.getBusinessSubscriptionAccess(auth.orgId);
  } catch (err) {
    console.warn('Could not fetch subscription access:', err);
  }

  return (
    <div
      className="flex min-h-screen bg-slate-50/60 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors"
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      {/* Desktop Sidebar */}
      <DashboardSidebar
        organizationName={auth.organization.name}
        logoUrl={auth.organization.logo_url || undefined}
        mode={auth.organization.mode || 'live'}
        userRole={auth.role}
        className="hidden md:flex shrink-0 sticky top-0 h-screen"
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TestModeBanner isTestMode={isTestMode} userRole={auth.role} />
        <DashboardHeader initialUser={userProfile} />
        <BillingBanner access={subscriptionAccess} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
