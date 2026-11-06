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
  ShieldCheck,
  Smartphone,
  Bot,
  Zap,
  Globe,
  Briefcase,
  Users,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Invoice & Quotation Maker for Freelancers - QuoteFlow',
  description:
    'The modern invoice and quotation maker built specifically for freelancers, consultants, and independent agencies. Natural language AI quote generator, instant WhatsApp digital signatures, multi-currency invoicing, UPI & crypto payments, and 1-click tax invoice conversion.',
  keywords: [
    'invoice maker for freelancers',
    'quotation maker for freelancers',
    'freelance invoice generator',
    'best invoice software for freelancers',
    'free quotation maker for freelancers',
    'online invoice generator',
    'crypto invoice for freelancers',
    'FreshBooks alternative for freelancers',
    'Refrens alternative for freelancers',
    'freelance billing software',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/invoice-maker-for-freelancers',
  },
  openGraph: {
    title: 'Invoice & Quotation Maker for Freelancers - QuoteFlow',
    description:
      'Close freelance gigs 3x faster. Create quotes with AI, get approvals with digital signatures on WhatsApp, and receive payments via UPI or crypto.',
    url: 'https://blendandbold.com/invoice-maker-for-freelancers',
    siteName: 'QuoteFlow',
    type: 'website',
  },
};

export default function FreelancerInvoiceMakerPage() {
  const painPoints = [
    {
      title: 'No Clunky Accounting Jargon',
      desc: 'You do not need a degree in double-entry bookkeeping just to bill a client. QuoteFlow keeps quoting and invoicing clean, visual, and fast.',
    },
    {
      title: 'Close Deals Directly on WhatsApp',
      desc: 'Send a sleek, responsive proposal link. Your client signs with their finger and approves in seconds right from their smartphone.',
    },
    {
      title: 'Accept International & Crypto Payments',
      desc: 'Freelancing for global clients? Bill in USD, EUR, or GBP, and accept direct bank wire or USDT crypto payments alongside Indian UPI QR codes.',
    },
    {
      title: 'Unlimited Clients Without Sudden Upcharges',
      desc: 'Unlike FreshBooks which caps you at 5 clients, QuoteFlow gives you unlimited clients, quotations, and invoices on all plans.',
    },
  ];

  const faqs = [
    {
      q: 'Why is QuoteFlow the best quotation and invoice maker for freelancers?',
      a: 'QuoteFlow is purpose-built for speed and client delight. It includes a built-in AI Copilot to draft project quotes in seconds, zero-friction WhatsApp approval links with touch digital signatures, real-time client negotiation chat, and support for multi-currency, UPI QR, and cryptocurrency payments.',
    },
    {
      q: 'Do my clients need to create an account or download an app to sign?',
      a: 'No! Your clients simply tap your WhatsApp or email link. It opens directly in their browser. They can review the milestone breakdown, sign with their finger or stylus, and tap Approve.',
    },
    {
      q: 'Can I accept cryptocurrency payments as a freelancer?',
      a: 'Yes. QuoteFlow supports USDT, Bitcoin, and Ethereum wallet configurations, allowing international freelance clients to settle invoices seamlessly.',
    },
    {
      q: 'How much does QuoteFlow cost for freelancers?',
      a: 'QuoteFlow includes a 14-day unrestricted free trial with no credit card required. Afterwards, it is just ₹149/month for Indian freelancers or $12/month globally, with unlimited quotes, invoices, and AI access.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 selection:bg-indigo-600 selection:text-white font-sans relative overflow-x-hidden">
      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'QuoteFlow Freelance Invoice & Quotation Maker',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'All (Web, iOS, Android, Mac, Windows)',
            url: 'https://blendandbold.com/invoice-maker-for-freelancers',
            description:
              'The fastest invoice and quotation maker for freelancers, solopreneurs, and creative agencies.',
            offers: {
              '@type': 'Offer',
              price: '0.00',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              priceValidUntil: '2028-12-31',
            },
          }),
        }}
      />

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
                <span>Start Free Trial</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-12 sm:pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-200/80 text-violet-700 text-xs font-bold tracking-wide">
          <Briefcase className="h-3.5 w-3.5 text-violet-600" />
          <span>Built for Freelancers, Creators &amp; Independent Agencies</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
          Invoice &amp; Quotation Maker <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Loved by Modern Freelancers.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Stop wrestling with clunky accounting software. Draft client proposals with AI, send WhatsApp approval links with e-signatures, and get paid faster via UPI or crypto.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-indigo-600/25 gap-2">
              <Sparkles className="h-4 w-4" />
              <span>Start Free 14-Day Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            No Credit Card Required
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Unlimited Freelance Clients
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            WhatsApp Finger Signatures
          </span>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-200/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {painPoints.map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Check className="h-4 w-4 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-slate-200/80">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Freelancer FAQ
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <Link href="/" className="flex items-center gap-2">
            <img src="/quoteflow-logo.png" alt="QuoteFlow" className="h-7 w-auto" />
          </Link>
          <div className="flex flex-wrap items-center gap-5 font-semibold text-slate-600">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <Link href="/free-quotation-maker" className="hover:text-indigo-600">Free Quotation Maker</Link>
            <Link href="/vs/refrens" className="hover:text-indigo-600">vs Refrens</Link>
            <Link href="/vs/vyapar" className="hover:text-indigo-600">vs Vyapar</Link>
            <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
          </div>
          <p>© 2026 QuoteFlow by blendandbold. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
