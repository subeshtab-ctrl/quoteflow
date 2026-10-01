import { createServerSupabaseClient } from '@/lib/supabase/server';
import { LandingPageClient } from '@/components/landing/landing-page-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  let isAuthenticated = false;
  let userEmail = '';

  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        isAuthenticated = true;
        userEmail = user.email || '';
      }
    } catch {
      // In case session check fails, fall back to guest view safely
    }
  }

  return <LandingPageClient isAuthenticated={isAuthenticated} userEmail={userEmail} />;
}
