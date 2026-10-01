'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  FileText,
  Receipt,
  Globe,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Module {
  id: number;
  title: string;
  category: string;
  description: string;
  duration: string;
  steps: string[];
  cta: string;
  ctaHref: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}

const modules: Module[] = [
  {
    id: 1,
    title: '1. How to Create and Send a Quotation',
    category: 'Sales Proposals',
    description: 'Learn how to build an itemized proposal, configure customer details, add discounts/taxes, and share it.',
    duration: '4 min',
    steps: [
      'Navigate to Quotations in the sidebar and click "+ New Quotation".',
      'Select a customer from the dropdown or click "+ Add New Customer" to register their company, GST/tax ID, and contact details.',
      'Add line items: provide descriptions, quantities, unit prices, and select GST/tax percentage.',
      'Configure payment terms: set the required advance percentage (e.g. 50%) and proposal validity date.',
      'Click "Save as Draft" to review internally or "Send Quotation" to generate the secure client link and send automated emails.',
      'Once sent, click "Copy Client Link" to share via WhatsApp, Email, or Slack.',
    ],
    cta: 'Create a Quotation',
    ctaHref: '/quotations/new',
    icon: FileText,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
  },
  {
    id: 2,
    title: '2. How to Create & Issue Commercial Invoices',
    category: 'Invoicing & Billing',
    description: 'Master 1-click conversion from approved quotes or issuing direct commercial invoices with sequential numbering.',
    duration: '5 min',
    steps: [
      'Method 1 (Convert Quote): Open any quotation marked APPROVED or COMPLETED, and click "Generate Invoice". All items and customer data transfer automatically.',
      'Method 2 (Direct Invoice): Go to Invoices → "Create Invoice" to bill clients without an existing quotation.',
      'Review your organization\'s sequential invoice number (e.g. INV-000001) and set the payment due date.',
      'Ensure your Bank and UPI details are enabled so the client sees payment options on the invoice.',
      'Save the invoice. Download the official PDF or share the digital invoice link with your client.',
      'Record payments as they arrive (advance or final) to automatically generate official PDF receipts.',
    ],
    cta: 'Create an Invoice',
    ctaHref: '/invoices/new',
    icon: Receipt,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
  },
  {
    id: 3,
    title: '3. Understanding the Client Portal Link',
    category: 'Client Experience',
    description: 'See what your clients see when they open your shared link, and how approvals and chat work in real-time.',
    duration: '4 min',
    steps: [
      'Every quotation has a unique, secure public token: https://www.blendandbold.com/q/[secure-token].',
      'The client portal is 100% mobile-friendly — clients can review it on smartphone, tablet, or desktop with no app installation needed.',
      'Interactive Totals: Clients review itemized descriptions, rates, tax calculations, and required deposit.',
      '1-Click Digital Approval: Clients tap "Approve Quotation" to accept. You get an instant notification on your dashboard.',
      'Direct Rejection with Notes: If the scope or budget doesn\'t fit, clients can decline with comments so you can follow up.',
      'Embedded Live Chat: Clients can ask questions right on the proposal. Staff receive unread message badges on the dashboard.',
    ],
    cta: 'View Quotations',
    ctaHref: '/quotations',
    icon: Globe,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-100 dark:border-sky-900/50',
  },
  {
    id: 4,
    title: '4. Payment Collection, Bank Details & UPI QR Code',
    category: 'Finance & Payments',
    description: 'Set up Bank details, UPI QR codes, and generate official payment confirmation receipts.',
    duration: '3 min',
    steps: [
      'Go to Settings → Default Payment Details.',
      'Enter your Bank Account Name, Number, IFSC code, and Branch.',
      'Enter your UPI ID (e.g. yourbusiness@upi) and upload your official UPI QR code graphic.',
      'Select whether to display Bank Details, UPI, or Both on customer documents.',
      'When payments arrive, open the invoice or quote, click "Record Payment", and enter the transaction reference.',
      'Download and email the official Payment Receipt PDF to the customer.',
    ],
    cta: 'Manage Payment Settings',
    ctaHref: '/settings',
    icon: CreditCard,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-100 dark:border-purple-900/50',
  },
  {
    id: 5,
    title: '5. Live Immutability, Audit Trails & Compliance',
    category: 'Legal & Accounting',
    description: 'Learn why live commercial documents cannot be deleted and how to void or cancel them legally.',
    duration: '3 min',
    steps: [
      'All documents issued in Live Production Mode follow strict commercial accounting and tax compliance standards.',
      'Sequential continuity: Invoice numbers must remain unbroken (INV-000001, INV-000002, etc.) for GST/tax auditing.',
      'Cancelling an Invoice: If a mistake was made, open the invoice and select "Cancel / Void". State the reason for cancellation.',
      'Cancelled invoices are greyed out, removed from active revenue totals, but preserved with an immutable audit log.',
      'Creating Revisions: If quotation scope changes, click "Create Revision" to create Rev 2, maintaining complete history of prior negotiations.',
    ],
    cta: 'Go to Settings',
    ctaHref: '/settings',
    icon: ShieldCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
  },
];

export function TrainingView() {
  const [expandedModule, setExpandedModule] = useState<number | null>(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyExample = () => {
    navigator.clipboard?.writeText('https://www.blendandbold.com/q/demo-proposal-sample');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shadow-xs">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                QuoteFlow Training & Guides
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Live System
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Comprehensive step-by-step walkthroughs for making quotations, issuing invoices, sharing client portal links, and recording payments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/quotations/new">
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs">
              <FileText className="h-4 w-4" />
              <span>New Quotation</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Client Portal Link Feature Banner */}
      <div className="rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-indigo-200 border border-white/10 backdrop-blur-md">
            <Globe className="h-3.5 w-3.5 text-indigo-400" />
            <span>How Client Links Work</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Share instant proposals via WhatsApp, SMS, or Email
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Every quotation has a unique private web link. When customers open it on their mobile phone or PC, they see your branded proposal, bank/UPI scan-to-pay options, and can tap to approve immediately.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-md flex-1 min-w-0">
              <code className="text-xs text-indigo-200 font-mono truncate">
                https://www.blendandbold.com/q/sample-client-token...
              </code>
              <button
                type="button"
                onClick={handleCopyExample}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 shrink-0 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedLink ? 'Copied' : 'Copy Demo URL'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Accordion */}
      <div className="space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span>Interactive Training Modules</span>
        </h3>

        <div className="space-y-3">
          {modules.map((mod) => {
            const isExpanded = expandedModule === mod.id;
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all"
              >
                {/* Module Header Bar */}
                <button
                  type="button"
                  onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className={`p-3 rounded-2xl ${mod.bg} border ${mod.border} shrink-0`}>
                    <Icon className={`h-5 w-5 ${mod.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {mod.category}
                      </span>
                      <span className="text-xs text-slate-400">⏱️ {mod.duration}</span>
                    </div>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 mt-1">
                      {mod.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {mod.description}
                    </p>
                  </div>

                  <div className="shrink-0 p-2 text-slate-400">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </button>

                {/* Expanded Steps */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-850/30 space-y-5">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Step-by-Step Instructions
                      </p>
                      <ol className="space-y-3">
                        {mod.steps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-black shadow-xs mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-0.5">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <Link href={mod.ctaHref}>
                        <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                          <span>{mod.cta}</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
