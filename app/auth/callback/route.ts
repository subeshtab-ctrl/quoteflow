import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type EmailOtpType } from '@supabase/supabase-js';
import { syncUserAndOrganization } from '@/lib/supabase/auth-sync';

async function triggerWelcomeEmailPostVerification(user: any) {
  try {
    const meta = user.user_metadata || {};
    if (meta.welcome_email_sent_at || meta.emailWelcomeSentAt) {
      return;
    }

    const { createAdminClient } = await import('@/lib/supabase/service-role');
    const admin = createAdminClient();
    if (!admin) return;

    const { data: dbUserData } = await admin.auth.admin.getUserById(user.id);
    const dbMeta = dbUserData?.user?.user_metadata || meta;
    if (dbMeta.welcome_email_sent_at || dbMeta.emailWelcomeSentAt) {
      return;
    }

    const orgId = dbMeta.organization_id;
    if (!orgId) return;

    const nowIso = new Date().toISOString();
    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...dbMeta,
        welcome_email_sent_at: nowIso,
        emailWelcomeSentAt: nowIso,
      },
    });

    const { sendWelcomeEmailIfEligible } = await import('@/lib/welcome/welcome-service');
    await sendWelcomeEmailIfEligible({
      organizationId: orgId,
      userId: user.id,
      ownerName: dbMeta.full_name || dbMeta.name || user.email?.split('@')[0],
      email: user.email || '',
      businessName: dbMeta.company_name || 'Your Business',
      userRole: dbMeta.role || 'OWNER',
    });
  } catch (err) {
    console.warn('Welcome email trigger post-verification note:', err);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // If Supabase passed an error directly
  if (error || errorDescription) {
    console.error('Supabase auth callback error:', error, errorDescription);
    const msg = errorDescription || error || 'Authentication failed.';
    return NextResponse.redirect(`${origin}/verify-email?error=${encodeURIComponent(msg)}`);
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/verify-email?verified=true`);
  }

  // Collect cookies to attach directly to the HTTP redirect response
  const cookiesToSetLater: Array<{ name: string; value: string; options?: any }> = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookiesToSetLater.push({ name, value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Ignore in server route handler
          }
        });
      },
    },
  });

  const createRedirectWithCookies = (url: string) => {
    const res = NextResponse.redirect(url);
    cookiesToSetLater.forEach(({ name, value, options }) => {
      res.cookies.set(name, value, options);
    });
    return res;
  };

  // 1. Handle token_hash verification (standard Supabase email confirmation link)
  if (token_hash && type) {
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!verifyErr && data.user) {
      // Strict 10-minute verification link expiry check
      const linkSentAt = data.user.user_metadata?.verification_link_sent_at;
      if (linkSentAt && (type === 'signup' || type === 'email' || type === 'magiclink')) {
        const elapsed = Date.now() - new Date(linkSentAt).getTime();
        if (elapsed > 10 * 60 * 1000) {
          return createRedirectWithCookies(
            `${origin}/verify-email?email=${encodeURIComponent(data.user.email || '')}&error=${encodeURIComponent('This verification link has expired (10-minute limit). Please request a new link.')}`
          );
        }
      }

      // Sync user profile & organization in-process
      await syncUserAndOrganization({
        userId: data.user.id,
        email: data.user.email,
        fullName:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          '',
        companyName: data.user.user_metadata?.company_name || '',
      });

      // Dispatch welcome email strictly post-verification (exactly once)
      await triggerWelcomeEmailPostVerification(data.user);

      // If user came from password recovery, route to recovery destination
      if (type === 'recovery' || next?.includes('reset-password')) {
        return createRedirectWithCookies(`${origin}${next}`);
      }

      // Email verification link success -> ALWAYS route to /verify-email celebration page!
      const userEmail = data.user.email || '';
      return createRedirectWithCookies(
        `${origin}/verify-email?email=${encodeURIComponent(userEmail)}&verified=true`
      );
    }

    if (verifyErr) {
      console.error('Error verifying token_hash in callback:', verifyErr);
      return createRedirectWithCookies(
        `${origin}/verify-email?error=${encodeURIComponent(verifyErr.message)}`
      );
    }
  }

  // 2. Handle PKCE code exchange (Google OAuth, OAuth providers, PKCE email confirmation flow)
  if (code) {
    try {
      const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

      if (!exchangeErr && data.user) {
        // Sync user profile & organization in-process
        const resolvedName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.user_metadata?.user_name ||
          '';
        const companyName = data.user.user_metadata?.company_name || '';

        await syncUserAndOrganization({
          userId: data.user.id,
          email: data.user.email,
          fullName: resolvedName,
          companyName: companyName,
        });

        // Dispatch welcome email strictly post-verification (exactly once)
        await triggerWelcomeEmailPostVerification(data.user);

        // Determine if user authenticated via pure OAuth (Google) vs Email verification
        const isOAuth =
          data.user.app_metadata?.provider === 'google' ||
          data.user.app_metadata?.provider !== 'email' ||
          Boolean(data.user.identities?.some((id: any) => id.provider === 'google' || id.provider !== 'email'));

        // Strict 10-minute verification link expiry check for email flow
        const linkSentAt = data.user.user_metadata?.verification_link_sent_at;
        if (linkSentAt && !isOAuth) {
          const elapsed = Date.now() - new Date(linkSentAt).getTime();
          if (elapsed > 10 * 60 * 1000) {
            return createRedirectWithCookies(
              `${origin}/verify-email?email=${encodeURIComponent(data.user.email || '')}&error=${encodeURIComponent('This verification link has expired (10-minute limit). Please request a new link.')}`
            );
          }
        }

        // Password recovery flow
        if (type === 'recovery' || next?.includes('reset-password')) {
          return createRedirectWithCookies(`${origin}${next}`);
        }

        // Pure Google OAuth login/signup -> proceed straight to destination or dashboard
        if (isOAuth && next && next !== '/dashboard') {
          return createRedirectWithCookies(`${origin}${next}`);
        }
        if (isOAuth) {
          return createRedirectWithCookies(`${origin}/dashboard`);
        }

        // Email signup verification flow -> ALWAYS route to /verify-email celebration page!
        const userEmail = data.user.email || '';
        return createRedirectWithCookies(
          `${origin}/verify-email?email=${encodeURIComponent(userEmail)}&verified=true`
        );
      }

      if (exchangeErr) {
        console.error('Error exchanging code for session:', exchangeErr);
        return createRedirectWithCookies(
          `${origin}/verify-email?error=${encodeURIComponent(exchangeErr.message)}`
        );
      }
    } catch (err: any) {
      console.error('Error in exchangeCodeForSession:', err);
      return createRedirectWithCookies(
        `${origin}/verify-email?error=${encodeURIComponent(err.message || 'Authentication failed')}`
      );
    }
  }

  // Fallback: route to /verify-email or /login
  return createRedirectWithCookies(`${origin}/verify-email?verified=true`);
}
