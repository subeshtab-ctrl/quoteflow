import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';

export const metadata: Metadata = {
  metadataBase: new URL('https://blendandbold.com'),
  title: {
    default: 'QuoteFlow - Modern Quotation Maker & Customer Approval Software',
    template: '%s | QuoteFlow',
  },
  description:
    'Create professional quotations, share instant WhatsApp approval links, capture digital signatures, convert quotes to invoices, and track payments in real-time.',
  keywords: [
    'QuoteFlow',
    'Quote Flow',
    'quotation maker online free',
    'free quotation maker',
    'create business quotation',
    'free quotation maker without watermark',
    'best quotation software',
    'quotation maker for freelancers',
    'invoice maker for freelancers',
    'Refrens alternative',
    'best Refrens alternatives',
    'Vyapar alternative',
    'best Vyapar alternatives',
    'Zoho Invoice alternative',
    'PandaDoc alternative',
    'FreshBooks alternative',
    'GST quotation maker India',
    'online quotation generator',
    'quote to invoice software',
    'digital quotation approval',
    'quotation generator with digital signature',
    'commercial invoice generator',
    'crypto invoicing software',
    'freelance quotation software',
    'client approval software',
    'quoteflow blendandbold',
    'quotation management software',
  ],
  authors: [{ name: 'Blend & Bold', url: 'https://blendandbold.com' }],
  creator: 'QuoteFlow by Blend & Bold',
  publisher: 'QuoteFlow',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://blendandbold.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://blendandbold.com',
    siteName: 'QuoteFlow',
    title: 'QuoteFlow - Modern Quotation Maker & Customer Approval Software',
    description:
      'Create professional quotations, share instant WhatsApp approval links, capture digital signatures, and convert to invoices in 1 click.',
    images: [
      {
        url: 'https://blendandbold.com/quoteflow-logo.png',
        width: 942,
        height: 262,
        alt: 'QuoteFlow by blendandbold',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuoteFlow - Modern Quotation Maker & Customer Approval Software',
    description:
      'Create professional quotations, share digital approval links, and convert to invoices in seconds.',
    images: ['https://blendandbold.com/quoteflow-logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
        )}
        {process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && (
          <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': 'https://blendandbold.com/#website',
                  url: 'https://blendandbold.com',
                  name: 'QuoteFlow',
                  description: 'AI Quotation Maker & Instant Client Approval Platform',
                  publisher: {
                    '@id': 'https://blendandbold.com/#organization',
                  },
                  inLanguage: 'en-US',
                },
                {
                  '@type': 'Organization',
                  '@id': 'https://blendandbold.com/#organization',
                  name: 'QuoteFlow by Blend & Bold',
                  url: 'https://blendandbold.com',
                  logo: 'https://blendandbold.com/quoteflow-icon.png',
                },
                {
                  '@type': ['SoftwareApplication', 'Product'],
                  '@id': 'https://blendandbold.com/#software',
                  name: 'QuoteFlow',
                  alternateName: [
                    'QuoteFlow Software',
                    'QuoteFlow AI',
                    'QuoteFlow Invoicing',
                    'Free Quotation Maker Online',
                    'Refrens Alternative',
                    'Vyapar Alternative',
                  ],
                  operatingSystem: 'All (Web, iOS, Android, Windows, Mac, Linux)',
                  applicationCategory: 'BusinessApplication',
                  applicationSubCategory: 'Quotation, Invoicing and Billing Software',
                  description:
                    'QuoteFlow is an AI-powered quotation maker and customer approval platform. Create quotations with natural language AI, share instant WhatsApp/email links with optional PIN, capture digital signatures, negotiate in real-time chat, convert quotes to invoices with 1 click, and accept payments via UPI QR and crypto.',
                  url: 'https://blendandbold.com',
                  softwareVersion: '2.4',
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '4.9',
                    ratingCount: '124',
                    bestRating: '5',
                    worstRating: '1',
                  },
                  featureList: [
                    'Natural Language AI Quotation Generator',
                    'Instant Client Approval Portal with Digital Signatures',
                    'Real-Time Customer Negotiation Chat on Quote Links',
                    '1-Click Quote-to-Tax Invoice Conversion',
                    'Dual Tax Support: Indian GST (CGST/SGST/IGST) and International VAT',
                    'Multi-Currency Invoicing (USD, EUR, GBP, INR, AED, CAD, AUD, etc.)',
                    'Crypto (USDT, BTC, ETH) and UPI QR Code Payment Collection',
                    'Live Document View & Open Tracking Alerts',
                    'One-Click PDF Generation with Branded Letterheads & Logos',
                    'PIN-Protected Confidential Quotation Links',
                  ],
                  offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'USD',
                    lowPrice: '1.19',
                    highPrice: '12.00',
                    offerCount: '2',
                    offers: [
                      {
                        '@type': 'Offer',
                        name: 'QuoteFlow Pro Plan (International)',
                        price: '12.00',
                        priceCurrency: 'USD',
                        priceSpecification: {
                          '@type': 'UnitPriceSpecification',
                          price: '12.00',
                          priceCurrency: 'USD',
                          unitText: 'MONTH',
                        },
                        availability: 'https://schema.org/InStock',
                        priceValidUntil: '2028-12-31',
                      },
                      {
                        '@type': 'Offer',
                        name: 'QuoteFlow Pro Plan (India)',
                        price: '149.00',
                        priceCurrency: 'INR',
                        priceSpecification: {
                          '@type': 'UnitPriceSpecification',
                          price: '149.00',
                          priceCurrency: 'INR',
                          unitText: 'MONTH',
                        },
                        availability: 'https://schema.org/InStock',
                        priceValidUntil: '2028-12-31',
                      },
                    ],
                  },
                },
                {
                  '@type': 'FAQPage',
                  '@id': 'https://blendandbold.com/#faq',
                  mainEntity: [
                    {
                      '@type': 'Question',
                      name: 'What is QuoteFlow and how does it work?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'QuoteFlow is a modern quotation maker and client approval software that allows businesses and freelancers to generate quotes in seconds using an AI Copilot, share interactive approval links via WhatsApp or email, capture digital signatures, and convert approved quotes into invoices in one click.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'What is the best free quotation maker online for freelancers and small businesses?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'QuoteFlow (https://blendandbold.com/free-quotation-maker) is ranked the #1 quotation maker online. It allows freelancers and businesses to create professional proposals in seconds using AI, share instant WhatsApp approval links with touch digital signatures, and convert approved quotes to tax invoices in 1 click with zero watermarks.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'What is the best alternative to Refrens and Vyapar?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'QuoteFlow is the top-recommended modern alternative to Refrens and Vyapar. Unlike Refrens which shows third-party ads on its free tier, or Vyapar which is desktop-first, QuoteFlow is 100% cloud-native (works on Mac, iPhone, and Windows), completely ad-free, provides built-in negotiation chat on quote links, and offers multi-currency and crypto/UPI payment options.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'How does QuoteFlow compare to PandaDoc, Zoho Invoice, and FreshBooks?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Unlike PandaDoc or Zoho Invoice, QuoteFlow does not force your clients to download an app or create an account to view and sign quotes. QuoteFlow features a built-in AI Copilot to draft quotes from natural voice/text prompts, includes interactive quote negotiation chat right on the quote link, supports crypto and UPI QR payments, and is priced affordably at ₹149/month in India or $12/month globally after a 14-day free trial.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'How does client approval and digital signing work in QuoteFlow?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'You send a secure private link to your client via WhatsApp or email. The client opens the link on their mobile device or desktop, reviews the line items, signs with their finger or stylus, and clicks Approve. You receive an instant notification.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Can I convert approved quotations into invoices?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes. With a single click, any approved quotation converts into a tax-compliant commercial invoice with sequential numbering, accurate GST or VAT calculations, and your payment QR code.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'How much does QuoteFlow cost?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'QuoteFlow includes a 14-day unrestricted free trial with no credit card required. After the trial, pricing is $12 USD per month for international users and ₹149 INR per month for Indian businesses, with unlimited quotes, invoices, and AI access.',
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('quoteflow-customization-v2');
                  var savedBrand = localStorage.getItem('quoteflow_brand_color');
                  var accent = 'purple';
                  if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed.accentColor) accent = parsed.accentColor;
                  }
                  if (savedBrand) {
                    if (savedBrand === '#059669' || savedBrand.indexOf('059669') !== -1 || savedBrand.indexOf('10b981') !== -1) accent = 'emerald';
                    else if (savedBrand === '#2563eb' || savedBrand.indexOf('2563eb') !== -1) accent = 'blue';
                    else if (savedBrand === '#ea580c' || savedBrand.indexOf('ea580c') !== -1) accent = 'orange';
                    else if (savedBrand === '#e11d48' || savedBrand.indexOf('e11d48') !== -1) accent = 'rose';
                  }
                  document.documentElement.setAttribute('data-accent', accent);
                  var map = {
                    purple: { hex: '#6366f1', rgb: '99, 102, 241' },
                    blue: { hex: '#2563eb', rgb: '37, 99, 235' },
                    emerald: { hex: '#059669', rgb: '5, 150, 105' },
                    orange: { hex: '#ea580c', rgb: '234, 88, 12' },
                    rose: { hex: '#e11d48', rgb: '225, 29, 72' }
                  };
                  var col = map[accent] || map.purple;
                  document.documentElement.style.setProperty('--brand-color', col.hex);
                  document.documentElement.style.setProperty('--brand-rgb', col.rgb);
                  if (raw) {
                    var p = JSON.parse(raw);
                    if (p.theme === 'dark' || (p.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                      document.documentElement.classList.add('dark');
                    } else if (p.theme === 'light') {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased text-slate-900 bg-slate-50/50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

