import { LandingPageClient } from '@/components/landing/landing-page-client';

export const revalidate = 3600;

export default function HomePage() {
  return <LandingPageClient isAuthenticated={false} />;
}

