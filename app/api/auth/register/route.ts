import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service-role';
import { store } from '@/lib/supabase/data-store';
import { getAuthRedirectUrl } from '@/lib/utils/auth';
import { findCountry } from '@/lib/billing/country-rules';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';
import { registrationSchema } from '@/lib/validations/auth';
import { checkRateLimit } from '@/lib/auth/otp-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    // 1. Rate limiting on registration attempts: max 5 per 15m per IP
    const ipRate = checkRateLimit(`reg:ip:${clientIp}`, 5, 15 * 60 * 1000, 2000);
    if (!ipRate.allowed) {
      return NextResponse.json(
        { error: ipRate.reason || 'Too many registration requests. Please wait a moment.' },
        {
          status: 429,
          headers: { 'Retry-After': String(ipRate.retryAfterSeconds) },
        }
      );
    }

    const rawBody = await req.json();
    const validationResult = registrationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      return NextResponse.json(
        { error: issue?.message || 'Invalid registration data.' },
        { status: 400 }
      );
    }

    const { fullName, companyName, email, password, countryCode } = validationResult.data;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const cleanCompany = companyName.trim();

    // Rate limit per target email: 60s cooldown, max 5 per 15m
    const emailRate = checkRateLimit(`reg:email:${cleanEmail}`, 5, 15 * 60 * 1000, 60 * 1000);
    if (!emailRate.allowed) {
      return NextResponse.json(
        { error: emailRate.reason || 'Please wait before attempting to register with this email again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(emailRate.retryAfterSeconds) },
        }
      );
    }

    const countryMeta = findCountry(countryCode || 'IN');
    const isIndia = countryMeta.code === 'IN';
    const billingRegion = isIndia ? 'INDIA' : 'INTERNATIONAL';
    const billingCurrency = isIndia ? 'INR' : 'USD';
    const paymentProvider = isIndia ? 'RAZORPAY' : 'NOWPAYMENTS';

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

    // Uniform response to eliminate account and email enumeration
    const UNIFORM_SUCCESS_RESPONSE = {
      success: true,
      verificationLinkSent: true,
      message: 'A verification link has been sent to your email. Please check your inbox and click the link to activate your account.',
    };

    // 2. Check if user already exists
    try {
      const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existing = (listData?.users || []).find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (existing) {
        // Uniform response: Never enumerate existing accounts, staff memberships, or company names
        return NextResponse.json(UNIFORM_SUCCESS_RESPONSE, { status: 200 });
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
        default_currency: billingCurrency,
        country: countryMeta.name,
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
        verification_link_sent_at: new Date().toISOString(),
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

    // 7. Seed cache & Start 14-Day Free Trial (Requirement 3)
    if (newOrg) {
      store.setCachedOrganization(newOrgId, newOrg);
    }
    const { subscriptionService } = await import('@/lib/billing/subscription-service');
    await subscriptionService.startFreeTrial(newOrgId).catch(console.error);

    await store.updateOrganization(newOrgId, {
      business_country: countryMeta.code,
      business_country_name: countryMeta.name,
      billing_region: billingRegion,
      billing_currency: billingCurrency,
      payment_provider: paymentProvider,
      country: countryMeta.name,
      default_currency: billingCurrency,
    });

    const sub = await store.getBusinessSubscription(newOrgId);
    if (sub) {
      sub.billing_country = countryMeta.code;
      sub.billing_region = billingRegion;
      sub.billing_currency = billingCurrency;
      sub.currency = billingCurrency;
      sub.amount = isIndia ? SUBSCRIPTION_CONFIG.INDIA.amountPaise : SUBSCRIPTION_CONFIG.GLOBAL.monthlyPrice;
      sub.provider = isIndia ? 'razorpay' : 'nowpayments';
      await store.saveBusinessSubscription(sub);
    }

    // 8. Generate & dispatch verification email link to the user's inbox
    // NOTE: Welcome email is strictly deferred to Phase 3 (post-verification callback)
    try {
      const callbackUrl = getAuthRedirectUrl('/auth/callback');
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'signup',
        email: cleanEmail,
        password: password, // required by SDK type; user's actual password set during signup
        options: {
          redirectTo: callbackUrl,
        },
      });

      const actionLink = linkData?.properties?.action_link;

      if (actionLink) {
        const { sendEmail, generateVerificationOtpEmail } = await import('@/lib/email/service');
        const verificationPayload = generateVerificationOtpEmail({
          email: cleanEmail,
          verifyUrl: actionLink,
          companyName: cleanCompany,
          fullName: cleanName,
        });
        await sendEmail(verificationPayload);
      } else if (linkErr) {
        console.warn('Supabase generateLink error:', linkErr);
      }
    } catch (linkErr) {
      console.warn('Generate verification link note:', linkErr);
    }

    return NextResponse.json(UNIFORM_SUCCESS_RESPONSE, { status: 200 });

  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
