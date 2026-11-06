import React from 'react';
import type { Metadata } from 'next';
import {
  ComparisonView,
  ComparisonFeature,
  ComparisonFaq,
} from '@/components/comparison/comparison-view';

export const metadata: Metadata = {
  title: 'QuoteFlow vs FreshBooks - Modern Quoting & Invoice Alternative (2026)',
  description:
    'Compare QuoteFlow vs FreshBooks. See why freelancers and contractors choose QuoteFlow for unlimited quotes and clients, conversational AI drafting, instant WhatsApp digital signatures, and flat $12/mo pricing.',
  keywords: [
    'QuoteFlow vs FreshBooks',
    'FreshBooks alternative',
    'best FreshBooks alternatives',
    'cheaper alternative to FreshBooks',
    'quotation software for freelancers',
    'quote to invoice software',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/vs/freshbooks',
  },
  openGraph: {
    title: 'QuoteFlow vs FreshBooks (2026 Comparison & Modern Alternative)',
    description:
      'Avoid FreshBooks client limits and high monthly fees. QuoteFlow gives you unlimited quotes, digital signatures, and AI drafting for $12/mo.',
    url: 'https://blendandbold.com/vs/freshbooks',
    siteName: 'QuoteFlow',
    type: 'website',
  },
};

const features: ComparisonFeature[] = [
  {
    name: 'Natural Language AI Quote Generator',
    desc: 'Speak or type what you need; AI drafts complete itemized quotes with taxes and discounts.',
    quoteflow: 'Included (AI Copilot)',
    competitor: 'Manual entry only',
    highlight: true,
  },
  {
    name: 'Client Volume Limits',
    desc: 'How many active clients you can bill and quote each month.',
    quoteflow: 'Unlimited clients & quotes',
    competitor: '5 to 50 clients on lower tiers ($19–$33/mo)',
    highlight: true,
  },
  {
    name: 'Client Approval & Digital Signing',
    desc: 'How easily your client opens, reviews, and signs the proposal.',
    quoteflow: 'Zero-signup link on WhatsApp & Email + optional PIN',
    competitor: 'Standard web view / email',
    highlight: true,
  },
  {
    name: 'In-Quote Negotiation Chat',
    desc: 'Real-time two-way messaging between you and client on the quote page.',
    quoteflow: 'Built-in real-time chat & audit log',
    competitor: 'Basic comment notes',
  },
  {
    name: '1-Click Quote to Tax Invoice Conversion',
    desc: 'Convert approved quotes into official sequential tax invoices.',
    quoteflow: '1-Click instant conversion',
    competitor: 'Available',
  },
  {
    name: 'Payment Methods Supported',
    desc: 'Direct payment options embedded on quotes and invoices.',
    quoteflow: 'UPI QR, Crypto (USDT/BTC/ETH), Bank transfer',
    competitor: 'FreshBooks Payments & Stripe only',
  },
  {
    name: 'Tax Compliance (GST & VAT)',
    desc: 'Automated tax logic for domestic and cross-border transactions.',
    quoteflow: 'Indian GST (CGST/SGST/IGST) + International VAT',
    competitor: 'Basic sales tax',
  },
  {
    name: 'Real-time View Tracking',
    desc: 'Instant alerts when a client views your proposal.',
    quoteflow: 'Included with 1-hour session tracking',
    competitor: 'Included',
  },
  {
    name: 'Monthly Pricing',
    desc: 'Subscription cost without hidden add-on fees.',
    quoteflow: '14-Day Free Trial, then ₹149/mo (India) or $12/mo (Global)',
    competitor: '$19 to $60+/month',
    highlight: true,
  },
];

const switchReasons = [
  {
    title: 'Zero Client Caps or Penalties',
    desc: 'FreshBooks limits entry-level plans to just 5 or 50 billable clients, forcing costly upgrades as you grow. QuoteFlow includes unlimited quotes, invoices, and clients from day one.',
    icon: 'price' as const,
  },
  {
    title: 'Instant AI Drafting from Plain Text',
    desc: 'Create polished, itemized quotes in seconds by chatting with QuoteFlow AI. Say goodbye to repetitive item-by-item manual entry.',
    icon: 'ai' as const,
  },
  {
    title: 'Live Client Negotiation Chat',
    desc: 'Close deals faster by resolving client questions directly on their quote link. No fragmented email chains or miscommunication.',
    icon: 'speed' as const,
  },
];

const faqs: ComparisonFaq[] = [
  {
    q: 'Why should I switch from FreshBooks to QuoteFlow?',
    a: 'FreshBooks is primarily a full-suite bookkeeping and time-tracking tool that restricts your client count on cheaper plans ($19 to $33/mo). QuoteFlow is laser-focused on the quote-to-cash workflow: create quotes with AI, get clients to sign on WhatsApp with zero login friction, chat in real time, and convert to tax invoices for just $12/month with unlimited clients.',
  },
  {
    q: 'Does QuoteFlow charge extra per client like FreshBooks?',
    a: 'No. QuoteFlow has no client caps. You can create unlimited quotations and send them to unlimited clients without paying a penny more.',
  },
  {
    q: 'Can my clients pay using cryptocurrency or UPI in QuoteFlow?',
    a: 'Yes. QuoteFlow natively supports modern payment rails including Indian UPI QR codes and crypto payments (USDT TRC20, Bitcoin, Ethereum) alongside traditional direct bank transfer details.',
  },
  {
    q: 'Can I export professional PDFs in QuoteFlow?',
    a: 'Yes. With one tap, download clean, branded PDF quotations and invoices featuring your company logo, legal digital signature, tax breakdown, and payment details.',
  },
];

export default function FreshBooksComparisonPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <ComparisonView
        competitorName="FreshBooks"
        competitorSlug="freshbooks"
        headline="QuoteFlow vs FreshBooks: Unlimited Quotes, Zero Client Caps"
        subheadline="Why pay $19 to $60/month with client caps? QuoteFlow delivers conversational AI quoting, unlimited clients, WhatsApp approvals, and live negotiation chat for $12/mo."
        competitorPriceRange="$19 – $60 /month (Client Limits Apply)"
        features={features}
        switchReasons={switchReasons}
        faqs={faqs}
      />
    </>
  );
}
