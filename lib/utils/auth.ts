/**
 * Returns a globally accessible redirect URL for Supabase Auth flows
 * ensuring mobile devices clicking confirmation links aren't routed to dead localhosts.
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // If the user is on a public domain (like trycloudflare or custom domain), use it
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${window.location.origin}/auth/callback`;
    }
  }

  // If local, prefer public tunnel URL if configured
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (publicAppUrl && !publicAppUrl.includes('localhost') && !publicAppUrl.includes('127.0.0.1')) {
    return `${publicAppUrl.replace(/\/$/, '')}/auth/callback`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return 'http://localhost:3001/auth/callback';
}
