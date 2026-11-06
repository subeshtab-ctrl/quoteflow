'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Share2,
  CheckCircle2,
  Check,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface GuideArticleProps {
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  slug: string;
  toc?: { id: string; title: string }[];
  faqs?: { q: string; a: string }[];
  relatedGuides?: { title: string; href: string; readTime: string; desc: string }[];
  children: React.ReactNode;
}

export function GuideArticleView({
  title,
  subtitle,
  category,
  readTime,
  publishedAt,
  updatedAt,
  slug,
  toc = [],
  faqs = [],
  relatedGuides = [],
  children,
}: GuideArticleProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      const url = `https://blendandbold.com/guides/${slug}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Subtle Gradient */}
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
              href="/guides"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors mr-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Guides</span>
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 w-full relative z-10">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-6">
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-indigo-600 transition-colors">
            Guides &amp; Resources
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold truncate max-w-xs sm:max-w-md">
            {title}
          </span>
        </nav>

        {/* Article Header */}
        <header className="space-y-4 pb-8 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="h-3 w-3" />
              {category}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {readTime} read
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              Updated {updatedAt}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
            {subtitle}
          </p>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                QF
              </div>
              <div>
                <p className="font-bold text-slate-800">QuoteFlow Editorial Team</p>
                <p className="text-[11px] text-slate-400">Expertise in Invoicing, GST/VAT &amp; Sales Workflows</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-1.5 text-xs rounded-xl shadow-2xs"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Share</span>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* Content Layout with Optional Sidebar TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-8">
          {/* Main Article Body */}
          <article className="lg:col-span-8 prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-strong:text-slate-900 prose-li:text-slate-600">
            {children}

            {/* FAQs Accordion within Article */}
            {faqs.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-200 not-prose space-y-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <span>Frequently Asked Questions</span>
                </h3>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform text-slate-400 ${
                              isOpen ? 'rotate-180 text-indigo-600' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </article>

          {/* Sticky Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Table of Contents */}
            {toc.length > 0 && (
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                  <span>In This Guide</span>
                </h4>
                <nav className="space-y-1.5 text-xs">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block py-1 px-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Quick Pitch Callout */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-900 to-violet-950 text-white p-5 shadow-lg space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-indigo-400/20">
                <Sparkles className="h-3 w-3 text-indigo-300" />
                <span>AI Quoting &amp; Invoicing</span>
              </div>
              <h4 className="font-bold text-sm text-white leading-snug">
                Close deals 3x faster with QuoteFlow.
              </h4>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Draft quotes using plain natural language, share directly via WhatsApp, get digital signatures, and convert to tax invoices in 1 click.
              </p>
              <Link href="/register" className="block pt-1">
                <Button className="w-full h-9 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-bold text-xs shadow-md gap-1.5">
                  <span>Start Free Trial</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {/* Related Guides */}
            {relatedGuides.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Related Guides
                </h4>
                <div className="space-y-3">
                  {relatedGuides.map((rg, idx) => (
                    <Link
                      key={idx}
                      href={rg.href}
                      className="block p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all group"
                    >
                      <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 leading-snug">
                        {rg.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {rg.desc}
                      </p>
                      <span className="text-[10px] font-semibold text-indigo-600 block mt-1">
                        {rg.readTime} read →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Bottom CTA Banner */}
        <section className="mt-16 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to modernize your quotation workflow?
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200">
              Start your 14-day unrestricted free trial. Experience instant AI quoting, client negotiation chat, and 1-click invoice conversion.
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
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 mt-12">
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
  );
}
