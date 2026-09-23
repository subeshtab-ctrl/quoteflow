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
        // Check if existing user is a staff member of another company
        const { data: member } = await admin
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', existing.id)
          .maybeSingle();

        if (member && member.role === 'STAFF') {
          const org = await store.getOrganization(member.organization_id);
          const compName = org?.name || 'an existing company';
          return NextResponse.json(
            {
              error: `This email is already registered as a team member of "${compName}". Staff accounts cannot register a separate company. Please sign in to access your company workspace.`,
            },
            { status: 409 }
          );
        }

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

    // 4. Create user in Supabase Auth (Owner of their new company)
    // STRICT: email_confirm is FALSE so user MUST verify via email link
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: false,
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

    // Clean up any rogue default org membership inserted by database triggers
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

    // 8. Generate & dispatch verification email link to the user's inbox
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://abilities-tap-rounds-dat.trycloudflare.com';
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${appUrl}/auth/callback`,
        },
      });

      const actionLink = linkData?.properties?.action_link;

      if (actionLink) {
        console.log(`\n======================================================`);
        console.log(`[VERIFICATION EMAIL SENT] Target: ${cleanEmail}`);
        console.log(`[VERIFICATION LINK]       ${actionLink}`);
        console.log(`======================================================\n`);

        const { sendEmail } = await import('@/lib/email/service');
        await sendEmail({
          to: cleanEmail,
          subject: `Verify your email for ${cleanCompany} on QuoteFlow`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
                  .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                  .badge { display: inline-block; background: #4f46e5; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
                  .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 24px 0; }
                  .footer { font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="badge">QuoteFlow Security</div>
                  <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Verify Your Email Address</h2>
                  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                    Hello <strong>${cleanName}</strong>,<br><br>
                    Thank you for registering <strong>${cleanCompany}</strong> on QuoteFlow. Please click the button below to verify your email address and activate your organization workspace:
                  </p>
                  <div style="text-align: center;">
                    <a href="${actionLink}" class="btn">Verify Email & Activate Account</a>
                  </div>
                  <p style="font-size: 12px; color: #94a3b8; word-break: break-all; line-height: 1.5;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${actionLink}" style="color: #4f46e5;">${actionLink}</a>
                  </p>
                  <div class="footer">
                    <p>QuoteFlow SaaS Platform © 2026</p>
                  </div>
                </div>
              </body>
            </html>
          `,
          text: `Hello ${cleanName},\n\nPlease verify your email for QuoteFlow by visiting this link:\n${actionLink}\n\nThank you!`,
        });
      } else if (linkErr) {
        console.warn('Supabase generateLink error:', linkErr);
      }
    } catch (linkErr) {
      console.warn('Generate verification link note:', linkErr);
    }

    return NextResponse.json({
      success: true,
      verificationLinkSent: true,
      message: `A verification link has been sent to ${cleanEmail}. Please check your inbox and click the link to verify your email.`,
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
