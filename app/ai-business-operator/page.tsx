import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  Flame,
  Snowflake,
  TrendingUp,
  Target,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageSquare,
  FileText,
  Receipt,
  Users,
  Check,
  ChevronDown,
  Building2,
  Lock,
  Percent,
  Calendar,
  AlertTriangle,
  Bot,
  ExternalLink,
  Laptop,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUBSCRIPTION_CONFIG } from '@/lib/billing/subscription-config';

export const metadata: Metadata = {
  title: 'AI Business Operator for Quotations & Invoicing — QuoteFlow',
  description:
    'Meet QuoteFlow AI Business Operator: the autonomous AI engine that understands your business data, generates daily action plans, monitors deal temperatures, recovers lost quotes, detects discount leakage, and forecasts 30-day cash flow.',
  keywords: [
    'AI Business Operator',
    'AI Quotation Software',
    'Autonomous Sales Assistant',
    'Lead Recovery Software',
    'Quote to Cash AI',
    'Automated Quote Follow Up',
    'Sales Pipeline Deal Temperature',
    'Discount Leakage Analysis',
    '30 Day Cash Flow Projection',
    'WhatsApp Quote Automation',
    'Business Growth Assistant',
    'Small Business AI Operations',
    'Zoho Invoice Alternative',
    'Vyapar Alternative',
    'Refrens Alternative',
  ],
  alternates: {
    canonical: 'https://blendandbold.com/ai-business-operator',
  },
  openGraph: {
    title: 'QuoteFlow AI Business Operator — The AI That Runs Your Sales Operations',
    description:
      'Proactively track hot deal views, recover lost quotes, prioritize daily revenue actions, and forecast 30-day cash flow automatically with QuoteFlow AI.',
    url: 'https://blendandbold.com/ai-business-operator',
    siteName: 'QuoteFlow',
    type: 'website',
  },
};

export default function AiBusinessOperatorPage() {
  const faqs = [
    {
      q: 'What is QuoteFlow AI Business Operator?',
      a: 'QuoteFlow AI Business Operator is an intelligent sales operations assistant built directly into QuoteFlow. Unlike simple chatbots, it learns from your actual business data (quotes, client portal views, approval rates, invoices, payment history, and customer reorder intervals) to answer four critical questions every day: What is happening? What needs attention? Where are opportunities being lost? What should I do next?',
    },
    {
      q: 'How does the "What Should I Do Today?" Daily Action Plan work?',
      a: 'Every morning, the AI evaluates your entire active pipeline. It identifies hot quotes with client portal views, proposals approaching expiration, approved quotes waiting to be converted into invoices, overdue balances, and dormant clients ready for reorder. It compiles them into a prioritized list with 1-click WhatsApp and email follow-up actions.',
    },
    {
      q: 'Does QuoteFlow AI send messages to my customers automatically?',
      a: 'No. QuoteFlow operates under a strict Safe AI Action Protocol: it prepares accurate DRAFTS and tailored messages matching your brand tone, but requires your explicit human approval (or 1-click confirmation) before anything is sent or committed.',
    },
    {
      q: 'How does Deal Temperature (HOT / WARM / COLD) help close more sales?',
      a: 'When you send a quote via QuoteFlow, the client opens a branded digital portal. The AI tracks real-time engagement: quotes opened 2+ times or viewed in the last 48 hours are flagged as HOT with conversion scores up to 95%. Quotes sent over a week ago with zero views are marked COLD, alerting you to intervene before the deal is lost.',
    },
    {
      q: 'How does the Internal Lead Recovery Engine work?',
      a: 'Instead of spending more budget on cold advertising, QuoteFlow identifies revenue already inside your workspace: unopened proposals, quotes viewed without approval, quotes that expired in the last 30 days, and past clients who haven\'t placed an order within their regular cycle. You can revive expired quotes into fresh drafts with a single tap.',
    },
    {
      q: 'Is my business data private and isolated?',
      a: 'Yes, 100%. QuoteFlow operates with strict organization-level isolation (Multi-Tenant Security). Your business rules, customer notes, pricing models, and financial totals are never mixed with other companies and never used to train public models without authorization.',
    },
    {
      q: 'How does the 14-day free trial work?',
      a: `Every new organization receives full, unrestricted access to the AI Business Operator for 14 days without entering credit card details. After your trial, continue seamlessly at just ${SUBSCRIPTION_CONFIG.INDIA.formattedPrice}/mo in India or ${SUBSCRIPTION_CONFIG.GLOBAL.formattedPrice}/mo internationally.`,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Schema.org Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'QuoteFlow AI Business Operator',
            operatingSystem: 'All (Web, Mobile iOS, Android, Cloudflare Edge)',
            applicationCategory: 'BusinessApplication',
            description:
              'Autonomous AI business operator for quotations, sales pipeline intelligence, internal lead recovery, discount leakage detection, and 30-day cash flow projections.',
            offers: {
              '@type': 'Offer',
              price: '149.00',
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
              priceValidUntil: '2028-12-31',
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.9',
              ratingCount: '186',
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

      {/* Ambient Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[720px] sm:w-[1020px] h-[520px] bg-gradient-to-b from-indigo-500/25 via-purple-500/15 to-transparent blur-[140px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-[#070D18]/80 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/quoteflow-logo.png"
              alt="QuoteFlow Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#daily-plan" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Daily Action Plan
            </a>
            <a href="#pipeline" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Deal Temperatures
            </a>
            <a href="#recovery" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Lead Recovery
            </a>
            <a href="#cashflow" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Cash Flow Forecast
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-xl font-bold px-3.5 h-9 text-xs"
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
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold tracking-wide shadow-xs">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>The Next Evolution: From Creating Quotes to Running Your Sales Operations</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
          The AI That Understands Your Business <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
            and Helps You Run It.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Stop losing proposals to delayed follow-ups and uncollected invoices. QuoteFlow AI Business Operator continuously analyzes your real workspace data, detects client buying intent, recovers lost quotes, and forecasts 30-day cash flow.
        </p>

        {/* Operating Loop Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">1. UNDERSTAND</span>
          <span className="text-slate-400">→</span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">2. DETECT</span>
          <span className="text-slate-400">→</span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">3. RECOMMEND</span>
          <span className="text-slate-400">→</span>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">4. ACT</span>
          <span className="text-slate-400">→</span>
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-bold">5. LEARN</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-sm shadow-xl shadow-indigo-600/25 gap-2 border border-indigo-500/30">
              <Zap className="h-4 w-4" />
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#interactive-preview" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold text-sm border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 gap-2"
            >
              <span>Explore Interactive Live Plan</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>14-Day Free Trial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>No Credit Card Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Multi-Tenant Data Privacy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>WhatsApp &amp; Email Automation</span>
          </div>
        </div>
      </section>

      {/* Interactive Mock Preview Section */}
      <section id="interactive-preview" className="py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] p-5 sm:p-8 shadow-2xl space-y-6">
          {/* Header pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    What Should I Do Today? — Live Operator Plan
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Live Demo
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#A8B4CA]">
                  4 Prioritized revenue actions representing ₹2,87,000 at stake today
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-reconciles as clients sign &amp; pay</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Hot Quote */}
            <div className="p-4 rounded-2xl border border-orange-200/80 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  🔥 Urgent • 4 Portal Views
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">₹85,000</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Follow up with Alpha Technologies (Q-2026-HOT)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Client opened this quote 4 times in the portal. High buying intent detected.
                </p>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Expires in 2 days</span>
                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>1-Click WhatsApp</span>
                </Button>
              </div>
            </div>

            {/* Card 2: Approved Uninvoiced */}
            <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  ⚡ Ready to Invoice
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">₹1,20,000</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Create Invoice for Apex Infra (Q-2026-APP)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Client digitally signed and approved proposal. Convert into tax invoice now.
                </p>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Approved 3d ago</span>
                <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Draft Tax Invoice</span>
                </Button>
              </div>
            </div>

            {/* Card 3: Repeat Customer Cadence */}
            <div className="p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  🔄 Reorder Cadence Due
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">₹42,000</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Reorder Check-in: Zenith Global Logistics
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Zenith usually orders every ~45 days, but has not placed an order in 68 days.
                </p>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Cadence +23d</span>
                <Button size="sm" variant="outline" className="h-8 text-xs border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Draft Reorder Quote</span>
                </Button>
              </div>
            </div>

            {/* Card 4: Overdue Invoice Recovery */}
            <div className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  ⏰ 10 Days Overdue
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">₹40,000</span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Overdue Invoice: Beta Global (INV-2026-004)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  ₹40,000 outstanding balance. Tailored payment reminder message prepared.
                </p>
              </div>
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Due 10d ago</span>
                <Button size="sm" className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Send Reminder</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Sales Pipeline & Deal Temperature */}
      <section id="pipeline" className="py-16 sm:py-24 bg-slate-100/60 dark:bg-[#0B1322] border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 text-xs font-bold">
                <Flame className="h-3.5 w-3.5" />
                <span>Sales Pipeline Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Know Which Quotes Are Hot <br />
                <span className="text-indigo-600 dark:text-indigo-400">Before Your Competitor Calls.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Most CRM tools only track when you sent a quote. QuoteFlow tracks what happens next: did the customer open it? How many times? How recently?
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">HOT Deals (70–95% Conversion Probability)</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Viewed 2+ times or reviewed in the last 48 hours. A timely message here yields the highest close rate.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">WARM Deals (Active Decision Window)</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Recently sent proposals under evaluation. Gentle progress checks keep your firm top of mind.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Snowflake className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">COLD Deals (Early Intervention Alert)</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quotes sent over 5 days ago with zero opens. Intervene before the prospect goes with someone else.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Temperature Card */}
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Pipeline Breakdown</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total: ₹4,15,000</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-orange-700 dark:text-orange-300">🔥 4 Hot Deals (₹1,95,000)</div>
                    <div className="text-[11px] text-slate-500">Active views in last 24h</div>
                  </div>
                  <span className="text-xs font-black text-orange-600">Avg 88% Close Likelihood</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-700 dark:text-amber-300">⚡ 6 Warm Deals (₹1,40,000)</div>
                    <div className="text-[11px] text-slate-500">Sent within 5 days</div>
                  </div>
                  <span className="text-xs font-black text-amber-600">Active Review</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-300">❄️ 3 Cold Deals (₹80,000)</div>
                    <div className="text-[11px] text-slate-500">Unopened &gt; 5 days</div>
                  </div>
                  <span className="text-xs font-black text-blue-600">Requires Check-in</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Lead Recovery Engine */}
      <section id="recovery" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Recoverable Revenue In Your Database</span>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141F36] border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>📫 Unopened Quotes (Sent &gt; 48h)</span>
                  <span className="text-purple-600">₹65,000</span>
                </div>
                <p className="text-[11px] text-slate-500">Resend clean WhatsApp portal link directly to smartphone.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141F36] border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>👀 Viewed But Unapproved (&gt; 3 Days)</span>
                  <span className="text-purple-600">₹90,000</span>
                </div>
                <p className="text-[11px] text-slate-500">Proactively address client objections with tailored consultation check-in.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#141F36] border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white">
                  <span>⏰ Expired Proposals (Last 30 Days)</span>
                  <span className="text-purple-600">₹1,15,000</span>
                </div>
                <p className="text-[11px] text-slate-500">1-click revival into new quote draft with refreshed validity period.</p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-xs font-bold">
              <Target className="h-3.5 w-3.5" />
              <span>Internal Lead Recovery</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Don’t Spend More on Ads. <br />
              <span className="text-purple-600 dark:text-purple-400">Recover Leads Already in Your Pipeline.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Before searching for new prospects, QuoteFlow recovers the thousands of dollars sitting abandoned in your quotation history. Automatic detection surfaces dropped deals and generates revival drafts ready to send in seconds.
            </p>
            <div className="pt-2">
              <Link href="/register">
                <Button className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2">
                  <span>Try Lead Recovery Free</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Win/Loss & Discount Disparity Analysis */}
      <section className="py-16 sm:py-24 bg-slate-100/60 dark:bg-[#0B1322] border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold">
                <Percent className="h-3.5 w-3.5" />
                <span>Margin &amp; Discount Intelligence</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Stop Discount Leakage. <br />
                <span className="text-blue-600 dark:text-blue-400">Protect Your Gross Margin.</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Does offering a 20% discount actually help you win more business, or is it just destroying your profit? QuoteFlow calculates conversion across discount brackets to give you clear pricing clarity.
              </p>
              <div className="space-y-2.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Real approval rate metrics &amp; average days to close.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Discount disparity analysis flagging deals where heavy discounts failed to increase win rate.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Cross-sell engine suggesting items frequently bundled in approved proposals.</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] shadow-xl space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>AI Discount Insight</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  &ldquo;Quotes with discounts &gt;15% converted at 28% compared to 44% for standard pricing. Heavy discounting is not increasing your win rate and erodes profit margin.&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#141F36]">
                  <div className="text-[11px] text-slate-400">Standard Pricing Win Rate</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">44%</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#141F36]">
                  <div className="text-[11px] text-slate-400">&gt;15% Discount Win Rate</div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">28%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: 30-Day Predictive Cash Flow Forecast */}
      <section id="cashflow" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">30-Day Inbound Cash Flow Forecast</span>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">₹3,45,000 Expected</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#141F36] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Week 1 (Days 1–7)</span>
                  <div className="text-[10px] text-slate-400">Invoices due + 70% Hot Quote Probability</div>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">₹1,15,000</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#141F36] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Week 2 (Days 8–14)</span>
                  <div className="text-[10px] text-slate-400">Confirmed invoices &amp; scheduled terms</div>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">₹95,000</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#141F36] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Week 3 (Days 15–21)</span>
                  <div className="text-[10px] text-slate-400">Mid-month contract renewals</div>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">₹70,000</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#141F36] flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Week 4 (Days 22–30)</span>
                  <div className="text-[10px] text-slate-400">Month-end billing deliveries</div>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">₹65,000</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Predictive Cash Flow</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Know Exactly What Cash <br />
              <span className="text-emerald-600 dark:text-emerald-400">Is Arriving Over the Next 30 Days.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              QuoteFlow merges scheduled invoice due dates with pipeline-weighted closing probabilities from hot and warm proposals to produce a reliable 4-week cash projection. No spreadsheets or external accountants needed.
            </p>
            <div className="pt-2">
              <Link href="/register">
                <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2">
                  <span>Forecast Your Cash Flow</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-16 sm:py-24 bg-slate-100/60 dark:bg-[#0B1322] border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>How QuoteFlow Compares</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Why Businesses Switch from Traditional Quoting Tools
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Traditional software waits for you to enter data. QuoteFlow AI Business Operator proactively drives revenue.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] shadow-lg">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101A2D]">
                  <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Operational Capability</th>
                  <th className="p-4 font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
                    QuoteFlow AI Operator
                  </th>
                  <th className="p-4 font-bold text-slate-500">Traditional Tools (Zoho / Vyapar / Refrens)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    &ldquo;What should I do today?&rdquo; Prioritized Plan
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ Real-time ranked daily action plan
                  </td>
                  <td className="p-4 text-slate-500">❌ Static lists only</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    Client Portal View &amp; Engagement Tracking
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ Counts opens &amp; last viewed time
                  </td>
                  <td className="p-4 text-slate-500">❌ Basic email delivery only</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    Sales Pipeline Temperature (HOT/WARM/COLD)
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ Automated 0-100% conversion scoring
                  </td>
                  <td className="p-4 text-slate-500">❌ Manual deal stages</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    Internal Lead Recovery (Revive Expired Quotes)
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ 1-click quote revival draft
                  </td>
                  <td className="p-4 text-slate-500">❌ Quotes sit dead</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    Customer Reorder Cadence Alerts
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ Alerts when client exceeds regular cycle
                  </td>
                  <td className="p-4 text-slate-500">❌ No cycle detection</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    Discount Leakage &amp; Margin Analysis
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ Flags discounts hurting conversion
                  </td>
                  <td className="p-4 text-slate-500">❌ Blind discounting</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                    30-Day Predictive Cash Flow Inflow
                  </td>
                  <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20">
                    ✅ 4-week probability forecast
                  </td>
                  <td className="p-4 text-slate-500">❌ Export to Excel required</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Everything You Need to Know About QuoteFlow AI
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1525] p-5 shadow-xs space-y-2"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {faq.q}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to Put Your Quotation &amp; Sales Operations on Autopilot?
            </h2>
            <p className="text-xs sm:text-base text-indigo-200 leading-relaxed">
              Start your 14-day free trial right now. Zero credit card required. Experience what it feels like to have an AI business operator that drives your revenue every single morning.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-black text-sm shadow-xl shadow-indigo-500/25 gap-2 border border-indigo-400/30">
                  <Sparkles className="h-4 w-4" />
                  <span>Start Free 14-Day Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold text-sm border-white/20 bg-white/5 hover:bg-white/10 text-white"
                >
                  Log In to Existing Workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#070D18]/60 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <img src="/quoteflow-logo.png" alt="QuoteFlow" className="h-6 w-auto" />
            <span>&copy; {new Date().getFullYear()} QuoteFlow. Powered by Blend &amp; Bold.</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <Link href="/free-quotation-maker" className="hover:text-indigo-600">Free Quotation Maker</Link>
            <Link href="/invoice-maker-for-freelancers" className="hover:text-indigo-600">Invoice Maker</Link>
            <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-indigo-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
