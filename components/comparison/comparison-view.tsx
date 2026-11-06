'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  Check,
  Bot,
  CreditCard,
  Share2,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ComparisonFeature {
  name: string;
  desc: string;
  quoteflow: string | boolean;
  competitor: string | boolean;
  highlight?: boolean;
}

export interface ComparisonFaq {
  q: string;
  a: string;
}

export interface ComparisonPageProps {
  competitorName: string;
  competitorSlug: string;
  headline: string;
  subheadline: string;
  competitorPriceRange: string;
  features: ComparisonFeature[];
  switchReasons: {
    title: string;
    desc: string;
    icon: 'speed' | 'ai' | 'price';
  }[];
  faqs: ComparisonFaq[];
}

export function ComparisonView({
  competitorName,
  competitorSlug,
  headline,
  subheadline,
  competitorPriceRange,
  features,
  switchReasons,
  faqs,
}: ComparisonPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[720px] sm:w-[980px] h-[450px] bg-gradient-to-b from-indigo-200/40 via-violet-100/30 to-transparent blur-[120px] rounded-full" />
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
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
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
                <span>Start Free Trial</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="pt-12 sm:pt-20 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Honest 2026 Comparison</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            {headline}
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {subheadline}
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button className="h-11 px-7 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 border border-indigo-500/20 gap-2">
                <span>Try QuoteFlow Free for 14 Days</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-xs text-slate-400 font-semibold self-center sm:ml-2">
              No credit card required • Cancel anytime
            </span>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="py-10 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="p-4 sm:p-5 font-bold text-slate-500 uppercase tracking-wider text-[11px] sm:text-xs">
                      Feature &amp; Capability
                    </th>
                    <th className="p-4 sm:p-5 font-black text-indigo-700 bg-indigo-50/60 border-x border-indigo-100 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg">QuoteFlow</span>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                          Recommended
                        </span>
                      </div>
                    </th>
                    <th className="p-4 sm:p-5 font-bold text-slate-700 min-w-[200px]">
                      <span className="text-base sm:text-lg">{competitorName}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {/* Pricing Row */}
                  <tr className="bg-indigo-50/20 font-semibold">
                    <td className="p-4 sm:p-5 text-slate-900 font-bold">
                      <div>Starting Price &amp; Subscription</div>
                      <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                        Transparency, commitment, and included volume
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 bg-indigo-50/40 border-x border-indigo-100 font-extrabold text-emerald-700">
                      <div>14-Day Free Trial</div>
                      <div className="text-xs text-slate-700 font-bold mt-0.5">
                        Then ₹149/mo (India) or $12/mo (Global)
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        Unlimited quotes, invoices &amp; AI
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-700">
                      <div className="font-bold text-red-600">{competitorPriceRange}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Often per user/month + feature add-ons
                      </div>
                    </td>
                  </tr>

                  {/* Dynamic Feature Rows */}
                  {features.map((feat, idx) => (
                    <tr
                      key={idx}
                      className={feat.highlight ? 'bg-indigo-50/10' : undefined}
                    >
                      <td className="p-4 sm:p-5 font-semibold text-slate-900">
                        <div>{feat.name}</div>
                        <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                          {feat.desc}
                        </div>
                      </td>

                      {/* QuoteFlow cell */}
                      <td className="p-4 sm:p-5 bg-indigo-50/30 border-x border-indigo-100 font-bold text-slate-900">
                        {typeof feat.quoteflow === 'boolean' ? (
                          feat.quoteflow ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>Included</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span>No</span>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{feat.quoteflow}</span>
                          </div>
                        )}
                      </td>

                      {/* Competitor cell */}
                      <td className="p-4 sm:p-5 text-slate-600">
                        {typeof feat.competitor === 'boolean' ? (
                          feat.competitor ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>Included</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                              <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                              <span>Not included</span>
                            </div>
                          )
                        ) : (
                          <span>{feat.competitor}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trademark & Data Disclaimer */}
          <p className="text-[11px] text-slate-400 text-center mt-3 max-w-4xl mx-auto leading-relaxed">
            <strong>Disclaimer:</strong> {competitorName} is a trademark or registered trademark of its respective owner. Comparison details are compiled from publicly available pricing and documentation as of October 2026 for informational purposes only. QuoteFlow has no affiliation with, sponsorship by, or endorsement from {competitorName}.
          </p>
        </section>

        {/* 3 Pillars / Reasons to Switch */}
        <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Why Businesses Switch from {competitorName} to QuoteFlow
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Modern workflow enhancements designed for speed and real results:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {switchReasons.map((reason, idx) => {
              const Icon =
                reason.icon === 'speed'
                  ? Clock
                  : reason.icon === 'ai'
                  ? Bot
                  : CreditCard;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3"
                >
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {reason.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {reason.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Questions &amp; Answers</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 bg-slate-50/40 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-indigo-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-4 sm:p-5 pt-3 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl mx-auto space-y-3 relative z-10">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Switch to QuoteFlow today.
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
          </div>
        </section>
        {/* Compare All Tools */}
        <section className="py-8 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-500">Compare Other Alternatives:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/vs/refrens"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold text-slate-700 transition-colors"
              >
                vs Refrens
              </Link>
              <Link
                href="/vs/vyapar"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold text-slate-700 transition-colors"
              >
                vs Vyapar
              </Link>
              <Link
                href="/vs/zoho-invoice"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold text-slate-700 transition-colors"
              >
                vs Zoho Invoice
              </Link>
              <Link
                href="/vs/pandadoc"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold text-slate-700 transition-colors"
              >
                vs PandaDoc
              </Link>
              <Link
                href="/vs/freshbooks"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 text-xs font-bold text-slate-700 transition-colors"
              >
                vs FreshBooks
              </Link>
            </div>
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
            <Link href="/#compare" className="hover:text-indigo-600">All Comparisons</Link>
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
