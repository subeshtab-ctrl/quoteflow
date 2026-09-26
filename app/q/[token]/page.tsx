import React from 'react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { store } from '@/lib/supabase/data-store';
import { PublicQuoteView } from '@/components/public-quote/public-quote-view';
import { headers } from 'next/headers';
import { Metadata } from 'next';

interface PublicQuotePageProps {
  params: Promise<{
    token: string;
  }>;
}

export async function generateMetadata({ params }: PublicQuotePageProps): Promise<Metadata> {
  const { token } = await params;
  const quote = await store.getQuotationByPublicToken(token);

  if (!quote) {
    return {
      title: 'Quotation Not Found | QuoteFlow',
    };
  }

  return {
    title: `Quotation ${quote.quotation_number} - ${quote.organization?.name || 'QuoteFlow'}`,
    description: `Review and approve quotation ${quote.quotation_number} for ${quote.title}`,
  };
}

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { token } = await params;
  const { activeQuotation, allQuotations } = await store.getCustomerPortalQuotationsByToken(token);

  if (!activeQuotation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200 space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900">Quotation Not Found</h1>
          <p className="text-sm text-slate-500">
            This quotation link may have expired, been revoked, or the URL address is incorrect.
            Please verify the link or contact the issuing business.
          </p>
        </div>
      </div>
    );
  }

  // Record customer view tracking on server
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || 'Unknown device';
  const ip = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || 'Unknown IP';

  await store.recordQuotationView(activeQuotation.id, {
    ip,
    userAgent,
  });

  // Re-fetch with fresh view state
  const updatedQuote = (await store.getQuotationByPublicToken(token)) || activeQuotation;

  return (
    <PublicQuoteView
      initialQuotation={updatedQuote}
      allQuotations={allQuotations}
      token={token}
    />
  );
}
