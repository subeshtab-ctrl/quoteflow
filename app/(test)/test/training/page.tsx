'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  FileText,
  Receipt,
  Globe,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  ArrowRight,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Module {
  id: number;
  title: string;
  description: string;
  duration: string;
  steps: string[];
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  cta: string;
  ctaHref: string;
}

const modules: Module[] = [
  {
    id: 1,
    title: 'Module 1: Creating a Test Quote',
    description: 'Learn to build a professional quotation from scratch using demo customers and products.',
    duration: '5 min',
    steps: [
      'Go to Test Quotes → New Test Quote',
      'Select "Demo Customer 1" from the customer list',
      'Add at least one product or service line item',
      'Set a discount and review the totals',
      'Click "Save as Draft" to save your test quotation',
      'Open the quote and click "Send" to simulate sending to the client',
      'Check the Simulated Emails tab to see what the client would receive',
    ],
    href: '/test/training/create-quote',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-100 dark:border-blue-900/40',
    cta: 'Create Test Quote',
    ctaHref: '/test/quotations/new',
  },
  {
    id: 2,
    title: 'Module 2: Creating a Test Invoice',
    description: 'Practice creating standalone invoices and converting approved quotations to invoices.',
    duration: '5 min',
    steps: [
      'Go to Test Invoices → New Test Invoice',
      'Select a demo customer',
      'Add line items and set payment terms',
      'Save the invoice and review the TEST-INV-XXXXX number',
      'Download the PDF to see the test watermark',
      'Practice marking it as paid using "Simulate Payment"',
    ],
    href: '/test/training/create-invoice',
    icon: Receipt,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-100 dark:border-purple-900/40',
    cta: 'Create Test Invoice',
    ctaHref: '/test/invoices/new',
  },
  {
    id: 3,
    title: 'Module 3: Client Portal Walkthrough',
    description: 'Experience the quote/invoice portal from your client\'s perspective using demo credentials.',
    duration: '7 min',
    steps: [
      'Create a test quotation and set status to "Sent"',
      'Click "Copy Client Link" to get the portal URL',
      'Open the URL in a new browser tab (or use incognito mode)',
      'Login with the demo customer\'s email and PIN: 1234',
      'Review the quote as the client would see it',
      'Click "Approve Quote" to simulate client approval',
      'Return to the test dashboard and see the quote marked as Approved',
    ],
    href: '/test/training/client-portal',
    icon: Globe,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-100 dark:border-emerald-900/40',
    cta: 'Go to Test Portal',
    ctaHref: '/test/client-portal',
  },
  {
    id: 4,
    title: 'Module 4: Invoice Management',
    description: 'Learn the full invoice lifecycle — tracking, cancelling, and voiding invoices safely.',
    duration: '8 min',
    steps: [
      'Create a test invoice and set it to "Sent" status',
      'Practice marking it "Partially Paid" with a payment amount',
      'Then mark it as fully paid',
      'Try the "Cancel" workflow — requires a reason + typing CONFIRM',
      'See how Voided invoices appear in the list (greyed out)',
      'Note: Live invoices cannot be deleted — only test invoices can',
      'Observe the audit trail logged for each action',
    ],
    href: '/test/training/invoice-management',
    icon: ShieldCheck,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-100 dark:border-amber-900/40',
    cta: 'View Test Invoices',
    ctaHref: '/test/invoices',
  },
  {
    id: 5,
    title: 'Module 5: Customer Management',
    description: 'Learn to add, edit and manage customer profiles effectively.',
    duration: '5 min',
    steps: [
      'Review the 3 pre-loaded demo customers',
      'Understand demo PIN 1234 used for portal access',
      'Go to Live → Customers to practice adding a real customer',
      'Fill in company name, GST/VAT number, billing address',
      'Set preferred contact method (email vs mobile OTP)',
      'Test the customer lookup in the new quotation form',
    ],
    href: '/test/training/customer-management',
    icon: Users,
    color: 'text-rose-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-100 dark:border-rose-900/40',
    cta: 'View Test Customers',
    ctaHref: '/test/customers',
  },
];

export default function TrainingCenterPage() {
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Staff Training Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Step-by-step guided walkthroughs for all core QuoteFlow features. Safe to practice — no real data is affected.
          </p>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white shadow-md">
        <div className="flex items-start gap-4">
          <FlaskConical className="h-8 w-8 text-amber-100 shrink-0 mt-0.5" />
          <div>
            <p className="text-lg font-bold text-white mb-1">Welcome to Test Mode Training</p>
            <p className="text-sm text-amber-100">
              All 5 modules below use the sandbox environment. Complete them in any order.
              When you&apos;re confident, switch to Live Mode to process real business.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/test/dashboard">
                <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold text-white border border-white/30 transition-colors">
                  Test Dashboard
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="px-4 py-2 bg-amber-900/30 hover:bg-amber-900/50 rounded-xl text-sm font-semibold text-white border border-white/20 transition-colors">
                  Go to Live Mode →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Training Modules */}
      <div className="space-y-4">
        {modules.map((mod) => {
          const isExpanded = expandedModule === mod.id;
          return (
            <div
              key={mod.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className={`p-3 rounded-xl ${mod.bg} border ${mod.border} shrink-0`}>
                  <mod.icon className={`h-5 w-5 ${mod.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{mod.title}</h3>
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      <BookOpen className="h-3 w-3" />
                      {mod.duration}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{mod.description}</p>
                </div>
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Module Steps (expanded) */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-800/20">
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Step-by-step instructions
                  </p>
                  <ol className="space-y-2">
                    {mod.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-5">
                    <Link href={mod.ctaHref}>
                      <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                        <PlayCircle className="h-4 w-4" />
                        {mod.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/10 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Ready to go live?</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
              Once you&apos;ve completed all modules and feel confident, head to Settings → Operating Mode
              and switch to Live Mode. Your live business data is completely separate from test data.
            </p>
            <Link href="/settings" className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
              Go to Settings <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
