import { LandingPageClient } from './landing-page-client';

export function LandingWrapper({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return <LandingPageClient isAuthenticated={isAuthenticated} />;
}
