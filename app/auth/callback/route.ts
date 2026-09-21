import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // If Supabase passed an error directly
  if (error || errorDescription) {
    console.error('Supabase auth callback error:', error, errorDescription);
    const msg = errorDescription || error || 'Verification failed or expired.';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/login?verified=true`);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignore in server component / route handler
        }
      },
    },
  });

  // 1. Handle token_hash verification (standard Supabase email confirmation link)
  if (token_hash && type) {
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (!verifyErr && data.user) {
      // Sync metadata
      try {
        await fetch(`${origin}/api/auth/save-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name,
            companyName: data.user.user_metadata?.company_name,
          }),
        });
      } catch (saveErr) {
        console.warn('Sync user details note in callback:', saveErr);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    if (verifyErr) {
      console.error('Error verifying token_hash in callback:', verifyErr);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(verifyErr.message)}`
      );
    }
  }

  // 2. Handle PKCE code exchange
  if (code) {
    try {
      const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeErr && data.user) {
        try {
          await fetch(`${origin}/api/auth/save-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              fullName: data.user.user_metadata?.full_name,
              companyName: data.user.user_metadata?.company_name,
            }),
          });
        } catch (saveErr) {
          console.warn('Sync user details note in PKCE callback:', saveErr);
        }

        return NextResponse.redirect(`${origin}${next}`);
      }

      if (exchangeErr) {
        console.error('Error exchanging code for session:', exchangeErr);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent(exchangeErr.message)}`
        );
      }
    } catch (err: any) {
      console.error('Error in exchangeCodeForSession:', err);
    }
  }

  // Fallback to login with verified notification
  return NextResponse.redirect(`${origin}/login?verified=true`);
}
