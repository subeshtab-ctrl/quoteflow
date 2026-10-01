'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Eye,
  FileText,
  ArrowRight,
  LayoutDashboard,
  User,
  CheckCircle2,
  Copy,
  Check,
  Share2,
  Lock,
  Download,
  Receipt,
  FileCheck2,
  Sparkles,
  Layers,
  History,
  Play,
  X,
  ExternalLink,
  ChevronRight,
  Clock,
  Laptop,
  Smartphone,
  PenTool,
  QrCode,
  DollarSign,
  AlertCircle,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingPageProps {
  isAuthenticated: boolean;
  userEmail?: string;
}

export function LandingPageClient({ isAuthenticated, userEmail }: LandingPageProps) {
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('draw');

  const handleCopyLink = () => {
    navigator.clipboard?.writeText('https://blendandbold.com/q/sec_8f92m1k4092b');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const featureTabs = [
    { id: 0, label: 'Professional Quotations', icon: FileText },
    { id: 1, label: 'Secure Approval Links', icon: Lock },
    { id: 2, label: 'Real-Time View Tracking', icon: Eye },
    { id: 3, label: 'Digital Signatures', icon: PenTool },
    { id: 4, label: 'Instant PDF Generation', icon: Download },
    { id: 5, label: 'Quotations & Invoices', icon: Receipt },
    { id: 6, label: 'Audit Logs', icon: History },
  ];

  const demoSteps = [
    {
      title: '1. Create Branded Quotations',
      desc: 'Quickly select customers, add itemized goods or services, configure discounts and GST/tax in seconds.',
      badge: 'Creation',
      icon: FileText,
    },
    {
      title: '2. Share Unguessable Secure Links',
      desc: 'Send unique unguessable links via WhatsApp or email with optional PIN protection and OTP verification.',
      badge: 'Distribution',
      icon: Share2,
    },
    {
      title: '3. Real-Time View Alerts & Digital Sign',
      desc: 'Receive alerts when the client opens the link. Clients review and sign using touch or mouse on any device.',
      badge: 'Approval',
      icon: ShieldCheck,
    },
    {
      title: '4. Instant 1-Click Invoice & PDF',
      desc: 'Upon approval, generate an official commercial invoice and cryptographic PDF certificate with one tap.',
      badge: 'Settlement',
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-hidden font-sans">
      {/* Background Lighting & Glow Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[620px] pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[180px] left-1/2 -translate-x-1/2 w-[720px] sm:w-[980px] h-[480px] bg-gradient-to-b from-indigo-600/25 via-purple-600/20 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[80px] left-[20%] w-[340px] h-[340px] bg-blue-600/15 blur-[100px] rounded-full" />
        <div className="absolute top-[120px] right-[15%] w-[380px] h-[380px] bg-purple-600/15 blur-[110px] rounded-full" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0"
      />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#070b14]/80 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-600/30 border border-white/20 group-hover:scale-105 transition-transform duration-200">
              Q
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                QuoteFlow
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-white transition-colors">
              Workflow
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden lg:inline">
                  Signed in as <span className="font-semibold text-slate-200">{userEmail}</span>
                </span>
                <Link href="/dashboard">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30 gap-2 rounded-xl px-5 h-10 border border-white/10">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Open Dashboard</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl font-medium px-4 h-10"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/25 rounded-xl px-5 h-10 border border-white/10">
                    Sign Up Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-white/[0.08] bg-[#080d1a]/95 backdrop-blur-xl px-5 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white transition-colors"
              >
                Workflow
              </a>
              <a
                href="#security"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white transition-colors"
              >
                Security
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-white transition-colors"
              >
                FAQ
              </a>
            </div>
            <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2">
              {isAuthenticated ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl">
                      Sign Up Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {/* HERO SECTION */}
        <section className="pt-16 pb-12 sm:pt-24 sm:pb-20 px-4 sm:px-6 max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/[0.08] px-4 py-1.5 text-xs sm:text-sm font-semibold text-indigo-300 shadow-inner backdrop-blur-md mb-8 animate-fade-in">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Cloud-Based Quotation & Digital Approval SaaS</span>
          </div>

          {/* High-Impact 3-Line Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.08] max-w-4xl mx-auto mb-6">
            <span className="block text-white">Create Quotations.</span>
            <span className="block bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Get Approvals.
            </span>
            <span className="block text-slate-100">Close Faster.</span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed mb-10">
            QuoteFlow helps businesses create professional quotations, share secure approval links,
            track client engagement in real-time, collect digital signatures and generate invoices —
            all in one powerful cloud-based platform.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            {isAuthenticated ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-xl shadow-indigo-600/30 px-8 py-3.5 h-12 rounded-full flex items-center justify-center gap-2 text-base border border-white/15 transition-all">
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Enter Business Dashboard</span>
                  <ArrowRight className="h-5 w-5 ml-1" />
                </Button>
              </Link>
            ) : (
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-xl shadow-indigo-600/30 px-8 py-3.5 h-12 rounded-full flex items-center justify-center gap-2 text-base border border-white/15 transition-all group">
                  <span>Sign Up Free</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 h-12 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white font-semibold text-base backdrop-blur-md transition-all cursor-pointer"
            >
              <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Play className="h-3 w-3 fill-current ml-0.5" />
              </div>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-400 pt-2 mb-16">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Instant cloud deployment
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Bank-grade SHA-256 signatures
            </span>
          </div>

          {/* PRODUCT UI MOCKUP SHOWCASE (show_product_mockup: true) */}
          <div id="mockup" className="relative max-w-5xl mx-auto pt-2">
            {/* Ambient Backlight Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-indigo-600/25 to-purple-600/20 blur-3xl -z-10 rounded-3xl opacity-80" />

            {/* Floating Live Engagement Indicators */}
            <div className="hidden lg:flex items-center gap-2.5 absolute -top-5 -left-6 z-20 bg-slate-900/90 border border-indigo-500/30 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl animate-bounce-slow">
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  Client Viewed Quotation
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                </p>
                <p className="text-[11px] text-slate-400">Just now · Chrome on macOS</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 absolute -bottom-5 -right-6 z-20 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Digitally Signed & Approved</p>
                <p className="text-[11px] text-slate-400">Hash verified · SHA-256 certificate</p>
              </div>
            </div>

            {/* Sleek Browser Container */}
            <div className="rounded-2xl sm:rounded-3xl border border-white/[0.12] bg-[#0c1222]/95 shadow-2xl overflow-hidden backdrop-blur-xl text-left">
              {/* macOS Window Titlebar */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-400 max-w-[280px] sm:max-w-md w-full justify-center">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  <span className="truncate">https://blendandbold.com/quotations/Q-000042</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                    Live Mode
                  </span>
                </div>
              </div>

              {/* Mockup Inside: Realistic QuoteFlow UI */}
              <div className="p-4 sm:p-7 space-y-6">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl sm:text-2xl font-black text-white">Q-000042</h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Check className="h-3 w-3" /> Approved
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created on 01 Oct 2026 · Valid until 31 Oct 2026 · Client: Apex Global Tech
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Create Invoice</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-200 border border-white/[0.08] font-medium flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Client Link</span>
                    </div>
                  </div>
                </div>

                {/* Status Notice Card */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-200">
                        Quotation Officially Approved & Digitally Signed
                      </p>
                      <p className="text-[11px] text-emerald-300/80">
                        Signed by Alex Rivera (alex@apextech.io) · Verification Hash:{' '}
                        <span className="font-mono text-emerald-200">9c4e8a1f...77b</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-md self-start sm:self-center">
                    Ready for Invoicing
                  </span>
                </div>

                {/* Line Items Table Preview */}
                <div className="rounded-xl border border-white/[0.08] bg-slate-950/40 overflow-hidden text-xs">
                  <div className="grid grid-cols-12 px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] font-semibold text-slate-400">
                    <div className="col-span-6 sm:col-span-7">Item Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-2 sm:col-span-1 text-right">Total</div>
                  </div>

                  <div className="divide-y divide-white/[0.04]">
                    <div className="grid grid-cols-12 px-4 py-3 items-center text-slate-200">
                      <div className="col-span-6 sm:col-span-7 font-medium">
                        Enterprise Cloud Hosting & Migration Architecture
                        <span className="block text-[11px] text-slate-400 font-normal">
                          Multi-region cluster with automated failover & backup
                        </span>
                      </div>
                      <div className="col-span-2 text-right text-slate-400">1 unit</div>
                      <div className="col-span-2 text-right text-slate-300">$4,500.00</div>
                      <div className="col-span-2 sm:col-span-1 text-right font-semibold text-white">
                        $4,500.00
                      </div>
                    </div>

                    <div className="grid grid-cols-12 px-4 py-3 items-center text-slate-200">
                      <div className="col-span-6 sm:col-span-7 font-medium">
                        Annual 24/7 Priority SLA & DevOps Support
                        <span className="block text-[11px] text-slate-400 font-normal">
                          Dedicated Slack bridge & sub-15min response guarantee
                        </span>
                      </div>
                      <div className="col-span-2 text-right text-slate-400">12 mos</div>
                      <div className="col-span-2 text-right text-slate-300">$350.00</div>
                      <div className="col-span-2 sm:col-span-1 text-right font-semibold text-white">
                        $4,200.00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtotals & Grand Total Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pt-2">
                  <div className="text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Payment Terms</p>
                    <p>50% advance upon digital agreement, balance within 30 days of delivery.</p>
                  </div>

                  <div className="w-full sm:w-64 space-y-1.5 text-xs text-right border-t sm:border-t-0 border-white/[0.06] pt-3 sm:pt-0">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-medium text-slate-200">$8,700.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Commercial Discount:</span>
                      <span className="font-medium text-emerald-400">-$500.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tax / GST (18%):</span>
                      <span className="font-medium text-slate-200">$1,476.00</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/[0.08] text-sm font-black text-white">
                      <span>Grand Total:</span>
                      <span className="text-lg bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                        $9,676.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SHOWCASE (7 CORE FEATURES WITH REAL UI VISUALS) */}
        <section id="features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-indigo-400 uppercase mb-3">
              Complete Feature Suite
            </h2>
            <p className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Built for Modern Sales Workflows
            </p>
            <p className="text-slate-300 text-sm sm:text-base mt-3">
              Explore how QuoteFlow replaces disjointed Word files, email chains, and manual invoices
              with one cohesive SaaS experience.
            </p>
          </div>

          {/* Interactive Feature Category Tabs */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
            {featureTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFeatureTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-white/20 shadow-lg shadow-indigo-600/30 scale-105'
                      : 'bg-slate-900/60 text-slate-400 border-white/[0.08] hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Feature Details Container */}
          <div className="rounded-3xl border border-white/[0.1] bg-[#0c1224]/80 backdrop-blur-xl p-6 sm:p-10 shadow-2xl transition-all">
            {/* Feature 1: Professional Quotations */}
            {activeFeatureTab === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                    <FileText className="h-3.5 w-3.5" /> Feature 01
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Professional Quotations
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Create and send beautiful, branded quotations in minutes. Pick customers from your
                    address book, apply custom line-item discounts, compute taxes automatically, and
                    present your brand with pride.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Multi-currency support with real-time tax calculation
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Itemized goods and services with custom units and rates
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Dynamic company logo, payment instructions, and terms
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-5 shadow-inner">
                  {/* Realistic Quote Document Mockup */}
                  <div className="border border-white/[0.06] rounded-xl p-5 bg-[#090e1c] space-y-4 text-xs">
                    <div className="flex justify-between items-start border-b border-white/[0.06] pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                          Q
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">Pozone Technologies</p>
                          <p className="text-slate-400 text-[11px]">invoicing@pozone.com</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-200">QUOTATION</p>
                        <p className="text-indigo-400 font-mono">Q-000108</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                      <div>
                        <p className="text-slate-500 font-semibold uppercase">Quoted To</p>
                        <p className="text-white font-medium">CyberShield Networks Inc.</p>
                        <p className="text-slate-400">Seattle, WA · VAT #US882910</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 font-semibold uppercase">Dates</p>
                        <p className="text-slate-300">Issued: 01 Oct 2026</p>
                        <p className="text-amber-400 font-medium">Valid until: 31 Oct 2026</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-slate-900/60 p-3 space-y-2">
                      <div className="flex justify-between font-medium text-slate-200">
                        <span>Managed Security & Threat Intelligence (Q4)</span>
                        <span className="font-bold text-white">$6,400.00</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Zero-Trust Endpoint Configuration (50 Seats)</span>
                        <span>$2,500.00</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 font-bold text-sm text-white border-t border-white/[0.06]">
                      <span className="text-slate-400 text-xs">Total Quoted Value</span>
                      <span className="text-indigo-300 font-mono text-base">$8,900.00 USD</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 2: Secure Approval Links */}
            {activeFeatureTab === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                    <Lock className="h-3.5 w-3.5" /> Feature 02
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Secure Approval Links
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Share secure and unique quotation approval links with customers. Each link uses an
                    unguessable cryptographic token, preventing search crawler indexing or unauthorized access.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Unguessable 256-bit tokenized customer URLs
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Optional PIN-code authentication or SMS/Email OTP
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      1-click instant sharing via WhatsApp, Slack, or Email
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-6 shadow-inner space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Customer Public Approval Link
                    </label>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-white/[0.1] p-1.5 pr-2">
                      <div className="flex-1 px-3 py-2 text-xs font-mono text-indigo-300 truncate">
                        https://blendandbold.com/q/sec_8f92m1k4092b
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] text-xs">
                      <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" /> PIN Gate Security
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1">
                        Requires customer phone or email verification before viewing financial figures.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] text-xs">
                      <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                        <Share2 className="h-4 w-4" /> Instant Delivery
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1">
                        Send formatted messages directly to client WhatsApp without saving contacts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 3: Real-Time View Tracking */}
            {activeFeatureTab === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                    <Eye className="h-3.5 w-3.5" /> Feature 03
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Real-Time View Tracking
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Know when customers open, view, sign and approve quotations. Stop wondering if your
                    estimate was received — get instant telemetry with browser, device, and timestamp logs.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      First view and repeat engagement counters
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Client device & IP location telemetry
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Time-to-approval analytics for your sales pipeline
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-6 shadow-inner">
                  {/* Timeline with Sent, Viewed, Signed, and Approved Events */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3.5 relative">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 z-10">
                        <Share2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 pb-4 border-b border-white/[0.06]">
                        <div className="flex justify-between items-center text-xs">
                          <p className="font-bold text-white">Quotation Dispatched</p>
                          <span className="text-slate-400 text-[11px]">Today, 10:14 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Sent via secure public link by Subesh (Sales Director)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 relative">
                      <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 z-10">
                        <Eye className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 pb-4 border-b border-white/[0.06]">
                        <div className="flex justify-between items-center text-xs">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            Customer Viewed Document
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px]">
                              View #1
                            </span>
                          </p>
                          <span className="text-slate-400 text-[11px]">Today, 10:22 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Opened on Chrome 129 · Apple iPad OS · IP: 49.37.194.88
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 relative">
                      <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 z-10">
                        <PenTool className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 pb-4 border-b border-white/[0.06]">
                        <div className="flex justify-between items-center text-xs">
                          <p className="font-bold text-white">Digital Signature Captured</p>
                          <span className="text-slate-400 text-[11px]">Today, 10:35 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Drawn signature submitted by David Kim (VP Technology)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5 relative">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 z-10">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center text-xs">
                          <p className="font-bold text-emerald-300">Officially Approved & Locked</p>
                          <span className="text-slate-400 text-[11px]">Today, 10:36 AM</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono text-[10px]">
                          Cryptographic hash generated: 4e89bb219f8ca730a911762c...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 4: Digital Signatures */}
            {activeFeatureTab === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                    <PenTool className="h-3.5 w-3.5" /> Feature 04
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Digital Signatures
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Allow clients to sign quotations using touch, mouse or pen. Zero friction — clients do
                    not need to create accounts, install third-party plugins, or print documents.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Touch-friendly signature pad with pen velocity smoothing
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Type-to-sign fonts and company seal uploads
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Legally binding audit stamp with IP & timestamp watermark
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-6 shadow-inner space-y-4">
                  {/* Signature UI Option Tabs */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs">
                    <p className="font-bold text-white">Digital Signature Pad</p>
                    <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setSignatureType('draw')}
                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          signatureType === 'draw'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Draw
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureType('type')}
                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          signatureType === 'type'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Type
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureType('upload')}
                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          signatureType === 'upload'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  {/* Canvas Visual */}
                  <div className="h-32 rounded-xl border border-dashed border-white/[0.15] bg-slate-900/60 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                    <span className="font-serif italic text-3xl text-indigo-300 select-none rotate-[-4deg]">
                      Sarah Jenkins
                    </span>
                    <div className="absolute bottom-2 right-3 text-[10px] text-slate-500 font-mono">
                      Timestamp: 2026-10-01 10:35:42 UTC
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>I confirm I am authorized to digitally approve and execute this order.</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300 font-semibold">Verification Certificate Active</span>
                    <span className="font-mono text-emerald-400">SHA-256 Validated</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 5: Instant PDF Generation */}
            {activeFeatureTab === 4 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                    <Download className="h-3.5 w-3.5" /> Feature 05
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Instant PDF Generation
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Generate professional server-side quotation and invoice PDFs. High-resolution vector
                    layouts, complete with verification watermarks, company branding, and mobile-scannable QR codes.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      100% server-side deterministic PDF rendering
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Tamper-evident QR code for instant phone authenticity verification
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Dual quotation and tax invoice PDF export formats
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-6 shadow-inner">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quotation PDF Card */}
                    <div className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-indigo-400" />
                          Quotation PDF
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Q-000042.pdf</span>
                      </div>
                      <div className="h-28 rounded-lg bg-slate-950 border border-white/[0.05] p-3 flex flex-col justify-between text-[10px] text-slate-400">
                        <div className="flex justify-between">
                          <span className="text-slate-300 font-semibold">QuoteFlow PDF</span>
                          <span className="text-emerald-400 font-bold">APPROVED</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 w-3/4 bg-white/10 rounded" />
                          <div className="h-1.5 w-1/2 bg-white/10 rounded" />
                        </div>
                        <div className="flex items-center gap-2 text-indigo-300 font-mono">
                          <QrCode className="h-4 w-4" />
                          <span>QR Certified</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold pt-1">
                        <span>Vector Quality</span>
                        <span className="text-slate-400 font-normal">248 KB</span>
                      </div>
                    </div>

                    {/* Invoice PDF Card */}
                    <div className="rounded-xl border border-white/[0.08] bg-slate-900/70 p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-purple-400" />
                          Invoice PDF
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">INV-000018.pdf</span>
                      </div>
                      <div className="h-28 rounded-lg bg-slate-950 border border-white/[0.05] p-3 flex flex-col justify-between text-[10px] text-slate-400">
                        <div className="flex justify-between">
                          <span className="text-slate-300 font-semibold">Commercial Tax Invoice</span>
                          <span className="text-purple-300 font-bold">ISSUED</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 w-3/4 bg-white/10 rounded" />
                          <div className="h-1.5 w-1/2 bg-white/10 rounded" />
                        </div>
                        <div className="flex items-center gap-2 text-purple-300 font-mono">
                          <QrCode className="h-4 w-4" />
                          <span>GST Compliant</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-purple-400 font-semibold pt-1">
                        <span>Tax Certified</span>
                        <span className="text-slate-400 font-normal">312 KB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 6: Quotations & Invoices */}
            {activeFeatureTab === 5 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
                    <Receipt className="h-3.5 w-3.5" /> Feature 06
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Quotations & Invoices
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Manage quotations and invoices from dedicated dashboard sections. Convert signed
                    proposals into legally binding tax invoices with a single click, eliminating duplicate data entry.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      1-click quotation to invoice conversion
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Payment settlement tracking and partial balance records
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Automated invoice numbering sequence (`INV-000001`)
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-6 shadow-inner space-y-4">
                  {/* Dashboard Tab Selector */}
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 text-xs">
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Quotations (24)</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-slate-300 font-semibold flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Invoices (18)</span>
                    </div>
                  </div>

                  {/* 1-Click Conversion Card */}
                  <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Convert Approved Quote to Invoice</span>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/20 px-2 py-0.5 rounded">
                        1-Click Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Quotation Q-000042 was approved by Apex Global Tech ($9,676.00). Generate commercial tax invoice instantly.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/30"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Generate Invoice INV-000042</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Feature 7: Audit Logs */}
            {activeFeatureTab === 6 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                    <History className="h-3.5 w-3.5" /> Feature 07
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Audit Logs
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Maintain a complete record of quotation activity, approvals and signatures. Every event
                    is stored with actor metadata, IP addresses, client browser agents, and immutable timestamps.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Tamper-evident activity trail for compliance and disputes
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Staff versus customer actor attribution
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      SHA-256 cryptographic document hashes
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-950/80 p-6 shadow-inner space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-white/[0.06]">
                    <span>Event Activity Stream</span>
                    <span className="text-emerald-400">● LIVE LEDGER</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.05] flex justify-between items-center">
                      <div>
                        <span className="text-emerald-300 font-bold">DOCUMENT_APPROVED</span>
                        <p className="text-[10px] text-slate-400">Actor: Client (alex@apextech.io) · IP: 172.56.21.9</p>
                      </div>
                      <span className="text-[10px] text-slate-500">10:36:12</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.05] flex justify-between items-center">
                      <div>
                        <span className="text-amber-300 font-bold">SIGNATURE_ATTACHED</span>
                        <p className="text-[10px] text-slate-400">Type: TOUCH_DRAWN · Hash: 9c4e8a1f...77b</p>
                      </div>
                      <span className="text-[10px] text-slate-500">10:35:42</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/[0.05] flex justify-between items-center">
                      <div>
                        <span className="text-indigo-300 font-bold">PORTAL_VIEWED</span>
                        <p className="text-[10px] text-slate-400">Agent: Chrome 129 / macOS · Public Token Validated</p>
                      </div>
                      <span className="text-[10px] text-slate-500">10:22:04</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WORKFLOW SECTION */}
        <section id="workflow" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-white/[0.06]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-purple-400 uppercase mb-3">
              How QuoteFlow Works
            </h2>
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              From Draft to Signed in Minutes
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 space-y-3 relative hover:border-indigo-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-base text-white">Create Branded Quote</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add custom line items, choose your pricing model, configure discounts, and apply company logo and terms.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 space-y-3 relative hover:border-blue-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-base text-white">Send Secure Link</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Share an unguessable public link via WhatsApp, Slack or Email with optional PIN and OTP gatekeeper protection.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 space-y-3 relative hover:border-purple-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-base text-white">Collect Digital Sign</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clients review details on mobile or desktop and execute a legally binding signature with tamper-evident seals.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 space-y-3 relative hover:border-emerald-500/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="font-bold text-base text-white">1-Click Invoice & PDF</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically generate server-side PDFs and convert the approved quotation into an official commercial tax invoice.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA SECTION */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto text-center">
          <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-slate-900/80 to-[#070b14] p-8 sm:p-14 relative overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
              Ready to Close Deals Faster?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto mb-8">
              Join thousands of businesses that send professional, digital-first quotations and receive
              signed approvals in record time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-xl shadow-indigo-600/40 px-8 py-3.5 h-12 rounded-full text-base border border-white/20">
                    <LayoutDashboard className="h-5 w-5 mr-2" />
                    Go to Your Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-xl shadow-indigo-600/40 px-8 py-3.5 h-12 rounded-full text-base border border-white/20">
                      Sign Up Free
                    </Button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      className="w-full sm:w-auto text-slate-300 hover:text-white hover:bg-white/[0.08] px-6 py-3.5 h-12 rounded-full text-base border border-white/10"
                    >
                      Log In to Existing Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER (MATCHING EXACT JSON REQUIREMENTS) */}
      <footer className="border-t border-white/[0.08] bg-[#050811] py-8 px-4 sm:px-6 text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Logo & Platform Attribution */}
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-sm">
              Q
            </div>
            {/* Branding Text: QuoteFlow · Powered by BlendAndBold */}
            <div className="flex items-center gap-1.5 text-center md:text-left">
              <span className="font-semibold text-slate-200 tracking-tight">QuoteFlow</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 text-xs">Powered by</span>
              <a
                href="https://blendandbold.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-purple-400 transition-colors font-medium flex items-center gap-0.5"
              >
                <span>BlendAndBold</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </div>
          </div>

          {/* Quick Legal / Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-slate-200 transition-colors">
              Workflow
            </a>
            <Link href="/login" className="hover:text-slate-200 transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-200 transition-colors">
              Create Account
            </Link>
          </div>

          {/* Copyright notice */}
          <div className="text-slate-500 text-[11px] text-center md:text-right">
            © {new Date().getFullYear()} QuoteFlow. All rights reserved.
          </div>
        </div>
      </footer>

      {/* INTERACTIVE DEMO MODAL */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#0a0f20] p-6 sm:p-8 shadow-2xl text-left space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">QuoteFlow Interactive Walkthrough</h3>
                  <p className="text-xs text-slate-400">Experience how easily quotations are closed</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Selector */}
            <div className="grid grid-cols-4 gap-2">
              {demoSteps.map((step, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDemoStep(idx)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    demoStep === idx
                      ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
                      : 'bg-slate-900/50 border-white/[0.06] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    Step 0{idx + 1}
                  </p>
                  <p className="text-xs font-bold truncate mt-0.5">{step.badge}</p>
                </button>
              ))}
            </div>

            {/* Step Body */}
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-950/70 space-y-3">
              <h4 className="text-lg font-black text-white">{demoSteps[demoStep].title}</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{demoSteps[demoStep].desc}</p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setDemoStep((prev) => (prev > 0 ? prev - 1 : 3))}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← Previous Step
              </button>

              <div className="flex items-center gap-3">
                {demoStep < 3 ? (
                  <Button
                    onClick={() => setDemoStep((prev) => prev + 1)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 h-9 rounded-xl"
                  >
                    Next Step →
                  </Button>
                ) : (
                  <Link href="/register">
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-xs px-5 h-9 rounded-xl">
                      Try QuoteFlow Free
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
