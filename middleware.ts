import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Protected application paths that require valid user authentication
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/quotations') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/training') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/templates') ||
    pathname.startsWith('/test') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/billing');

  // Auth pages (login, register, forgot-password)
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

  // Fast bypass: if not a protected path and not an auth page (e.g. /api/*, /q/*, /, /terms, /privacy, etc.)
  // return immediately without initializing Supabase Auth or making external network roundtrips.
  if (!isProtectedPath && !isAuthPage) {
    return response;
  }

  // Check if any Supabase authentication cookies exist
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) =>
      c.name.startsWith('sb-') ||
      c.name.includes('auth-token') ||
      c.name.includes('session')
  );

  // Fast Path 1: User accessing a protected route without any auth cookie -> redirect immediately
  // Eliminates Supabase client instantiation and external network call overhead (0ms CPU)
  if (isProtectedPath && !hasAuthCookie) {
    const redirectUrl = new URL('/login', request.url);
    const destination = pathname + (request.nextUrl.search || '');
    if (destination !== '/dashboard') {
      redirectUrl.searchParams.set('redirect', destination);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Fast Path 2: User accessing auth pages without any cookie -> render login/register immediately
  if (isAuthPage && !hasAuthCookie) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return response;
  }

  let user: any = null;

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                response.cookies.set(name, value, options);
              } catch {
                // Cookie may be too large — skip setting it
              }
            });
          } catch {
            // Ignore cookie setting failures
          }
        },
      },
    });

    const result = await supabase.auth.getUser();
    user = result.data?.user ?? null;
  } catch {
    user = null;
  }

  const mustChangePassword = Boolean(user?.user_metadata?.must_change_password);

  if (isProtectedPath) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url);
      const destination = pathname + (request.nextUrl.search || '');
      if (destination !== '/dashboard') {
        redirectUrl.searchParams.set('redirect', destination);
      }
      return NextResponse.redirect(redirectUrl);
    }

    // STRICT: Block unconfirmed users from accessing the app
    const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
    if (!isEmailConfirmed) {
      const errorMsg = 'Please verify your email address to access your workspace.';
      return NextResponse.redirect(
        new URL(
          `/verify-email?error=${encodeURIComponent(errorMsg)}&email=${encodeURIComponent(user.email || '')}`,
          request.url
        )
      );
    }

    // Force staff with temporary password to set their own password on first login
    if (mustChangePassword) {
      const setupUrl = new URL('/login', request.url);
      setupUrl.searchParams.set('setup_password', 'true');
      return NextResponse.redirect(setupUrl);
    }
  }

  if (user && isAuthPage) {
    const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at);
    if (isEmailConfirmed && !mustChangePassword) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match ONLY protected application routes and auth entry pages.
     * All /api/*, /q/*, landing pages, static files, and assets bypass
     * middleware entirely, reducing Vercel Edge Active CPU overhead to near zero.
     */
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/quotations/:path*',
    '/invoices/:path*',
    '/customers/:path*',
    '/products/:path*',
    '/reports/:path*',
    '/training/:path*',
    '/settings/:path*',
    '/templates/:path*',
    '/test/:path*',
    '/admin/:path*',
    '/billing/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
};
