import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { store } from '@/lib/supabase/data-store';
import { createAdminClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function computeInitials(name: string, email: string): string {
  const cleanName = (name || '').trim();
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  }
  if (email) {
    const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    return prefix.slice(0, 2).toUpperCase() || 'U';
  }
  return 'U';
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        organization: null,
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        organization: null,
      });
    }

    // Attempt to lookup profile or metadata
    let fullName = (user.user_metadata?.full_name || '').trim();

    if (!fullName) {
      try {
        const adminSupabase = createAdminClient();
        if (adminSupabase) {
          const { data: profile } = await adminSupabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.full_name) {
            fullName = profile.full_name;
          }
        }
      } catch (profileErr) {
        console.warn('Profile lookup error:', profileErr);
      }
    }

    // Default fallback for name if completely missing
    if (!fullName && user.email) {
      const emailPrefix = user.email.split('@')[0];
      fullName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }

    // Fetch actual organization details
    const org = await store.getOrganization();
    const companyName =
      org?.name ||
      user.user_metadata?.company_name ||
      'My Company';

    const initials = computeInitials(fullName, user.email || '');

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: fullName || 'User',
        companyName,
        initials,
      },
      organization: org,
    });
  } catch (err: any) {
    console.error('Error fetching current user:', err);
    return NextResponse.json(
      { authenticated: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
