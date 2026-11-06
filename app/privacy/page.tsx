import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Mail, Lock, CheckCircle2, FileText } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - QuoteFlow',
  description:
    'QuoteFlow privacy policy detailing data collection, Google OAuth user data usage, and security policies.',
};

export default function PrivacyPage() {
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
            <Shield className="h-3.5 w-3.5" />
            <span>Official Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Last Updated: October 13, 2026 • Effective Date: October 1, 2026
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. Introduction &amp; Ownership
            </h2>
            <p>
              Welcome to <strong>QuoteFlow</strong> (operated by <strong>Blend &amp; Bold</strong>, available at{' '}
              <a href="https://blendandbold.com" className="text-indigo-600 underline font-medium">
                https://blendandbold.com
              </a>
              ). We provide a professional quotation, invoicing, and client approval platform for businesses, freelancers, and enterprises.
            </p>
            <p>
              This Privacy Policy explains what personal information we collect, why we collect it, how it is used, and how we protect your information when you use our website, application, and services.
            </p>
          </section>

          {/* Section 2: Google OAuth Data Specifically */}
          <section className="space-y-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 p-6 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Google User Data Policy &amp; Limited Use Disclosure
              </h2>
            </div>
            <p>
              When you choose to sign up or sign in to QuoteFlow using your <strong>Google Account</strong> (via Google OAuth / Google Sign-In), we access only the basic profile data provided by Google:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-700 dark:text-slate-300">
              <li><strong>Your Email Address:</strong> Used solely to identify your account, send workspace notifications, and link your company organization.</li>
              <li><strong>Your Name:</strong> Used to display your name on quotations, team member lists, and profile settings.</li>
              <li><strong>Your Profile Photo / Avatar:</strong> Displayed within your personal workspace navigation.</li>
            </ul>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Our Commitments to Google User Data:</span>
              </h3>
              <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400 list-disc pl-4">
                <li>We <strong>NEVER</strong> sell, rent, or trade your Google user data to any third party.</li>
                <li>We <strong>NEVER</strong> use Google user data for advertising, marketing profiling, or retargeting purposes.</li>
                <li>We <strong>NEVER</strong> request access to your Google Drive, Gmail messages, contacts, or calendar. We only request basic identification (openid, email, profile).</li>
                <li>Google user data is used strictly to provide and improve the QuoteFlow quotation service.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Information We Collect */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Information We Collect
            </h2>
            <p>In addition to Google OAuth credentials, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account and Business Information:</strong> Your business name, GST/Tax identification number, business address, phone number, and logo that you upload to customize quotations and invoices.
              </li>
              <li>
                <strong>Quotation and Financial Data:</strong> Customer contact details you save, line items, pricing, payment terms, and generated quotation/invoice PDFs.
              </li>
              <li>
                <strong>Usage and System Logs:</strong> Device type, browser user agent, IP address, and timestamp logs when clients open, digitally sign, or approve quotation links.
              </li>
            </ul>
          </section>

          {/* Section 4: Data Storage & Security */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              4. Data Storage, Security &amp; Hosting
            </h2>
            <p>
              Your security is our top priority. All database communication, authentication sessions, and file uploads are secured with industry-standard TLS/SSL encryption (HTTPS). Data is hosted securely on high-availability cloud infrastructure with strict Row-Level Security (RLS) policies, preventing unauthorized cross-tenant data access.
            </p>
          </section>

          {/* Section 5: Data Retention & User Rights */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              5. Your Rights &amp; Data Deletion
            </h2>
            <p>You have full ownership and control over your personal data:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Access &amp; Export:</strong> You can export your quotations, invoices, and customer lists anytime.</li>
              <li><strong>Correction:</strong> You can update your profile, email, company name, and banking details directly in Settings.</li>
              <li>
                <strong>Account Deletion:</strong> You can request permanent deletion of your account and all associated quotation data by contacting us at{' '}
                <a href="mailto:quotes@blendandbold.com" className="text-indigo-600 underline font-medium">
                  quotes@blendandbold.com
                </a>
                . All associated records will be permanently purged within 30 days.
              </li>
            </ul>
          </section>

          {/* Section 6: Third-Party Services */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              6. Third-Party Service Providers
            </h2>
            <p>
              We partner with trusted third-party cloud service providers strictly for essential infrastructure purposes:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase:</strong> For database management and secure authentication.</li>
              <li><strong>Cloudflare:</strong> For global CDN edge delivery and DDoS mitigation.</li>
              <li><strong>Razorpay:</strong> For secure subscription payment processing (we never store credit card or CVV details).</li>
            </ul>
          </section>

          {/* Section 7: Contact Us */}
          <section className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              7. Contact Information
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact our privacy team at:
            </p>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-xs">
              <p><strong>Blend &amp; Bold (QuoteFlow)</strong></p>
              <p>Email: <a href="mailto:quotes@blendandbold.com" className="text-indigo-600 underline">quotes@blendandbold.com</a> / <a href="mailto:subeshtab@gmail.com" className="text-indigo-600 underline">subeshtab@gmail.com</a></p>
              <p>Website: <a href="https://blendandbold.com" className="text-indigo-600 underline">https://blendandbold.com</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} QuoteFlow by Blend &amp; Bold. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-indigo-600">Home</Link>
            <Link href="/privacy" className="hover:text-indigo-600 font-semibold text-indigo-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-indigo-600">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
