import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  FileText,
  CheckCircle2,
  Share2,
  Receipt,
  CreditCard,
  Lock,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Check,
  Smartphone,
  Bot,
  Star,
  Zap,
  Globe,
  Building2,
  Users,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Free Quotation Maker Online - Create Business Quotations in 10s',
  description:
    'Free online quotation maker. Create professional business quotations, estimates, and proposals in seconds. No watermarks, built-in AI assistant, instant WhatsApp approval links with digital signature, and 1-click invoice conversion. Loved by freelancers & businesses.',
  keywords: [
    'Quotation maker online free',
    'Free Quotation Maker',
    'Create Business Quotation',
    'free business quotation maker',
    'online quotation generator',
    'quotation maker for freelancers',
    'free quotation maker without watermark',
    'estimate maker online',
    'quote to invoice maker free',
    'Refrens alternative',
    'Vyapar alternative',
    'Zoho Invoice alternative',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/free-quotation-maker',
  },
  openGraph: {
    title: 'Free Quotation Maker Online - Create Business Quotations (QuoteFlow)',
    description:
      'Create professional quotations in seconds with AI. Share instant WhatsApp approval links, capture digital signatures, and convert to tax invoices in 1 click.',
    url: 'https://blendandbold.com/free-quotation-maker',
    siteName: 'QuoteFlow',
    type: 'website',
  },
};

export default function FreeQuotationMakerPage() {
  const steps = [
    {
      num: '01',
      title: 'Enter Item Details or Speak to AI',
      desc: 'Add products, rates, quantities, and taxes manually, or type a single sentence into the AI Copilot to generate your entire itemized proposal in seconds.',
    },
    {
      num: '02',
      title: 'Share Instant WhatsApp or Email Link',
      desc: 'Send a clean, mobile-optimized link directly to your client via WhatsApp. They review the quotation on any smartphone without downloading an app.',
    },
    {
      num: '03',
      title: 'Collect Digital Signatures & Convert to Invoice',
      desc: 'Your client approves and signs with their finger. With a single tap, convert the signed quotation into a GST/VAT compliant commercial invoice.',
    },
  ];

  const features = [
    {
      icon: ShieldCheck,
      title: 'No Watermarks & 100% Ad-Free',
      desc: 'Your brand takes center stage. Download clean, print-safe PDFs with your logo and business colors without annoying third-party ads or watermarks.',
    },
    {
      icon: Smartphone,
      title: 'WhatsApp Approval with E-Signature',
      desc: 'Clients sign and approve directly on mobile within 30 seconds. No printing, scanning, or email ping-pong required.',
    },
    {
      icon: Bot,
      title: 'Conversational AI Copilot',
      desc: 'Draft quotes by talking in natural language. Describe your deliverables and pricing, and let AI calculate subtotals, discounts, and taxes.',
    },
    {
      icon: Receipt,
      title: '1-Click Quote to Tax Invoice',
      desc: 'Never re-type customer data. Approved quotations convert directly to tax invoices, delivery notes, and receipts in 1 click.',
    },
    {
      icon: Globe,
      title: 'Dual GST & Global Multi-Currency',
      desc: 'Seamlessly calculate Indian GST (CGST/SGST/IGST) or International VAT. Bill in USD, EUR, GBP, AED, INR, and 50+ currencies.',
    },
    {
      icon: CreditCard,
      title: 'Integrated Payment Options',
      desc: 'Embed instant UPI QR codes (GPay, PhonePe, Paytm), direct bank transfer details, and crypto wallet addresses right on your proposal.',
    },
  ];

  const faqs = [
    {
      q: 'Is this quotation maker truly free to try?',
      a: 'Yes! QuoteFlow offers a 14-day unrestricted free trial with no credit card required. You can create unlimited quotations, export water-mark free PDFs, send WhatsApp approval links, capture digital signatures, and convert quotes to invoices.',
    },
    {
      q: 'Will my downloaded quotation PDFs have watermarks?',
      a: 'Never. Unlike other free quotation tools that slap their branding or watermarks across your document, QuoteFlow produces 100% clean, professional, branded PDFs featuring only your company logo and details.',
    },
    {
      q: 'How does client approval and digital signing work?',
      a: 'QuoteFlow generates a secure, private client link for each quote. You can share this link on WhatsApp or email. Your client opens the link on their mobile phone or PC, reviews line items, draws their signature with a finger or mouse, and taps Approve. You receive an instant alert.',
    },
    {
      q: 'How is QuoteFlow better than Refrens or Vyapar?',
      a: 'QuoteFlow is completely ad-free, 100% cloud-native (works on Mac, iPhone, Android, and Windows without desktop installs), features an AI Copilot that drafts quotes in 10 seconds, provides built-in client negotiation chat on the quote page, and supports UPI QR and crypto payments.',
    },
    {
      q: 'Can I convert my quotation into a GST Tax Invoice?',
      a: 'Yes. Once a quotation is approved, you can convert it to an official sequential GST Tax Invoice with a single click. The invoice automatically calculates CGST, SGST, or IGST based on your client state code.',
    },
    {
      q: 'What happens after the 14-day free trial?',
      a: 'You can continue using QuoteFlow for just ₹149/month in India or $12/month globally. Pricing is transparent, predictable, and includes unlimited quotations, invoices, clients, and AI Copilot access.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 selection:bg-indigo-600 selection:text-white font-sans relative overflow-x-hidden">
      {/* JSON-LD Structured Data for Search Engines & AI Overviews */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'QuoteFlow Free Quotation Maker Online',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'All (Web, iOS, Android, Mac, Windows)',
            url: 'https://blendandbold.com/free-quotation-maker',
            description:
              'Free online quotation maker to create professional business quotations, proposals, and estimates with instant WhatsApp approval links, digital signatures, and 1-click invoice conversion.',
            offers: {
              '@type': 'Offer',
              price: '0.00',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              priceValidUntil: '2028-12-31',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '124',
              bestRating: '5',
              worstRating: '1',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />

      {/* Ambient Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[180px] left-1/2 -translate-x-1/2 w-[720px] sm:w-[980px] h-[500px] bg-gradient-to-b from-indigo-200/40 via-violet-100/30 to-transparent blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/quoteflow-logo.png"
              alt="QuoteFlow Logo"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-600 hover:text-slate-900 rounded-xl font-bold px-4 h-9 text-xs"
              >
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md shadow-indigo-600/20 rounded-xl px-4 h-9 text-xs gap-1.5 border border-indigo-500/20">
                <span>Create Free Quote</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold tracking-wide shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>#1 Free Quotation Maker Online for Freelancers &amp; Businesses</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
          Free Quotation Maker Online. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Create Business Quotes in Seconds.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Easy to make. Professional templates. No watermarks. Instant WhatsApp approval links with digital signatures, automated GST/VAT calculations, and 1-click invoice conversion.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-indigo-600/25 gap-2 border border-indigo-500/30">
              <Sparkles className="h-4 w-4" />
              <span>Create Free Quotation Now</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-6 rounded-xl border-slate-300 font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign In to Your Account
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            No Watermark on PDFs
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            No Credit Card Required
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Digital Signatures Included
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            100% Ad-Free Experience
          </span>
        </div>
      </section>

      {/* 3 Steps Section */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Create &amp; Close Quotes in 3 Simple Steps
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            From initial draft to client signature in less than 2 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((st) => (
            <div
              key={st.num}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs relative space-y-3"
            >
              <span className="text-4xl font-black text-indigo-100 block">
                {st.num}
              </span>
              <h3 className="text-base font-bold text-slate-900">{st.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Key Features
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Everything You Need to Win Deals Faster
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Built from the ground up for freelancers, contractors, agencies, and small businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Competitor Comparison Callout */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 p-8 sm:p-10 shadow-sm space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Why Choose QuoteFlow?
            </span>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900">
              Comparing QuoteFlow vs Refrens, Vyapar &amp; Zoho
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Traditional tools either force you onto clunky desktop software (Vyapar), bombard your clients with promotional ads (Refrens), or charge exorbitant per-user fees (Zoho, PandaDoc). QuoteFlow gives you modern AI quotation creation, clean WhatsApp signatures, and flat fair pricing.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/vs/refrens">
              <Button variant="outline" className="text-xs font-bold rounded-xl border-slate-300 hover:border-indigo-600 hover:text-indigo-600 gap-1.5">
                <span>QuoteFlow vs Refrens</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/vs/vyapar">
              <Button variant="outline" className="text-xs font-bold rounded-xl border-slate-300 hover:border-indigo-600 hover:text-indigo-600 gap-1.5">
                <span>QuoteFlow vs Vyapar</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/vs/zoho-invoice">
              <Button variant="outline" className="text-xs font-bold rounded-xl border-slate-300 hover:border-indigo-600 hover:text-indigo-600 gap-1.5">
                <span>QuoteFlow vs Zoho Invoice</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <Link href="/vs/pandadoc">
              <Button variant="outline" className="text-xs font-bold rounded-xl border-slate-300 hover:border-indigo-600 hover:text-indigo-600 gap-1.5">
                <span>QuoteFlow vs PandaDoc</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Common Inquiries
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs"
            >
              <h3 className="text-sm font-bold text-slate-900">{faq.q}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 text-center space-y-5 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Start Creating Free Business Quotations Today
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-xl mx-auto">
            Join thousands of smart professionals closing deals faster with QuoteFlow. Free 14-day unrestricted trial. No credit card required.
          </p>
          <div className="pt-2">
            <Link href="/register">
              <Button className="h-12 px-8 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-black text-sm shadow-xl gap-2">
                <span>Create Free Quotation</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <Link href="/" className="flex items-center gap-2">
            <img src="/quoteflow-logo.png" alt="QuoteFlow" className="h-7 w-auto" />
          </Link>
          <div className="flex flex-wrap items-center gap-5 font-semibold text-slate-600">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <Link href="/vs/refrens" className="hover:text-indigo-600">vs Refrens</Link>
            <Link href="/vs/vyapar" className="hover:text-indigo-600">vs Vyapar</Link>
            <Link href="/vs/zoho-invoice" className="hover:text-indigo-600">vs Zoho</Link>
            <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-indigo-600">Terms</Link>
          </div>
          <p>© 2026 QuoteFlow by blendandbold. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
