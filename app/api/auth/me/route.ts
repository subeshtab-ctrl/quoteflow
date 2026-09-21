import { NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';

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
    const auth = await getAuthenticatedUserContext();
    if (!auth) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        organization: null,
      });
    }

    const initials = computeInitials(auth.fullName, auth.email);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.userId,
        email: auth.email,
        fullName: auth.fullName,
        companyName: auth.organization.name,
        initials,
        role: auth.role,
        organizationId: auth.orgId,
      },
      organization: auth.organization,
    });
  } catch (err: any) {
    console.error('Error fetching current user:', err);
    return NextResponse.json(
      { authenticated: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
