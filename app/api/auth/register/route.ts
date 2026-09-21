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

    // 1. Check if user already exists
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

    // 2. Generate a unique organization ID for the new company
    const newOrgId = crypto.randomUUID();
    const orgSlug =
      cleanCompany.toLowerCase().replace(/[^a-z0-9]+/g, '-') +
      '-' +
      Date.now().toString().slice(-4);

    // 3. Create the isolated organization record
    const { data: newOrg, error: orgError } = await admin
      .from('organizations')
      .insert({
        id: newOrgId,
        name: cleanCompany,
        slug: orgSlug,
        business_type: 'Services & Products',
        email: cleanEmail,
        default_currency: 'USD',
        default_tax_rate: 0,
        default_validity_days: 30,
        quotation_prefix: 'Q-',
        quotation_start_number: 1,
        current_quotation_counter: 0,
        default_terms: '1. Quotation valid for 30 days.\n2. Payment terms as agreed.',
        invoice_footer: `Thank you for choosing ${cleanCompany}!`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error('Failed to create organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to initialize organization workspace: ' + orgError.message },
        { status: 400 }
      );
    }

    // 4. Create user in Supabase Auth (Owner / Admin of their new company)
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        company_name: cleanCompany,
        organization_id: newOrgId,
        role: 'OWNER',
      },
    });

    if (createError) {
      console.error('Failed to create user in Supabase:', createError);
      // Rollback org creation if user creation failed
      await admin.from('organizations').delete().eq('id', newOrgId);
      return NextResponse.json(
        { error: createError.message || 'Failed to create user account.' },
        { status: 400 }
      );
    }

    const userId = newUser.user.id;

    // Clean up any rogue default org membership inserted by legacy DB triggers
    const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
    if (newOrgId !== DEFAULT_ORG_ID) {
      await admin
        .from('organization_members')
        .delete()
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('user_id', userId);
    }

    // 5. Create membership in organization_members
    await admin.from('organization_members').upsert({
      organization_id: newOrgId,
      user_id: userId,
      role: 'OWNER',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 6. Upsert user profile
    await admin.from('profiles').upsert({
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
      updated_at: new Date().toISOString(),
    });

    // 7. Seed cache
    if (newOrg) {
      store.setCachedOrganization(newOrgId, newOrg);
    }

    return NextResponse.json({
      success: true,
      message: 'Account and private organization workspace created successfully.',
      user: {
        id: userId,
        email: cleanEmail,
        fullName: cleanName,
        companyName: cleanCompany,
        organizationId: newOrgId,
        role: 'OWNER',
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
