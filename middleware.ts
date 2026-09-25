import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Verify authenticated user from Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected paths that require authentication
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/quotations') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/templates');

  // Auth pages (login, register, forgot-password)
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password';

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
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image formats (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
