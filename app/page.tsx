import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  FileCheck,
  Send,
  ShieldCheck,
  Eye,
  TrendingUp,
  FileText,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-800/80 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
              Q
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">QuoteFlow</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Log In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="primary" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30">
                Open Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300">
          <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          Cloud-Based Quotation & Digital Approval SaaS
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Create, Send & Get Quotations{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
            Digitally Approved
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Send clients unguessable public links, monitor when they view estimates in real-time,
          and secure legally binding signatures with automated audit logs.
        </p>

        {/* Quick Launch CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/dashboard">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-base px-8 shadow-xl shadow-indigo-600/40">
              Enter Business Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/q/demo_token_sent_q002">
            <Button size="lg" variant="outline" className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 gap-2 text-base px-6">
              <FileCheck className="h-5 w-5 text-emerald-400" />
              Test Customer Approval Portal
            </Button>
          </Link>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 text-left">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Live View Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Get notified the second a customer opens your estimate. Track first view, device metadata, and view frequency.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Touch & Mouse Signatures</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clients sign directly on their smartphone, tablet, or desktop without downloading apps or creating accounts.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Instant Server-Side PDF</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Produce immaculate, branded PDFs complete with verified electronic signature watermarks and immutable document hashes.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        <p>QuoteFlow SaaS Platform © 2026. Built with Next.js, Supabase, Tailwind CSS, and TypeScript.</p>
      </footer>
    </div>
  );
}
