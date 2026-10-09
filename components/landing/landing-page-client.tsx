'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileText,
  CheckCircle2,
  Share2,
  Send,
  Receipt,
  CreditCard,
  DollarSign,
  Lock,
  Eye,
  PenTool,
  ArrowRight,
  ChevronDown,
  Play,
  X,
  Building2,
  Wrench,
  Laptop,
  Palette,
  Briefcase,
  Factory,
  Truck,
  Layers,
  ShieldCheck,
  Check,
  Menu,
  Clock,
  Smartphone,
  HelpCircle,
  TrendingUp,
  Bot,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  isAuthenticated: boolean;
  userEmail?: string;
}

export function LandingPageClient({ isAuthenticated, userEmail }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [activeAiQuery, setActiveAiQuery] = useState<'pending' | 'reminders' | 'monthly' | 'create'>('pending');

  // Customer Mobile View interactive state
  const [customerApproved, setCustomerApproved] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);

  // FAQ Items
  const faqItems = [
    {
      q: 'How does the 30-day free trial work?',
      a: 'You get full, unrestricted access to all QuoteFlow features for 30 days without entering any credit card. Create unlimited quotations, send them to clients, convert to invoices, and test AI Copilot. After 30 days, keep all features for just ₹99 per month.',
    },
    {
      q: 'Can I create and send quotes from mobile?',
      a: 'Yes! QuoteFlow is built mobile-first. You can chat with QuoteFlow AI directly on your smartphone, review calculated totals, and share secure links directly to WhatsApp or email in seconds.',
    },
    {
      q: 'Do my customers need to sign up or download an app?',
      a: 'Never! Customers simply tap your secure link to open a clean, branded portal on any device. If you enable optional PIN protection, they enter a 4-digit code to view, review, and digitally sign.',
    },
    {
      q: 'Can I customize my company logo and colors?',
      a: 'Yes. Upload your official company logo, customize invoice notes, tax rates (GST/VAT), currency, payment QR codes, and default terms. You can also pick from multiple themes and corner radiuses.',
    },
    {
      q: 'What payment methods can I display to clients?',
      a: 'You can showcase UPI QR codes (Google Pay, PhonePe, Paytm, BHIM), direct bank account NEFT/RTGS details, and cryptocurrency wallet addresses directly on your invoices and client view.',
    },
    {
      q: 'How does the QuoteFlow AI Copilot work?',
      a: 'Simply tell the Copilot in plain English what your client needs (e.g., "Create a quote for 10 Glass Panels at ₹500 each and 5 Batteries at ₹600 for ABC Corp"). It formats the entire quotation, calculates taxes, and lets you confirm and send in one tap.',
    },
  ];

  // Industry List
  const industries = [
    { name: 'Construction & Contractors', icon: Building2 },
    { name: 'IT Services & Agencies', icon: Laptop },
    { name: 'Freelancers & Solopreneurs', icon: Briefcase },
    { name: 'Marketing & Design Studios', icon: Palette },
    { name: 'Repair & Technical Services', icon: Wrench },
    { name: 'Wholesale & Trading', icon: Truck },
    { name: 'Interior Design & Architecture', icon: Layers },
    { name: 'Business Consultants', icon: TrendingUp },
    { name: 'Manufacturing & Fabrication', icon: Factory },
    { name: 'And 50+ Other Industries', icon: Sparkles },
  ];

  // Demo Walkthrough Steps
  const demoSteps = [
    {
      title: '1. Tell QuoteFlow AI What You Need',
      desc: 'Type or speak naturally: "Create a quote for 10 Glass Panels and 5 Batteries for ABC Corp". AI identifies line items, quantities, and pricing instantly.',
      icon: Bot,
      badge: 'Natural AI Input',
    },
    {
      title: '2. Review & Confirm Draft In-Chat',
      desc: 'The draft quotation card appears inside the chat. Subtotals, GST, and totals are computed according to your business defaults.',
      icon: FileText,
      badge: 'Instant Drafting',
    },
    {
      title: '3. Share Secure Link with Optional PIN',
      desc: 'Send an unguessable private link to the client via WhatsApp or email. Set an optional 4-digit PIN for sensitive quotes.',
      icon: Share2,
      badge: 'Protected Distribution',
    },
    {
      title: '4. Client Reviews & Signs Digitally',
      desc: 'The client opens the mobile-optimized portal, reviews items, signs with finger or mouse, and hits Approve. You get an instant notification.',
      icon: CheckCircle2,
      badge: 'Digital Approval',
    },
    {
      title: '5. 1-Click Convert to Invoice & Collect Payment',
      desc: 'Convert the approved quotation into a sequential commercial invoice with one click. Display your UPI QR code to get paid quickly.',
      icon: Receipt,
      badge: 'Get Paid Fast',
    },
  ];

  const handleCopyDemoLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(`${window.location.origin}/q/sec_demo_sample`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 flex flex-col justify-between selection:bg-indigo-600 selection:text-white font-sans relative overflow-x-hidden">
      {/* Background Subtle Gradient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-[720px] sm:w-[980px] h-[480px] bg-gradient-to-b from-indigo-200/40 via-violet-100/30 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[60px] left-[15%] w-[320px] h-[320px] bg-blue-100/35 blur-[100px] rounded-full" />
        <div className="absolute top-[100px] right-[10%] w-[360px] h-[360px] bg-purple-100/35 blur-[110px] rounded-full" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0 opacity-60" />

      {/* =========================================================================
          1. NAVIGATION BAR
      ========================================================================= */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Brand Logo with Q */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-xl text-white shadow-md shadow-indigo-500/25 border border-white/40 group-hover:scale-105 transition-transform duration-200">
              Q
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-tight">
                QuoteFlow
              </span>
              <span className="text-[10px] font-bold text-slate-600 tracking-wide">
                Powered by BlendAndBold
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#ai-copilot" className="hover:text-indigo-600 transition-colors">
              AI Copilot
            </a>
            <a href="#flow" className="hover:text-indigo-600 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#industries" className="hover:text-indigo-600 transition-colors">
              Industries
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 hidden xl:inline">
                  Signed in as <span className="font-semibold text-slate-800">{userEmail}</span>
                </span>
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md shadow-indigo-600/20 gap-2 rounded-xl px-5 h-10 border border-indigo-500/30">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold px-4 h-10 text-xs"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold shadow-md shadow-indigo-600/20 rounded-xl px-5 h-10 text-xs gap-1.5 border border-indigo-500/20">
                    <span>Start Free</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="lg:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white/98 backdrop-blur-xl px-5 py-4 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600 transition-colors"
              >
                Features
              </a>
              <a
                href="#ai-copilot"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600 transition-colors"
              >
                AI Copilot
              </a>
              <a
                href="#flow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#industries"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600 transition-colors"
              >
                Industries
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-indigo-600 transition-colors"
              >
                FAQ
              </a>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl font-bold h-10">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10">
                      Start Free Trial
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION
      ========================================================================= */}
      <section className="relative z-10 pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-900 tracking-wide">
              ✦ AI Powered Quotation &amp; Payment Platform
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.08]">
            Create Quotes With AI.{' '}
            <span className="block mt-1 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Get Approved. Get Paid.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
            Tell QuoteFlow AI what you need. It creates professional quotations, lets you edit them conversationally, sends them for approval, converts to invoices, and tracks your payments.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full sm:w-auto">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/25 border border-indigo-500/20 gap-2">
                <span>Start Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto h-12 px-6 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs gap-2"
            >
              <Play className="h-4 w-4 text-indigo-600 fill-indigo-600" />
              <span>Watch 60-sec Demo</span>
            </Button>
          </div>

          {/* Trust Value Props */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
              Optional PIN protection
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
              Digital approvals
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
              Payment tracking
            </span>
          </div>
        </div>

        {/* =========================================================================
            HERO MOCKUP: QuoteFlow AI Conversational Quote Generation Card
        ========================================================================= */}
        <div className="mt-12 sm:mt-16 max-w-4xl mx-auto relative">
          {/* Annotated Speech Callout Left */}
          <div className="hidden md:flex absolute -left-8 -top-8 z-20 flex-col items-start max-w-xs animate-bounce-subtle pointer-events-none">
            <span className="bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md mb-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Just tell what you need
            </span>
            <div className="bg-white border border-indigo-200 rounded-2xl p-3 shadow-lg text-xs font-semibold text-slate-800">
              💬 &ldquo;Create a quote for Glass 500 and Battery 600 for ABC Customer&rdquo;
            </div>
          </div>

          {/* Annotated Callout Right */}
          <div className="hidden md:flex absolute -right-6 top-12 z-20 flex-col items-end max-w-xs pointer-events-none">
            <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md mb-1.5 flex items-center gap-1">
              <Check className="h-3 w-3" />
              AI creates your quote instantly
            </span>
          </div>

          {/* The Hero Card */}
          <div className="rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-4 sm:p-7 transition-all ring-1 ring-slate-900/5">
            {/* Card Window Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-mono font-semibold text-slate-400">
                  QuoteFlow AI • Live Interactive Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Draft • Ready to send
                </span>
              </div>
            </div>

            {/* Simulated AI Conversation Flow */}
            <div className="space-y-4">
              {/* User Prompt */}
              <div className="flex justify-end">
                <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs max-w-md">
                  Create a quote for Glass 500 and Battery 600 for ABC Customer.
                </div>
              </div>

              {/* AI Response Card */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                  Q
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-xs p-4 sm:p-6 space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Quotation Draft</h4>
                      <p className="text-xs text-slate-500">Customer: <strong className="text-slate-800">ABC Customer</strong></p>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg w-fit">
                      QT-2026-0048
                    </span>
                  </div>

                  {/* Items Table */}
                  <div className="divide-y divide-slate-200/60 text-xs">
                    <div className="py-2.5 flex items-center justify-between font-medium text-slate-700">
                      <div>
                        <p className="font-bold text-slate-900">Glass Panel (12mm Toughened)</p>
                        <p className="text-[11px] text-slate-400">Qty 10 × ₹500</p>
                      </div>
                      <span className="font-bold text-slate-900">₹5,000</span>
                    </div>

                    <div className="py-2.5 flex items-center justify-between font-medium text-slate-700">
                      <div>
                        <p className="font-bold text-slate-900">Heavy-Duty Battery (150Ah)</p>
                        <p className="text-[11px] text-slate-400">Qty 5 × ₹600</p>
                      </div>
                      <span className="font-bold text-slate-900">₹3,000</span>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">₹8,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%)</span>
                      <span className="font-semibold text-slate-800">₹1,440</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200/60">
                      <span>Total Amount</span>
                      <span className="text-indigo-600">₹9,440</span>
                    </div>
                  </div>

                  {/* Direct Action Buttons in AI Preview */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <Link href="/register">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5 px-4 h-9"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Confirm &amp; Send</span>
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDemoModalOpen(true)}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl h-9 px-4"
                    >
                      <span>Edit Quote</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SALES FLOW SECTION: "One conversation. The entire sales flow."
      ========================================================================= */}
      <section id="flow" className="py-16 sm:py-24 bg-slate-50/70 border-y border-slate-200/70 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              One conversation. The entire sales flow.
            </h2>
            <p className="text-base text-slate-600">
              From client request to final bank settlement in minutes, completely automated.
            </p>
          </div>

          {/* 6 Step Cards with Sequential Connected Arrows */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              {
                step: '1',
                title: 'Tell AI what you need',
                desc: 'Speak or type items, rates, and customer details naturally.',
                icon: Bot,
                color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
              },
              {
                step: '2',
                title: 'Create Quotation',
                desc: 'AI calculates taxes, discounts, and formats a polished document.',
                icon: FileText,
                color: 'text-violet-600 bg-violet-50 border-violet-200',
              },
              {
                step: '3',
                title: 'Send to Customer',
                desc: 'Instant private link via WhatsApp or email with optional PIN protection.',
                icon: Share2,
                color: 'text-blue-600 bg-blue-50 border-blue-200',
              },
              {
                step: '4',
                title: 'Customer Approves',
                desc: 'Client reviews, digitally signs with touch, or requests changes.',
                icon: CheckCircle2,
                color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
              },
              {
                step: '5',
                title: 'Create Invoice',
                desc: '1-click conversion to an official sequential commercial invoice.',
                icon: Receipt,
                color: 'text-amber-600 bg-amber-50 border-amber-200',
              },
              {
                step: '6',
                title: 'Track Payment',
                desc: 'Live payment status, UPI QR codes, and automatic reminders.',
                icon: DollarSign,
                color: 'text-rose-600 bg-rose-50 border-rose-200',
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="relative rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-10 w-10 rounded-xl border flex items-center justify-center ${s.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-xs font-black text-slate-600 group-hover:text-indigo-600 transition-colors">
                        0{s.step}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {s.title}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>

                  {idx < 5 && (
                    <div className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. TWO-COLUMN INTERACTIVE SHOWCASE
          Left: AI Copilot for Your Business
          Right: What Your Customer Sees (Mobile Phone Frame)
      ========================================================================= */}
      <section id="ai-copilot" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* COLUMN 1: AI Copilot for Your Business */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Bot className="h-3.5 w-3.5" />
                <span>Executive AI Assistant</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                AI Copilot for Your Business
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ask questions, generate instant business reports, and manage quotations naturally without opening multiple tabs.
              </p>

              {/* Clickable Suggestion Query Pills */}
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Try asking QuoteFlow AI:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'pending', label: 'Show pending payments' },
                    { id: 'reminders', label: 'Send overdue reminders' },
                    { id: 'monthly', label: 'Monthly sales report' },
                    { id: 'create', label: 'Create quote for ABC Corp' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setActiveAiQuery(q.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        activeAiQuery === q.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      ✦ {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Business Data Card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  {activeAiQuery === 'pending'
                    ? 'Payment Summary Report'
                    : activeAiQuery === 'reminders'
                    ? 'Automated Overdue Reminder'
                    : activeAiQuery === 'monthly'
                    ? 'October Sales Performance'
                    : 'Quotation Generation Draft'}
                </span>
                <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  Live Data
                </span>
              </div>

              {activeAiQuery === 'pending' || activeAiQuery === 'monthly' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-medium">Received Payments</span>
                      <p className="text-lg font-black text-emerald-600 mt-0.5">₹84,500</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-medium">Pending Payments</span>
                      <p className="text-lg font-black text-amber-600 mt-0.5">₹38,200</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-medium">Overdue Invoices</span>
                      <p className="text-lg font-black text-rose-600 mt-0.5">₹9,440</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 font-medium">Total Invoiced</span>
                      <p className="text-lg font-black text-slate-900 mt-0.5">₹1,32,140</p>
                    </div>
                  </div>

                  {/* Collection Rate Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>Collection Rate</span>
                      <span className="text-indigo-600">64% collected</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full w-[64%]" />
                    </div>
                  </div>
                </div>
              ) : activeAiQuery === 'reminders' ? (
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5 text-amber-600">
                    <Clock className="h-4 w-4" /> Overdue reminder ready for dispatch
                  </p>
                  <p className="text-slate-600">
                    Client <strong>ABC Customer</strong> has 1 invoice (INV-001042) overdue by 5 days (₹9,440).
                  </p>
                  <div className="pt-2 flex gap-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200">
                      WhatsApp Reminder
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg">
                      Email Reminder
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <p className="font-semibold text-slate-900 flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Quotation QT-2026-0049 created
                  </p>
                  <p className="text-slate-600">
                    Draft saved with 2 line items for ABC Corp totaling ₹9,440 including GST.
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-mono text-indigo-600">
                    Ready to send to client portal
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: What Your Customer Sees (Mobile Phone Frame) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Zero-Friction Portal</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                What Your Customer Sees
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                A frictionless, mobile-first client portal with zero login friction, optional PIN security, and instant digital signature.
              </p>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="max-w-sm mx-auto w-full rounded-3xl border-4 border-slate-900 bg-white shadow-xl overflow-hidden">
              {/* Phone Top Notch */}
              <div className="bg-slate-900 text-white px-5 py-2 flex items-center justify-between text-[11px] font-semibold">
                <span>9:41</span>
                <div className="h-3 w-16 bg-slate-800 rounded-full" />
                <span>5G 100%</span>
              </div>

              {/* Client Portal Content Inside Phone */}
              <div className="p-4 space-y-3 text-left">
                {/* Brand & Quote Number */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      Q
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900">QuoteFlow Demo</p>
                      <p className="text-[10px] text-slate-400">Quotation QT-1048</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-indigo-600">₹9,440</span>
                </div>

                {/* PIN Protected Banner */}
                <div className="p-2 rounded-xl bg-indigo-50/80 border border-indigo-200/70 flex items-center gap-2 text-[11px] font-semibold text-indigo-900">
                  <Lock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>Protected by 4-digit PIN verification</span>
                </div>

                {/* Summary Items */}
                <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] space-y-1.5 border border-slate-200/60">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>10 × Glass Panel (12mm)</span>
                    <span className="font-bold text-slate-900">₹5,000</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>5 × Heavy-Duty Battery</span>
                    <span className="font-bold text-slate-900">₹3,000</span>
                  </div>
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>GST (18%)</span>
                    <span>₹1,440</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-0.5">
                    <span>Total Amount</span>
                    <span className="text-indigo-600">₹9,440</span>
                  </div>
                </div>

                {/* Digital Signature Pad */}
                <div className="border border-dashed border-slate-300 rounded-xl p-2 bg-slate-50/50 text-center">
                  {signatureDrawn || customerApproved ? (
                    <div className="h-10 flex items-center justify-center font-serif italic text-indigo-700 text-sm font-bold animate-fadeIn">
                      Alex Vance (Verified Signature)
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSignatureDrawn(true)}
                      className="h-10 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-semibold hover:text-indigo-600"
                    >
                      <PenTool className="h-3 w-3" />
                      <span>Tap to draw signature</span>
                    </button>
                  )}
                </div>

                {/* Customer Approval Actions */}
                {customerApproved ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Quotation Approved &amp; Signed!</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSignatureDrawn(true);
                        setCustomerApproved(true);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Quotation</span>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => alert('Client requests edits via real-time portal comments!')}
                        className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold"
                      >
                        Request Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => alert('Client can decline with reason logged.')}
                        className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. COMPLETE FEATURE SUITE (6 Cards Grid)
      ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Everything You Need to Run Client Sales
            </h2>
            <p className="text-base text-slate-600">
              Built for speed, accuracy, and closing deals faster without manual bookkeeping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Quote Creation',
                desc: 'Describe goods, services, and rates in plain English. QuoteFlow AI computes discounts, tax slabs, and line item formulas instantly.',
                icon: Sparkles,
                badge: 'Conversational AI',
              },
              {
                title: 'Secure Sharing',
                desc: 'Share unguessable unique links via WhatsApp or email. Protect confidential proposals with an optional 4-digit client access PIN.',
                icon: Lock,
                badge: 'PIN Security',
              },
              {
                title: 'Live Tracking',
                desc: 'Get notified the instant a client opens, views, or re-reads your quotation. Know exactly when to follow up while interest is high.',
                icon: Eye,
                badge: 'Real-time Alerts',
              },
              {
                title: 'Digital Approvals',
                desc: 'Clients sign with finger or mouse on any smartphone or tablet. Generates immutable audit timestamps and PDF certificates.',
                icon: PenTool,
                badge: 'Touch Signatures',
              },
              {
                title: 'Instant Invoices',
                desc: 'Convert any approved quotation into an official commercial invoice with 1 click. Zero duplicate typing and strict sequential numbers.',
                icon: Receipt,
                badge: '1-Click Conversion',
              },
              {
                title: 'Payment Tracking',
                desc: 'Embed UPI QR codes (GPay, PhonePe, Paytm), bank account details, and crypto addresses with live payment status tracking.',
                icon: DollarSign,
                badge: 'UPI QR Codes',
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                        {f.badge}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {f.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>Learn more</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. BOTTOM MULTI-SECTION GRID (3 COLUMNS)
          Col 1: Works for Your Business (Industries)
          Col 2: Simple & Transparent Pricing (Free for 30 days, then ₹99/month)
          Col 3: Frequently Asked Questions (FAQ Accordion)
      ========================================================================= */}
      <section id="bottom-grid" className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* COLUMN 1: Works for Your Business (Industries) */}
          <div id="industries" className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 mb-1">
                <Building2 className="h-3.5 w-3.5" />
                Industries
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Works for Your Business
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tailored workflows for fast-moving businesses:
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {industries.map((ind) => {
                const Icon = ind.icon;
                return (
                  <div
                    key={ind.name}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-200/80 transition-all text-xs font-semibold text-slate-700"
                  >
                    <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span>{ind.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: Simple & Transparent Pricing */}
          <div id="pricing" className="rounded-3xl border-2 border-indigo-600 bg-white p-6 sm:p-7 shadow-xl space-y-6 relative overflow-hidden">
            {/* Top Badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-600 to-violet-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
              Special Offer
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 mb-1">
                <CreditCard className="h-3.5 w-3.5" />
                Pricing
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Simple &amp; Transparent
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                No hidden charges. Everything included.
              </p>
            </div>

            {/* Big Pricing Highlight */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">₹0</span>
                <span className="text-xs font-bold text-slate-500">for first 30 days</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700">
                <span>then only</span>
                <span className="text-base text-indigo-900 font-black">₹99</span>
                <span>/ month</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Includes full access to AI Copilot, unlimited quotes &amp; invoices.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-2.5 text-xs text-slate-700">
              {[
                '30-Day Full Access Free Trial',
                'No credit card required to start',
                'Unlimited AI Quotations & Invoices',
                'WhatsApp & Email Secure Sharing',
                'Optional Client PIN Protection',
                'Digital Signatures & Approvals',
                'Real-Time View Tracking Alerts',
                'UPI QR Codes & Payment Methods',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 stroke-[3] shrink-0" />
                  <span className="font-semibold">{feat}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Link href="/register" className="block w-full">
              <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-indigo-600/25 border border-indigo-500/20 gap-1.5">
                <span>Start Free 30-Day Trial</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>

            <p className="text-[11px] text-center text-slate-400 font-medium">
              Cancel anytime with 1 click. Zero lock-in.
            </p>
          </div>

          {/* COLUMN 3: Frequently Asked Questions (FAQ Accordion) */}
          <div id="faq" className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5 mb-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Support &amp; Answers
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Everything you need to know about QuoteFlow:
              </p>
            </div>

            <div className="space-y-2.5">
              {faqItems.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={item.q}
                    className="border border-slate-200/80 rounded-2xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-2 bg-slate-50/50 hover:bg-slate-100/60 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-800 leading-snug">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-indigo-600' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="p-3.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-fadeIn">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FINAL CALL-TO-ACTION BANNER
      ========================================================================= */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-950 text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Your next quote is one conversation away.
            </h2>
            <p className="text-sm sm:text-base text-indigo-200 font-normal">
              Join modern businesses closing deals 3x faster with QuoteFlow. Free for 30 days, then just ₹99/month.
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <Link href="/register">
              <Button className="h-12 px-8 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-black text-sm shadow-xl gap-2">
                <span>Start Free 30-Day Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FOOTER
      ========================================================================= */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-lg text-white shadow-sm">
              Q
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                QuoteFlow
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                by BlendAndBold
              </span>
            </div>
          </div>

          {/* Quick Footer Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#ai-copilot" className="hover:text-indigo-600 transition-colors">
              AI Copilot
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </a>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">
              Login
            </Link>
            <Link href="/register" className="hover:text-indigo-600 transition-colors">
              Sign Up
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-slate-600 font-medium text-center md:text-right">
            © 2026 QuoteFlow by blendandbold. All rights reserved.
          </p>
        </div>
      </footer>

      {/* =========================================================================
          9. 60-SECOND INTERACTIVE WALKTHROUGH MODAL
      ========================================================================= */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {demoSteps[demoStep].badge}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
                {demoSteps[demoStep].title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {demoSteps[demoStep].desc}
              </p>
            </div>

            {/* Step Progress Dots */}
            <div className="flex items-center gap-1.5">
              {demoSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === demoStep ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDemoStep(Math.max(0, demoStep - 1))}
                disabled={demoStep === 0}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none"
              >
                ← Previous
              </button>

              {demoStep < demoSteps.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setDemoStep(demoStep + 1)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-5 h-9"
                >
                  <span>Next Step</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Link href="/register" onClick={() => setIsDemoModalOpen(false)}>
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs rounded-xl px-5 h-9">
                    <span>Start Free 30-Day Trial</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
