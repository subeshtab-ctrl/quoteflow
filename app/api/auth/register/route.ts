import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { fullName, companyName, email, password } = await req.json();

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();
    const cleanCompany = (companyName || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required.' }, { status: 400 });
    }
    if (!cleanName) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    if (!cleanCompany) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Authentication service unavailable.' },
        { status: 500 }
      );
    }

    // Check if user already exists
    try {
      const { data: listData } = await admin.auth.admin.listUsers();
      const existing = (listData?.users || []).find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (existing) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Please sign in with your password.',
          },
          { status: 409 }
        );
      }
    } catch (listErr) {
      console.warn('User existence pre-check note:', listErr);
    }

    // Create verified user directly via Admin API
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Automatically confirmed so user is never blocked by broken email links
      user_metadata: {
        full_name: cleanName,
        company_name: cleanCompany,
      },
    });

    if (createError) {
      console.error('Failed to create user in Supabase:', createError);
      return NextResponse.json(
        { error: createError.message || 'Failed to create user account.' },
        { status: 400 }
      );
    }

    const userId = newUser?.user?.id;

    // Persist profile
    if (userId) {
      try {
        await admin.from('profiles').upsert({
          id: userId,
          email: cleanEmail,
          full_name: cleanName,
          updated_at: new Date().toISOString(),
        });
      } catch (profErr) {
        console.warn('Profile creation note:', profErr);
      }
    }

    // Update organization with company details
    try {
      await store.updateOrganization('a0000000-0000-0000-0000-000000000001', {
        name: cleanCompany,
        email: cleanEmail,
      });
    } catch (orgErr) {
      console.warn('Organization update note:', orgErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created and verified successfully.',
      user: {
        id: userId,
        email: cleanEmail,
        fullName: cleanName,
        companyName: cleanCompany,
      },
    });
  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
