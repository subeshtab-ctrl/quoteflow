'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Building2,
  FileText,
  Receipt,
  Globe,
  Users,
  BarChart3,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PlusCircle,
  TrendingUp,
  Clock,
  Eye,
  Search,
  Bell,
  Moon,
  Send,
  Lock,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoStep {
  title: string;
  durationSec: number;
  narration: string;
  actionSummary: string;
  cursorTarget?: string;
  activeSidebarMenu: string;
  viewType: 'dashboard' | 'settings' | 'quotation' | 'invoice' | 'portal' | 'team';
  highlightActionText: string;
}

interface VideoChapter {
  id: number;
  title: string;
  category: string;
  duration: string;
  durationSec: number;
  description: string;
  cta: string;
  ctaHref: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  steps: VideoStep[];
}

const chapters: VideoChapter[] = [
  {
    id: 1,
    title: '1. Business Setup & Branding',
    category: 'Core Setup',
    duration: '3:30',
    durationSec: 210,
    description: 'Configure your company profile, brand logo, GSTIN/tax identifier, operating currency, bank account, and UPI QR code.',
    cta: 'Go to Settings',
    ctaHref: '/settings',
    icon: Building2,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    steps: [
      {
        title: 'Organization Profile & Address',
        durationSec: 40,
        narration: 'Navigate to Settings from the sidebar. Enter your Legal Business Name, registered street address, city, state, official billing email, and contact phone number. This information will appear on the header of all your quotes and invoices.',
        actionSummary: 'Settings → Organization Profile → Save Legal Details',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        cursorTarget: 'Save Organization Profile',
        highlightActionText: 'Auto-populates headers on all customer documents',
      },
      {
        title: 'Brand Logo & Custom Squircle Shape',
        durationSec: 40,
        narration: 'Upload your company logo. QuoteFlow lets you customize your logo shape to Square, Rounded, or Circle, and choose between Contain or Fill. The live preview updates instantly to ensure your documents look ultra-clean.',
        actionSummary: 'Upload Logo Graphic → Select Rounded Squircle → Set Contain',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        cursorTarget: 'Update Logo & Visual Style',
        highlightActionText: 'Renders at 300 DPI on PDFs and Client Portals',
      },
      {
        title: 'Tax Identifier (GSTIN) & Currency',
        durationSec: 45,
        narration: 'Enter your business Tax Identifier, such as your 15-digit GSTIN, and select your default operating currency. QuoteFlow automatically computes GST breakdowns, tax rates, and currency symbols.',
        actionSummary: 'Input 15-Digit GSTIN → Select Currency (INR ₹, USD $, EUR €)',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        cursorTarget: 'Save Tax Settings',
        highlightActionText: 'CGST 9% + SGST 9% auto-computed on all line items',
      },
      {
        title: 'Bank Remittance Details & UPI QR Code',
        durationSec: 45,
        narration: 'Under Payment Settings, enter your Bank Name, Account Number, IFSC code, and Branch. Add your UPI ID and upload your official UPI QR code graphic for seamless mobile scan-to-pay.',
        actionSummary: 'Input Bank A/C & IFSC → Add UPI VPA → Upload QR Graphic',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        cursorTarget: 'Save Payment Details',
        highlightActionText: 'Direct mobile scan-to-pay and bank wire instructions',
      },
      {
        title: 'Sequential Invoicing & Proposal Presets',
        durationSec: 40,
        narration: 'Customize your invoice prefix (like INV-) and starting sequence number. Set default proposal validity (14 days) and required advance percentage (50%). Every new quotation will inherit these presets.',
        actionSummary: 'Set Prefix INV- → Starting Number 000001 → Save Presets',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        cursorTarget: 'Save All Settings',
        highlightActionText: 'Unbroken sequence guarantees 100% tax compliance',
      },
    ],
  },
  {
    id: 2,
    title: '2. Creating & Sending Quotations',
    category: 'Sales Proposals',
    duration: '4:15',
    durationSec: 255,
    description: 'Build an itemized sales proposal, configure customer details, add discounts and GST taxes, set advance requirements, and share the secure client link.',
    cta: 'Create a Quotation',
    ctaHref: '/quotations/new',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    steps: [
      {
        title: 'Start a New Quotation',
        durationSec: 40,
        narration: 'From your dashboard, click "+ Create Quotation". QuoteFlow generates a unique proposal reference (QT-2026-0042) and sets today\'s date with your organization branding.',
        actionSummary: 'Click "+ Create Quotation" → Initialize Proposal',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        cursorTarget: '+ Create Quotation',
        highlightActionText: 'Unique token reference generated automatically',
      },
      {
        title: 'Select or Add Customer with Mobile/Email',
        durationSec: 50,
        narration: 'Pick an existing customer or click "+ Add Customer". Enter their Company Name, Contact Person, Billing Email, and Mobile Phone number (+91). The mobile number is essential for client portal PIN authentication.',
        actionSummary: 'Select Customer → Enter Billing Email & Mobile Number',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        cursorTarget: 'Select Customer',
        highlightActionText: 'Mobile number (+91 98*** **340) used for portal PIN access',
      },
      {
        title: 'Add Deliverables & Tax Slabs',
        durationSec: 55,
        narration: 'Add deliverables with descriptions, quantities, unit prices, and tax slabs. QuoteFlow calculates row totals, 18% GST, and grand totals with accounting precision in real time.',
        actionSummary: 'Add Line Items → Set Quantities, Rates & Tax %',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        cursorTarget: '+ Add Line Item',
        highlightActionText: 'Subtotal ₹1,50,000 + 18% GST (₹27,000) = ₹1,77,000',
      },
      {
        title: 'Configure Advance Deposit (50%)',
        durationSec: 50,
        narration: 'Set the required advance deposit percentage, such as 50% upfront. QuoteFlow highlights the exact deposit amount (₹88,500) required to initiate work and sets proposal validity.',
        actionSummary: 'Set Required Advance: 50% (₹88,500.00)',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        cursorTarget: 'Set Advance %',
        highlightActionText: 'Deposit milestones build trust and speed up approvals',
      },
      {
        title: 'Send Quotation & Copy Client Link',
        durationSec: 60,
        narration: 'Click "Send Quotation". QuoteFlow sends an automated email and creates a unique web link: quoteflow.com/q/[token]. Click "Copy Client Link" to send it via WhatsApp, SMS, or Slack.',
        actionSummary: 'Click "Send Quotation" → Click "Copy Client Link"',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        cursorTarget: 'Copy Client Link',
        highlightActionText: 'Ready to share directly on WhatsApp or Email',
      },
    ],
  },
  {
    id: 3,
    title: '3. Invoicing & Recording Payments',
    category: 'Billing & Accounting',
    duration: '3:45',
    durationSec: 225,
    description: 'Convert approved quotes into commercial tax invoices with 1 click, maintain unbroken sequential numbering, record client payments, and issue verified receipts.',
    cta: 'View Invoices',
    ctaHref: '/invoices',
    icon: Receipt,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-100 dark:border-sky-900/50',
    steps: [
      {
        title: '1-Click Convert Quote to Invoice',
        durationSec: 45,
        narration: 'When a customer approves your proposal, open the quotation and click "Generate Invoice". All deliverables, client info, and tax rates transfer into an official commercial invoice.',
        actionSummary: 'Open Approved Quote → Click "Generate Invoice"',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        cursorTarget: 'Generate Invoice',
        highlightActionText: 'Zero duplicate entry — 1-click official invoice creation',
      },
      {
        title: 'Sequential Number (INV-000014) & Due Date',
        durationSec: 45,
        narration: 'Every invoice is assigned an immutable, unbroken sequential number like INV-000014 for tax compliance and audit safety. Set the Payment Due Date (e.g. Net 15 days).',
        actionSummary: 'Assign INV-000014 → Set Payment Due Date (Net 15)',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        cursorTarget: 'Save Invoice',
        highlightActionText: 'Unbroken sequence complies with legal accounting standards',
      },
      {
        title: 'Bank Remittance & UPI QR on Document',
        durationSec: 40,
        narration: 'Your registered Bank remittance details and UPI scan-to-pay QR code appear directly on both the digital invoice and the downloadable PDF.',
        actionSummary: 'Display Wire Remittance & UPI QR Code Graphic',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        cursorTarget: 'View Remittance',
        highlightActionText: 'Dual payment channels eliminate wire transfer friction',
      },
      {
        title: 'Record Advance or Full Payments',
        durationSec: 50,
        narration: 'When funds arrive, open the invoice and click "Record Payment". Enter the amount received (₹88,500), select the payment method (UPI), and record the bank transaction UTR.',
        actionSummary: 'Click "Record Payment" → Enter Amount & Bank UTR',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        cursorTarget: 'Record Payment',
        highlightActionText: 'Status updates to PARTIALLY PAID with balance tracked',
      },
      {
        title: 'Verified Receipts & Commercial Tax PDF',
        durationSec: 45,
        narration: 'QuoteFlow automatically generates a verified, numbered Payment Receipt PDF with company seal and transaction reference. Download the final Commercial Tax Invoice PDF for tax filing.',
        actionSummary: 'Download Verified Receipt PDF & Tax Invoice PDF',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        cursorTarget: 'Download Tax Invoice PDF',
        highlightActionText: 'Official audit-stamped PDFs ready for accounting',
      },
    ],
  },
  {
    id: 4,
    title: '4. Client Portal & PIN Security',
    category: 'Client Experience',
    duration: '4:30',
    durationSec: 270,
    description: 'Understand the client experience, 6-digit PIN creation, trusted device recognition, real-time interactive quote view, 1-click approvals, and customer live chat.',
    cta: 'View Quotations',
    ctaHref: '/quotations',
    icon: Globe,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-100 dark:border-purple-900/50',
    steps: [
      {
        title: 'Opening the Private Client Link',
        durationSec: 50,
        narration: 'When a customer opens the link on their mobile or computer, they arrive at the secure client portal. No account registration or app download is required.',
        actionSummary: 'Client opens https://www.blendandbold.com/q/[secure-token]',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        cursorTarget: 'Client Link',
        highlightActionText: '100% mobile responsive web portal with TLS 1.3 encryption',
      },
      {
        title: '6-Digit PIN Setup & Verification',
        durationSec: 55,
        narration: 'On first visit, the client enters their registered mobile number to verify their identity and creates a private 6-digit PIN. An Eye toggle lets them preview digits as they type.',
        actionSummary: 'Verify Mobile (+91 98*** **340) → Create 6-Digit PIN',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        cursorTarget: 'Save PIN & Access Portal',
        highlightActionText: 'Autofill protected against browser credential overwrite',
      },
      {
        title: 'Trusted Device Remembering (No PIN on Same Device)',
        durationSec: 55,
        narration: 'QuoteFlow recognizes trusted devices. Once a client enters their PIN on their phone or laptop, that browser is securely remembered for 1 year. They won\'t be asked for a PIN again on that device. New devices strictly require the 6-digit PIN.',
        actionSummary: '1-Year Device Token → Instant Access on Same Phone',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        cursorTarget: 'Trusted Device',
        highlightActionText: 'Remembered for 365 days; PIN required on new devices',
      },
      {
        title: 'Interactive Proposal & 1-Click Approval',
        durationSec: 55,
        narration: 'The client reviews your interactive proposal with line item descriptions, tax calculations, and payment schedule. With one tap, they can click "Approve Quotation" to digitally sign.',
        actionSummary: 'Client Reviews Breakdown → Clicks "Approve Quotation"',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        cursorTarget: 'Approve Quotation',
        highlightActionText: 'Digital signature timestamped & logged in real time',
      },
      {
        title: 'Live Chat & Payment Proof Attachment',
        durationSec: 55,
        narration: 'Clients can ask questions directly through embedded chat on the proposal. They can attach screenshots of bank wire transfers or UPI receipts, alerting your team in real time.',
        actionSummary: 'Client attaches UPI Screenshot in Chat → Staff Notified',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        cursorTarget: 'Send Message',
        highlightActionText: 'Centralizes client conversations and wire proofs',
      },
    ],
  },
  {
    id: 5,
    title: '5. Staff & Team Member Management',
    category: 'Team Collaboration',
    duration: '2:45',
    durationSec: 165,
    description: 'Invite team members by email, assign granular roles (Admin, Manager, Sales, Member), manage permissions, and track individual sales performance.',
    cta: 'Manage Team',
    ctaHref: '/settings',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    steps: [
      {
        title: 'Accessing Team Settings',
        durationSec: 35,
        narration: 'Go to Settings and select the "Team & Staff" tab. You will see a list of all current staff members, their assigned roles, and pending invitations.',
        actionSummary: 'Settings → Team & Staff → Member Directory',
        activeSidebarMenu: 'Settings',
        viewType: 'team',
        cursorTarget: '+ Invite Team Member',
        highlightActionText: 'Centralized directory for sales reps and accountants',
      },
      {
        title: 'Inviting a New Team Member by Email',
        durationSec: 40,
        narration: 'Click the "+ Invite Team Member" button. Enter their official company email address and select their designated role from the dropdown menu.',
        actionSummary: 'Enter Colleague Email → Assign Role (SALES) → Send',
        activeSidebarMenu: 'Settings',
        viewType: 'team',
        cursorTarget: 'Send Invitation Email',
        highlightActionText: 'Automated 1-click onboarding invitation email',
      },
      {
        title: 'Understanding Role Permissions Matrix',
        durationSec: 45,
        narration: 'QuoteFlow provides 4 built-in roles: ADMIN has full organizational control. MANAGER can manage quotes, invoices, and run reports. SALES can create and send proposals. MEMBER has view-only access.',
        actionSummary: 'Assign ADMIN, MANAGER, SALES, or MEMBER Roles',
        activeSidebarMenu: 'Settings',
        viewType: 'team',
        cursorTarget: 'Role Matrix',
        highlightActionText: 'Restricts sensitive banking and financial access',
      },
      {
        title: 'Tracking Sales Performance by Staff',
        durationSec: 45,
        narration: 'When a staff member creates a quotation, their name is linked as the author. In the Report Center, filter revenue and win rates by individual staff members to track commissions.',
        actionSummary: 'Reports → Filter by Staff Member → Review Closed Deals',
        activeSidebarMenu: 'Reports',
        viewType: 'team',
        cursorTarget: 'Export Staff Report',
        highlightActionText: 'Accurate attribution for sales commissions and quotas',
      },
    ],
  },
  {
    id: 6,
    title: '6. Generating & Exporting Reports',
    category: 'Analytics & Financials',
    duration: '3:15',
    durationSec: 195,
    description: 'Explore the dedicated Report Center, review Sales Summaries, track conversion rates, inspect customer balances, and export formatted Excel, CSV, and PDF files.',
    cta: 'Open Report Center',
    ctaHref: '/reports',
    icon: BarChart3,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    steps: [
      {
        title: 'Navigating the Executive Dashboard & Reports',
        durationSec: 40,
        narration: 'View high-level financial health on the Executive Dashboard, then click Reports in the sidebar for in-depth accounting breakdowns.',
        actionSummary: 'Executive Dashboard → Review Pipeline & Receivables',
        activeSidebarMenu: 'Dashboard',
        viewType: 'dashboard',
        cursorTarget: 'Executive Dashboard',
        highlightActionText: 'Total Pipeline $31,772.00 • Approved Revenue $30,742.00',
      },
      {
        title: 'Sales Summary & Cash Collection Rate',
        durationSec: 40,
        narration: 'The Sales Summary report aggregates your Total Invoiced Revenue, Cash Collected, Outstanding Receivables, and Average Deal Size with visual progress metrics.',
        actionSummary: 'Reports → Sales Summary → Cashflow Analysis',
        activeSidebarMenu: 'Reports',
        viewType: 'dashboard',
        cursorTarget: 'Sales Summary',
        highlightActionText: 'Real-time visibility into collection efficiency and cashflow',
      },
      {
        title: 'Quotation Funnel & Win Rates (78%)',
        durationSec: 35,
        narration: 'Under Quotations, inspect your Quote Conversion Funnel. See how many proposals are in Draft, Sent, Approved, Expired, or Rejected, along with your win rate percentage.',
        actionSummary: 'Reports → Quotes by Status → Conversion Funnel',
        activeSidebarMenu: 'Reports',
        viewType: 'dashboard',
        cursorTarget: 'Quotation Pipeline Trend',
        highlightActionText: 'Win rate benchmark: 50% to 78% deal closing efficiency',
      },
      {
        title: 'Customer Balances & GST Tax Breakdown',
        durationSec: 40,
        narration: 'Review Customer Balances to identify overdue accounts. The Tax Breakdown report itemizes taxable revenue, CGST, and SGST for effortless tax filing with your accountant.',
        actionSummary: 'Reports → Tax Breakdown → CGST & SGST Split',
        activeSidebarMenu: 'Reports',
        viewType: 'dashboard',
        cursorTarget: 'Tax Breakdown',
        highlightActionText: 'Itemized GST returns ready for CA reconciliation',
      },
      {
        title: '1-Click Export to Excel (.xlsx), CSV & PDF',
        durationSec: 40,
        narration: 'Export any report with a single click. Download formatted Excel spreadsheets with auto-sum formulas, CSV files for Tally or QuickBooks, or print-ready PDF summaries.',
        actionSummary: 'Click "Export to Excel (.xlsx)" → Instant Download',
        activeSidebarMenu: 'Reports',
        viewType: 'dashboard',
        cursorTarget: 'Export to Excel',
        highlightActionText: 'Formatted Excel spreadsheets with pre-calculated formulas',
      },
    ],
  },
];

export function TrainingView() {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [expandedAccordionId, setExpandedAccordionId] = useState<number | null>(1);

  const activeChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  const activeStep = activeChapter.steps[currentStepIndex] || activeChapter.steps[0];

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakCurrentNarration = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackSpeed;
      utterance.pitch = 1.0;
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeech();
      return;
    }

    speakCurrentNarration(activeStep.narration);

    const stepDurationMs = (activeStep.durationSec * 1000) / playbackSpeed;
    const intervalMs = 100;
    const increment = (intervalMs / stepDurationMs) * 100;

    timerRef.current = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          if (currentStepIndex < activeChapter.steps.length - 1) {
            setCurrentStepIndex((idx) => idx + 1);
            return 0;
          } else {
            setIsPlaying(false);
            stopSpeech();
            return 100;
          }
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, selectedChapterId, playbackSpeed, isMuted]);

  const handleSelectChapter = (chapterId: number) => {
    stopSpeech();
    setSelectedChapterId(chapterId);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setIsPlaying(false);
    setExpandedAccordionId(chapterId);
  };

  const handleNextStep = () => {
    stopSpeech();
    if (currentStepIndex < activeChapter.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setStepProgress(0);
    } else if (selectedChapterId < chapters.length) {
      handleSelectChapter(selectedChapterId + 1);
    }
  };

  const handlePrevStep = () => {
    stopSpeech();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setStepProgress(0);
    }
  };

  const handleTogglePlay = () => {
    if (stepProgress >= 100 && currentStepIndex === activeChapter.steps.length - 1) {
      setCurrentStepIndex(0);
      setStepProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    stopSpeech();
    setCurrentStepIndex(0);
    setStepProgress(0);
    setIsPlaying(true);
  };

  const handleCopyCurrentScript = () => {
    navigator.clipboard?.writeText(activeStep.narration);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const elapsedChapterSeconds = (() => {
    let sum = 0;
    for (let i = 0; i < currentStepIndex; i++) {
      sum += activeChapter.steps[i].durationSec;
    }
    sum += (activeStep.durationSec * stepProgress) / 100;
    return Math.min(Math.round(sum), activeChapter.durationSec);
  })();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                QuoteFlow Training Simulator
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Interactive
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive walkthroughs matching your live QuoteFlow dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={activeChapter.ctaHref}>
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-xs">
              <span>{activeChapter.cta}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Chapter Selection Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {chapters.map((ch) => {
          const isSelected = ch.id === selectedChapterId;
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChapter(ch.id)}
              className={`flex flex-col p-2.5 rounded-xl border text-left transition-all duration-150 transform hover:-translate-y-0.5 ${
                isSelected
                  ? 'bg-slate-900 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/20 dark:bg-slate-800'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : `${ch.bg} ${ch.color}`}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={`text-[9px] font-mono font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                  {ch.duration}
                </span>
              </div>
              <p className={`text-[11px] font-bold line-clamp-1 leading-snug ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                {ch.title}
              </p>
              <span className={`text-[8px] uppercase tracking-wider font-semibold mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                {ch.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Video Simulator Player (Small, Compact Size) */}
      <div className="rounded-2xl bg-slate-950 border border-slate-800 text-white shadow-xl overflow-hidden">
        {/* Compact Player Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              QuoteFlow Simulator • Chapter {activeChapter.id}/6: {activeChapter.title.split('.')[1]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {activeChapter.category}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {formatTime(elapsedChapterSeconds)} / {activeChapter.duration}
            </span>
          </div>
        </div>

        {/* Live Application Replica Canvas (Matches Original Dashboard Page Image from Site!) */}
        <div className="p-3 sm:p-4 bg-slate-900/60">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950 shadow-inner overflow-hidden text-xs">
            {/* Inner Dashboard Frame Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              {/* Search Bar matching live site */}
              <div className="flex items-center gap-2 flex-1 max-w-sm px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                <Search className="h-3 w-3 text-slate-400" />
                <span className="truncate">Search quotations, customers (e.g. Q-000002)...</span>
              </div>

              {/* Top Icons & User Avatar (EMAIL HIDDEN!) */}
              <div className="flex items-center gap-3 shrink-0">
                <Moon className="h-3.5 w-3.5 text-slate-400" />
                <div className="relative">
                  <Bell className="h-3.5 w-3.5 text-slate-400" />
                  <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                </div>
                {/* User profile with email hidden */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <div className="h-6 w-6 rounded-md bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                    SU
                  </div>
                  <div className="hidden sm:block text-left text-[10px] leading-tight">
                    <p className="font-bold text-slate-900 dark:text-slate-100">SUBESH</p>
                    <p className="text-slate-400 dark:text-slate-500 font-medium">Workspace Admin</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inner Dashboard Body: Mini Sidebar + Live Screen Mockup */}
            <div className="flex min-h-[250px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
              {/* Mini Left Sidebar (Matching Original Live Dashboard!) */}
              <div className="w-36 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 hidden sm:flex flex-col justify-between shrink-0 select-none text-[10px]">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 px-1 py-1 font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
                    <div className="h-4 w-4 rounded bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-[8px]">
                      AI
                    </div>
                    <span className="truncate">SUBESH M</span>
                  </div>

                  {[
                    { name: 'Dashboard', icon: BarChart3 },
                    { name: 'Quotations', icon: FileText },
                    { name: 'Invoices', icon: Receipt },
                    { name: 'Customers', icon: Users },
                    { name: 'Products & Services', icon: ShieldCheck },
                    { name: 'Reports', icon: TrendingUp },
                    { name: 'Training & Guides', icon: Video },
                    { name: 'Settings', icon: Building2 },
                  ].map((item) => {
                    const isActive = activeStep.activeSidebarMenu === item.name;
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.name}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ItemIcon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area based on ViewType */}
              <div className="flex-1 p-3.5 space-y-3 overflow-hidden">
                {/* Simulated Screen Content according to activeStep.viewType */}

                {/* VIEW 1: EXECUTIVE DASHBOARD (Matches original image 2!) */}
                {activeStep.viewType === 'dashboard' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">Executive Dashboard</h3>
                        <p className="text-[10px] text-slate-500">Overview of estimates, client reviews, approvals & invoices.</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 shadow-xs hover:scale-105 active:scale-95 transition-all">
                          <PlusCircle className="h-3 w-3 text-indigo-600" />
                          <span>+ Create Quotation</span>
                        </button>
                        <button className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs hover:scale-105 active:scale-95 transition-all">
                          <PlusCircle className="h-3 w-3 text-white" />
                          <span>+ Create Invoice</span>
                        </button>
                      </div>
                    </div>

                    {/* 4 Metric Cards from live site image! */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase">
                          <span>TOTAL PIPELINE</span>
                          <span className="h-4 w-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">↗</span>
                        </div>
                        <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5">$31,772.00</p>
                        <p className="text-[8px] text-slate-400">16 quotations generated</p>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-[9px] text-emerald-600 font-bold uppercase">
                          <span>APPROVED REVENUE</span>
                          <span className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">✓</span>
                        </div>
                        <p className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">$30,742.00</p>
                        <p className="text-[8px] text-slate-400">8 approved (50% win rate)</p>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-[9px] text-amber-500 font-bold uppercase">
                          <span>PENDING APPROVAL</span>
                          <span className="h-4 w-4 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">⏱</span>
                        </div>
                        <p className="font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400 mt-0.5">$420.00</p>
                        <p className="text-[8px] text-slate-400">2 awaiting decision</p>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                        <div className="flex items-center justify-between text-[9px] text-purple-600 font-bold uppercase">
                          <span>CLIENT VIEWS</span>
                          <span className="h-4 w-4 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">👁</span>
                        </div>
                        <p className="font-black text-xs sm:text-sm text-purple-600 dark:text-purple-400 mt-0.5">247</p>
                        <p className="text-[8px] text-slate-400">Real-time visits</p>
                      </div>
                    </div>

                    {/* Quotation Pipeline Trend Chart representation */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Quotation Pipeline Trend</p>
                        <p className="text-[8px] text-slate-400">Monthly quote volume vs. closed-won revenue</p>
                      </div>
                      <div className="flex items-end gap-1.5 h-8">
                        <div className="w-3 bg-indigo-500 rounded-t h-5"></div>
                        <div className="w-3 bg-emerald-500 rounded-t h-7"></div>
                        <div className="w-3 bg-indigo-500 rounded-t h-4"></div>
                        <div className="w-3 bg-emerald-500 rounded-t h-8"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VIEW 2: SETTINGS (Business Setup) */}
                {activeStep.viewType === 'settings' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs">Settings → Business Setup</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        Live System
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block">Company Legal Name</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">SUBESH M Workspace</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block">GSTIN / Tax ID</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">29ABCDE1234F1Z5</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block">Bank Account</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">HDFC Bank • A/C 5020008472</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block">UPI QR Scan-to-Pay</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Active (boldcraft@upi)</span>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-sm hover:scale-105 active:scale-95 transition-all">
                        Save Organization Profile →
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 3: QUOTATION BUILDER */}
                {activeStep.viewType === 'quotation' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs">New Quotation #QT-2026-0042</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                        Draft / Ready to Send
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[10px]">
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>Customer: <strong>Acme Digital Media Inc.</strong></span>
                        <span>Advance Required: <strong className="text-indigo-600">50% (₹88,500)</strong></span>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-1 text-[9px] text-slate-500 space-y-0.5">
                        <div className="flex justify-between"><span>1. Brand Identity Design (1 unit)</span><span>₹45,000</span></div>
                        <div className="flex justify-between"><span>2. Next.js Web Development (1 unit)</span><span>₹85,000</span></div>
                        <div className="flex justify-between"><span>3. Cloud Infrastructure CI/CD</span><span>₹20,000</span></div>
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>Total (incl. 18% GST):</span>
                        <span className="text-emerald-600 dark:text-emerald-400">₹1,77,000.00</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] hover:scale-105 active:scale-95 transition-all">
                        Copy Client Link
                      </button>
                      <button className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm hover:scale-105 active:scale-95 transition-all">
                        Send Quotation →
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 4: INVOICING & PAYMENTS */}
                {activeStep.viewType === 'invoice' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs">Commercial Invoice #INV-000014</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        PARTIALLY PAID
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block">Total Invoiced</span>
                        <span className="font-bold text-slate-900 dark:text-white">₹1,77,000.00</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 font-semibold block">Payment Recorded</span>
                        <span className="font-bold text-emerald-600">₹88,500.00 (UPI UTR Verified)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[10px]">
                      <span className="text-slate-500">Receipt #RCP-INV-000014-1 generated</span>
                      <button className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm hover:scale-105 active:scale-95 transition-all">
                        Download Tax Invoice PDF →
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 5: CLIENT PORTAL */}
                {activeStep.viewType === 'portal' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-indigo-600" />
                        <span>Client Portal • /q/sec_7d89</span>
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        Trusted Device Recognized
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[10px]">
                      <div className="flex justify-between">
                        <span>Proposal for: <strong>Acme Digital Media Inc.</strong></span>
                        <span className="text-emerald-600 font-bold">Advance 50%: ₹88,500</span>
                      </div>
                      <p className="text-[9px] text-slate-500">
                        No PIN prompt on same phone/PC (1-year device token). 6-digit PIN required on new devices.
                      </p>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-[10px] font-bold hover:scale-105 active:scale-95 transition-all">
                        Decline
                      </button>
                      <button className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm hover:scale-105 active:scale-95 transition-all animate-pulse">
                        Approve Quotation ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* VIEW 6: TEAM MANAGEMENT */}
                {activeStep.viewType === 'team' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs">Settings → Team & Staff</span>
                      <button className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[9px] hover:scale-105 active:scale-95 transition-all">
                        + Invite Staff
                      </button>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span>SUBESH (Workspace Owner)</span>
                        <span className="font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[8px]">ADMIN</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span>Rahul Verma (Sales Specialist)</span>
                        <span className="font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px]">SALES</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action summary badge & Highlight */}
                <div className="p-2 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <Sparkles className="h-3 w-3 shrink-0" />
                    <span className="font-semibold text-slate-300">{activeStep.highlightActionText}</span>
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 font-bold bg-slate-900/60 px-2 py-0.5 rounded">
                    Action: {activeStep.actionSummary}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Voiceover Teleprompter Box */}
          <div className="mt-2.5 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/50 backdrop-blur-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Volume2 className="h-3 w-3 text-indigo-400" />
                <span>Audio Voiceover Narration</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCurrentScript}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {copiedScript ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copiedScript ? 'Copied' : 'Copy Script'}</span>
              </button>
            </div>
            <p className="text-[11px] sm:text-xs text-indigo-100 italic leading-relaxed">
              &ldquo;{activeStep.narration}&rdquo;
            </p>
          </div>
        </div>

        {/* Video Scrubber & Playback Controls Bar with Button Animations */}
        <div className="bg-slate-900 px-4 py-3 border-t border-slate-800 space-y-2.5">
          {/* Step Timeline Progress Bar */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
              {activeChapter.steps.map((st, idx) => {
                const isPast = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      stopSpeech();
                      setCurrentStepIndex(idx);
                      setStepProgress(0);
                    }}
                    title={st.title}
                    className="flex-1 h-full bg-slate-800 relative overflow-hidden transition-all hover:opacity-80"
                  >
                    <div
                      className={`h-full transition-all duration-100 ${
                        isPast ? 'bg-indigo-500 w-full' : isCurrent ? 'bg-indigo-400' : 'w-0'
                      }`}
                      style={isCurrent ? { width: `${stepProgress}%` } : undefined}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              Step {currentStepIndex + 1}/{activeChapter.steps.length}
            </span>
          </div>

          {/* Animated Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0 && selectedChapterId === 1}
                className="text-slate-300 hover:text-white p-1.5 h-8 w-8 hover:-translate-x-0.5 transition-transform"
                title="Previous Step"
              >
                <Rewind className="h-3.5 w-3.5" />
              </Button>

              {/* Pulsating Animated Play/Pause Button */}
              <button
                type="button"
                onClick={handleTogglePlay}
                className={`h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:scale-105 active:scale-95 ${
                  isPlaying ? 'ring-2 ring-indigo-400/50' : 'ring-4 ring-indigo-500/20 animate-pulse'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextStep}
                disabled={currentStepIndex === activeChapter.steps.length - 1 && selectedChapterId === chapters.length}
                className="text-slate-300 hover:text-white p-1.5 h-8 w-8 hover:translate-x-0.5 transition-transform"
                title="Next Step"
              >
                <FastForward className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="text-slate-300 hover:text-white p-1.5 h-8 w-8 hover:rotate-180 transition-transform duration-300"
                title="Restart Chapter"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsMuted(!isMuted);
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isMuted ? 'text-red-400 bg-red-950/40' : 'text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Playback speed buttons */}
              <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 text-[10px]">
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                      playbackSpeed === speed
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Direct module action button with hover animation */}
              <Link href={activeChapter.ctaHref}>
                <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 shadow-sm hover:scale-105 active:scale-95 transition-all">
                  <span>{activeChapter.cta}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Course Curriculum & Written Guide */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <span>Complete Course Curriculum & Instructions</span>
          </h3>
          <span className="text-xs text-slate-500">
            6 Chapters • 22 min runtime
          </span>
        </div>

        <div className="space-y-2.5">
          {chapters.map((ch) => {
            const isExpanded = expandedAccordionId === ch.id;
            const Icon = ch.icon;
            const isCurrent = ch.id === selectedChapterId;

            return (
              <div
                key={ch.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isCurrent
                    ? 'border-indigo-500/60 dark:border-indigo-500/50 bg-white dark:bg-slate-900 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedAccordionId(isExpanded ? null : ch.id)}
                  className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <div className={`p-2 rounded-xl ${ch.bg} border ${ch.border} shrink-0`}>
                    <Icon className={`h-4 w-4 ${ch.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {ch.category}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">⏱️ {ch.duration}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          Active in Player
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                      {ch.title}
                    </h4>
                  </div>

                  <div className="shrink-0 p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-850/30 space-y-3">
                    <div className="space-y-2">
                      {ch.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {st.title}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-400">~{st.durationSec}s</span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                              {st.narration}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleSelectChapter(ch.id);
                          window.scrollTo({ top: 100, behavior: 'smooth' });
                        }}
                        className="gap-1.5 text-xs font-semibold h-7"
                      >
                        <Play className="h-3 w-3 text-indigo-600" />
                        <span>Play Chapter</span>
                      </Button>

                      <Link href={ch.ctaHref}>
                        <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7">
                          <span>{ch.cta}</span>
                          <ArrowRight className="h-3 w-3" />
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
