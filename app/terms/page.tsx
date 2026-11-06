import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - QuoteFlow',
  description: 'Terms of Service governing the use of QuoteFlow quotation and invoicing platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/quoteflow-icon.png"
              alt="QuoteFlow"
              className="h-9 w-9 rounded-xl object-contain shadow-xs"
            />
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
              QuoteFlow
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="space-y-4 mb-10 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
            <FileText className="h-3.5 w-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last Updated: October 13, 2026 • Effective Date: October 1, 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using QuoteFlow (blendandbold.com), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. Description of Service
            </h2>
            <p>
              QuoteFlow provides a software-as-a-service platform for creating quotations, generating commercial invoices, sharing digital approval links, capturing digital signatures, and collecting business payments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. User Accounts &amp; Authentication
            </h2>
            <p>
              You may register using your email address or Google Sign-In. You are responsible for safeguarding your login credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Commercial Use &amp; Customer Responsibility
            </h2>
            <p>
              You maintain full ownership of all quotation content, pricing, items, and customer information you upload or generate. You represent and warrant that your quotations, invoices, and business activities comply with all applicable local tax laws, consumer protection laws, and business regulations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Subscriptions &amp; Payments
            </h2>
            <p>
              Paid subscription plans are billed in advance on a recurring monthly or annual basis via our secure payment gateway (Razorpay). You may cancel your subscription at any time from your Billing Settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Limitation of Liability
            </h2>
            <p>
              In no event shall QuoteFlow or Blend &amp; Bold be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              7. Contact Us
            </h2>
            <p>
              For legal inquiries or questions regarding these terms, contact us at{' '}
              <a href="mailto:quotes@blendandbold.com" className="text-indigo-600 underline">
                quotes@blendandbold.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} QuoteFlow by Blend &amp; Bold. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-indigo-600 font-semibold text-indigo-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
