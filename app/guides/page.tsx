import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'QuoteFlow Guides & Resources: Master Invoicing, Quotations, and Sales Workflows (2026)',
  description:
    'Free guides, tutorials, and masterclasses on writing quotations, understanding invoice vs quote differences, WhatsApp sales workflows, and tax compliance for small businesses and freelancers.',
  keywords: [
    'quotation guides',
    'invoicing tutorials',
    'quotation vs invoice guide',
    'how to write a quote',
    'whatsapp quotation guide',
    'small business invoicing resources',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/guides',
  },
  openGraph: {
    title: 'QuoteFlow Guides & Invoicing Knowledge Base (2026)',
    description:
      'Actionable guides to close deals faster, automate quotation drafting, and streamline tax invoices.',
    url: 'https://blendandbold.com/guides',
    siteName: 'QuoteFlow',
    type: 'website',
  },
};

const guides = [
  {
    title: 'Quotation vs Invoice: Key Differences, When to Use Each, and Best Practices',
    slug: 'quotation-vs-invoice',
    category: 'Sales & Invoicing',
    readTime: '7 min',
    updatedAt: 'Oct 18, 2026',
    desc: 'Confused between sending an estimate, quote, or invoice? Learn the legal, commercial, and tax differences, plus when to issue each document.',
    icon: FileText,
    badge: 'Popular',
  },
  {
    title: 'How to Write a Professional Quotation: Step-by-Step Guide + Checklist',
    slug: 'how-to-write-a-quotation',
    category: 'Sales & Strategy',
    readTime: '6 min',
    updatedAt: 'Oct 18, 2026',
    desc: 'Master the essential anatomy of winning quotes: itemization, HSN/SAC codes, tax modes (inclusive vs exclusive), and digital signatures.',
    icon: BookOpen,
    badge: 'Essential',
  },
  {
    title: 'The 1-Click WhatsApp Quotation Workflow: How to Close Deals 3x Faster',
    slug: 'whatsapp-quotation-workflow',
    category: 'Workflow & Automation',
    readTime: '5 min',
    updatedAt: 'Oct 18, 2026',
    desc: 'Why email PDF attachments fail to convert and how modern businesses use direct WhatsApp interactive quote links to close deals in minutes.',
    icon: MessageSquare,
    badge: 'Trending',
  },
];

export default function GuidesHubPage() {
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'QuoteFlow Guides & Invoicing Resources',
    description:
      'Free guides, tutorials, and masterclasses on writing quotations, understanding invoice vs quote differences, WhatsApp sales workflows, and tax compliance.',
    url: 'https://blendandbold.com/guides',
    publisher: {
      '@type': 'Organization',
      name: 'QuoteFlow',
      logo: {
        '@type': 'ImageObject',
        url: 'https://blendandbold.com/quoteflow-logo.png',
      },
    },
    hasPart: guides.map((g) => ({
      '@type': 'Article',
      headline: g.title,
      description: g.desc,
      url: `https://blendandbold.com/guides/${g.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <div className="min-h-screen bg-[#fcfdff] text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans relative overflow-x-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[720px] sm:w-[980px] h-[450px] bg-gradient-to-b from-indigo-200/35 via-violet-100/25 to-transparent blur-[120px] rounded-full" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/quoteflow-logo.png"
                alt="QuoteFlow"
                className="h-9 w-auto object-contain group-hover:scale-102 transition-transform"
              />
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors mr-2"
              >
                <span>Home</span>
              </Link>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold px-4 h-9 text-xs"
                >
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md shadow-indigo-600/20 rounded-xl px-4 h-9 text-xs gap-1.5 border border-indigo-500/20">
                  <span>Start Free</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 w-full relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Knowledge Base &amp; Masterclasses</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Quotation &amp; Invoicing Guides for Modern Teams
            </h1>

            <p className="text-sm sm:text-lg text-slate-600 leading-relaxed">
              Everything you need to write professional proposals, calculate statutory taxes accurately, and close client deals faster.
            </p>
          </div>

          {/* Guides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16">
            {guides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={guide.slug}
                  href={`/guides/${guide.slug}`}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {guide.badge}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                        <span>{guide.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {guide.readTime}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                        {guide.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-3">
                        {guide.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>Read Full Guide</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Competitor Comparisons Banner */}
          <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Software Comparisons
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Comparing QuoteFlow to Legacy Alternatives?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                See detailed feature-by-feature comparisons, transparent pricing breakdowns, and real user switch reasons.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/vs/pandadoc">
                <Button variant="outline" size="sm" className="text-xs rounded-xl shadow-2xs font-bold">
                  vs PandaDoc
                </Button>
              </Link>
              <Link href="/vs/zoho-invoice">
                <Button variant="outline" size="sm" className="text-xs rounded-xl shadow-2xs font-bold">
                  vs Zoho Invoice
                </Button>
              </Link>
              <Link href="/vs/freshbooks">
                <Button variant="outline" size="sm" className="text-xs rounded-xl shadow-2xs font-bold">
                  vs FreshBooks
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Trial Callout */}
          <section className="mt-16 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Put these guides into practice with QuoteFlow.
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200">
                Start your 14-day unrestricted free trial today. No credit card required.
              </p>
            </div>

            <div className="pt-2 relative z-10">
              <Link href="/register">
                <Button className="h-11 px-7 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-black text-xs sm:text-sm shadow-xl gap-2">
                  <span>Start Free 14-Day Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <Link href="/" className="flex items-center gap-2">
              <img src="/quoteflow-logo.png" alt="QuoteFlow" className="h-7 w-auto" />
            </Link>
            <div className="flex flex-wrap items-center gap-5 font-semibold text-slate-600">
              <Link href="/" className="hover:text-indigo-600">Home</Link>
              <Link href="/guides" className="hover:text-indigo-600">Guides</Link>
              <Link href="/vs/pandadoc" className="hover:text-indigo-600">Comparisons</Link>
              <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-indigo-600">Terms of Service</Link>
              <Link href="/register" className="hover:text-indigo-600">Start Free</Link>
            </div>
            <p>© 2026 QuoteFlow by blendandbold. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
