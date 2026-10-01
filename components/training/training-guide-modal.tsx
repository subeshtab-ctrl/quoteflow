'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  FileText,
  Receipt,
  Globe,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  GraduationCap,
  Sparkles,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrainingGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'quote' | 'invoice' | 'client-link' | 'payments' | 'rules';
}

export function TrainingGuideModal({ isOpen, onClose, defaultTab = 'quote' }: TrainingGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'quote' | 'invoice' | 'client-link' | 'payments' | 'rules'>(defaultTab);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyExample = () => {
    navigator.clipboard?.writeText('https://www.blendandbold.com/q/demo-proposal-sample');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>QuoteFlow Workflow & Staff Training</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Live System Guide
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Learn how to create quotes, issue invoices, share client portal links, and record payments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('quote')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'quote'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>1. Make a Quote</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'invoice'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>2. Create an Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('client-link')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'client-link'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>3. Client Portal Link</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'payments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>4. Payments & Receipts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>5. Audit & Compliance</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: HOW TO MAKE A QUOTE */}
          {activeTab === 'quote' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200">Quotations Overview</h4>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                    A quotation is your sales proposal. Once sent, clients can review line items, negotiate via live chat, and digitally approve it directly from their phone or browser.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Select or Add Customer</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Go to <strong>Quotations → New Quotation</strong>. Choose an existing customer from the dropdown or click <em>+ Add New Customer</em> to save their business name, email, phone, and tax number.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Line Items & Rates</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Add products or services with descriptions, quantities, unit prices, and applicable GST/tax percentages. Subtotals and tax breakdowns calculate automatically.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Set Advance & Validity</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Specify the required advance percentage (e.g. 50%) and validity deadline (e.g. 15 or 30 days). Expired quotes automatically alert both you and the client.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">4</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Save Draft or Send</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Save as <strong>Draft</strong> to review with team members, or click <strong>Send</strong>. Sending instantly generates the customer link and triggers email delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Ready to test? Create a quotation directly in your workspace.
                </div>
                <Link href="/quotations/new" onClick={onClose}>
                  <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <span>Create a Quotation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: HOW TO CREATE AN INVOICE */}
          {activeTab === 'invoice' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 flex items-start gap-3">
                <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">Invoices & Sequential Billing</h4>
                  <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                    Live invoices use your organization&apos;s sequential counter (e.g. INV-000001). They serve as legally binding tax invoices for commercial accounting.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">Method A</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">1-Click Convert from Approved Quote (Recommended)</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Open any quotation that has been approved or completed. Click the <strong>Generate Invoice</strong> button. All line items, taxes, customer details, and payment terms are automatically transferred with zero retyping.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">Method B</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Direct Invoice Creation</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Go to <strong>Invoices → Create Invoice</strong> to create a direct invoice without a preliminary quotation. Choose customer, set line items, and select the payment due date.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">Step 3</span>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Issue, Send & Download PDF</h5>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-8">
                    Once saved, you can immediately download the official vector-crisp PDF invoice or share the digital invoice link. Bank transfer and UPI details will appear prominently at the bottom.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Ready to issue an invoice? Create one directly.
                </div>
                <Link href="/invoices/new" onClick={onClose}>
                  <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <span>Create an Invoice</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* TAB 3: CLIENT PORTAL LINK */}
          {activeTab === 'client-link' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-4 flex items-start gap-3">
                <Globe className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-sky-950 dark:text-sky-200">What is the Client Portal Link?</h4>
                  <p className="text-xs text-sky-900/80 dark:text-sky-300/80 mt-0.5 leading-relaxed">
                    Every quotation generates a secure, permanent public web link (`/q/[token]`). You can send this link via WhatsApp, Email, or SMS directly to your customer.
                  </p>
                </div>
              </div>

              {/* Interactive URL preview box */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Example Client Portal Link</p>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <code className="text-xs text-indigo-600 dark:text-indigo-400 font-mono truncate">
                    https://www.blendandbold.com/q/7f8a9e1b2c3d4e5f...
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyExample}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 shrink-0 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">What your customer experiences:</h5>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Clean, Mobile-Responsive Presentation:</strong> Your logo, company branding, itemized scope of work, and total cost breakdown.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>1-Click Approval:</strong> Client taps &quot;Approve Quotation&quot; to accept the terms. You receive an instant dashboard notification and email alert.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Instant Bank & UPI Payment Instructions:</strong> Shows your account number, IFSC, UPI ID, and QR code to pay advance fees immediately.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Live Chat & Revisions:</strong> Customers can reply directly on the portal to ask questions or request price/scope revisions without email back-and-forth.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS & RECEIPTS */}
          {activeTab === 'payments' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-4 flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200">Payment Collection & PDF Receipts</h4>
                  <p className="text-xs text-purple-900/80 dark:text-purple-300/80 mt-0.5 leading-relaxed">
                    QuoteFlow supports Bank Transfer, UPI QR codes, and custom payment gateways with instant receipt PDF generation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>1. Configure in Settings</span>
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Under <strong>Company Settings → Payment Methods</strong>, fill in your Bank Account Number, IFSC, UPI ID, and upload your official UPI QR code image.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>2. Automatic Portal Display</span>
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    When a client views the quote or invoice, your payment details are shown with a scan-to-pay QR code and copyable bank account numbers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>3. Record Advance Payment</span>
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    When the client sends the deposit, open the quote/invoice, click <strong>Record Payment</strong>, choose the method (NEFT, UPI, Cheque), and enter the transaction reference.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>4. Generate Payment Receipt</span>
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Each verified payment generates an official PDF Receipt for the customer confirming the payment amount, date, and remaining balance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT & COMPLIANCE */}
          {activeTab === 'rules' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">Live Production Immutability Rules</h4>
                  <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                    To comply with commercial accounting standards and GST tax audit trails, QuoteFlow enforces strict immutability.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Why can&apos;t live invoices be permanently deleted?</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Tax authorities and auditors require sequential invoice number continuity (no gaps in INV-000001, INV-000002, etc.). Deleting invoices would create missing gaps in financial books.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">How to cancel a mistake or dispute?</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Open the invoice and click <strong>Cancel / Void Invoice</strong>. You must enter a reason (e.g. &quot;Client cancelled project&quot;). The invoice is marked as Cancelled, removed from active revenue totals, but preserved with a permanent audit record.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/50 space-y-2">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">Quotation Revisions</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    If scope changes after sending a quotation, click <strong>Create Revision</strong>. The system increments the revision number (e.g. Q-000001 Rev 2), maintaining full audit history of prior estimates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50">
          <p className="text-xs text-slate-400">
            QuoteFlow Live Production Edition
          </p>
          <div className="flex items-center gap-2">
            <Link href="/quotations/new" onClick={onClose}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" />
                <span>New Quote</span>
              </Button>
            </Link>
            <Button size="sm" onClick={onClose} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs">
              Close Guide
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
