/**
 * Returns the base public application URL
 */
export function getBaseAppUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return window.location.origin;
    }
  }

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (publicAppUrl && !publicAppUrl.includes('localhost') && !publicAppUrl.includes('127.0.0.1')) {
    return publicAppUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'https://www.blendandbold.com';
}

/**
 * Returns a globally accessible redirect URL for Supabase Auth flows
 * ensuring mobile devices clicking confirmation links aren't routed to dead localhosts.
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const base = getBaseAppUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

