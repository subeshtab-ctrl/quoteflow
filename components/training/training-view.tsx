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
  Search,
  Bell,
  Moon,
  Lock,
  Smartphone,
  Monitor,
  Maximize2,
  Minimize2,
  CircleDot,
  Square,
  Landmark,
  QrCode,
  PenTool,
  Send,
  Download,
  Phone,
  Mail,
  MapPin,
  MousePointer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewType = 'settings' | 'customers' | 'quotation' | 'portal' | 'payment' | 'invoice';

interface VideoStep {
  title: string;
  durationSec: number;
  narration: string;
  actionSummary: string;
  cursorTarget?: string;
  cursorPos: { x: string; y: string };
  activeSidebarMenu: string;
  viewType: ViewType;
  subViewIndex: number;
  highlightActionText: string;
}

interface VideoChapter {
  id: number;
  title: string;
  shortTitle: string;
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
  accentGradient: string;
  steps: VideoStep[];
}

const chapters: VideoChapter[] = [
  {
    id: 1,
    title: '1. Setup Company & Bank Details',
    shortTitle: 'Company & Bank',
    category: 'Step 1 • Onboarding',
    duration: '0:45',
    durationSec: 45,
    description:
      'Set up your company legal name, brand logo, GST/VAT tax number, bank account details, and UPI QR code so every quote and invoice is branded automatically.',
    cta: 'Open Settings',
    ctaHref: '/settings',
    icon: Building2,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    accentGradient: 'from-indigo-600 via-violet-600 to-purple-600',
    steps: [
      {
        title: 'Company Profile, Logo & Tax ID (GSTIN / VAT)',
        durationSec: 8,
        narration:
          'First, open Settings and enter your Company Name, address, GST or VAT number, and upload your brand logo. QuoteFlow automatically styles your header across all documents.',
        actionSummary: 'Settings → Company Profile → Upload Logo & GSTIN',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        subViewIndex: 0,
        cursorTarget: 'Upload Logo & Save Profile',
        cursorPos: { x: '78%', y: '38%' },
        highlightActionText: 'Company Logo + 15-Digit GSTIN synced to all PDFs',
      },
      {
        title: 'Add Bank Account, IFSC & UPI QR Code',
        durationSec: 8,
        narration:
          'Next, add your Bank Name, Account Number, IFSC or IBAN code, and UPI ID. Your bank and scan-to-pay details appear automatically on every quotation and invoice.',
        actionSummary: 'Settings → Bank & Remittance → Save Bank & UPI Details',
        activeSidebarMenu: 'Settings',
        viewType: 'settings',
        subViewIndex: 1,
        cursorTarget: 'Save Bank & UPI Settings',
        cursorPos: { x: '82%', y: '78%' },
        highlightActionText: 'Bank Wire + UPI Scan-to-Pay enabled for clients',
      },
    ],
  },
  {
    id: 2,
    title: '2. Add Customers & Contacts',
    shortTitle: 'Add Customers',
    category: 'Step 2 • CRM Directory',
    duration: '0:40',
    durationSec: 40,
    description:
      'Add your clients with their company name, billing address, GSTIN, email, and WhatsApp mobile number for instant quote sharing and PIN verification.',
    cta: 'Open Customers',
    ctaHref: '/customers',
    icon: Users,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    accentGradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    steps: [
      {
        title: 'Click "+ Add Customer" & Enter Client Details',
        durationSec: 8,
        narration:
          'Go to Customers and click Add Customer. Enter your client’s Company Name, contact person, WhatsApp mobile number, email, billing state, and customer GSTIN.',
        actionSummary: 'Customers → + Add Customer → Enter Mobile & GSTIN',
        activeSidebarMenu: 'Customers',
        viewType: 'customers',
        subViewIndex: 0,
        cursorTarget: 'Save Customer Profile',
        cursorPos: { x: '80%', y: '76%' },
        highlightActionText: 'Client mobile number enables WhatsApp sharing & Portal PIN',
      },
      {
        title: 'Customer Saved & Ready for 1-Click Quoting',
        durationSec: 7,
        narration:
          'Your customer is now saved in your CRM directory. You can track all their quotations, invoices, and payment balances in one place.',
        actionSummary: 'Customers Directory → Select Client for New Quote',
        activeSidebarMenu: 'Customers',
        viewType: 'customers',
        subViewIndex: 1,
        cursorTarget: '+ Create Quote for Client',
        cursorPos: { x: '84%', y: '45%' },
        highlightActionText: 'Zero re-typing on future quotations and invoices',
      },
    ],
  },
  {
    id: 3,
    title: '3. Make & Send Quotation',
    shortTitle: 'Make Quotation',
    category: 'Step 3 • Estimates',
    duration: '0:55',
    durationSec: 55,
    description:
      'Create a professional itemized quotation with HSN/SAC codes, automatic GST/VAT calculation, discount, and 50% advance payment terms in under 60 seconds.',
    cta: 'Create Quotation',
    ctaHref: '/quotations/new',
    icon: FileText,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-100 dark:border-violet-900/50',
    accentGradient: 'from-violet-600 via-indigo-600 to-blue-600',
    steps: [
      {
        title: 'Select Customer & Add Line Items with Tax',
        durationSec: 8,
        narration:
          'Click Create Quotation, select your customer, and add your products or services. QuoteFlow automatically calculates item totals, CGST, SGST, or IGST in real time.',
        actionSummary: 'Quotations → New → Add Line Items & 18% GST',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        subViewIndex: 0,
        cursorTarget: '+ Add Line Item',
        cursorPos: { x: '75%', y: '56%' },
        highlightActionText: 'Auto-calculates Subtotal ₹1,50,000 + 18% GST = ₹1,77,000',
      },
      {
        title: 'Send Quotation & Share Client Portal Link on WhatsApp',
        durationSec: 8,
        narration:
          'Set your required advance percentage and click Send Quotation. Copy the interactive Client Portal link or share it directly to your customer on WhatsApp in one click.',
        actionSummary: 'Set 50% Advance → Send Quotation → Share on WhatsApp',
        activeSidebarMenu: 'Quotations',
        viewType: 'quotation',
        subViewIndex: 1,
        cursorTarget: 'Share on WhatsApp',
        cursorPos: { x: '83%', y: '80%' },
        highlightActionText: 'Interactive link: blendandbold.com/q/[token]',
      },
    ],
  },
  {
    id: 4,
    title: '4. Client Portal & E-Signature',
    shortTitle: 'Client Portal',
    category: 'Step 4 • Client Approval',
    duration: '0:50',
    durationSec: 50,
    description:
      'See what your customer experiences when they open your link: mobile-friendly breakdown, bank details, live chat, digital e-signature, and 1-click approval.',
    cta: 'View Quotations',
    ctaHref: '/quotations',
    icon: Globe,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-100 dark:border-purple-900/50',
    accentGradient: 'from-purple-600 via-fuchsia-600 to-pink-600',
    steps: [
      {
        title: 'Customer Opens Interactive Portal Link on Phone or PC',
        durationSec: 8,
        narration:
          'When your customer taps the link on WhatsApp or email, they open a clean, branded Client Portal. They can review line items, tax breakdown, and your bank details.',
        actionSummary: 'Client Opens Portal → Reviews Items & Bank Details',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        subViewIndex: 0,
        cursorTarget: 'Proceed to Sign & Approve',
        cursorPos: { x: '78%', y: '75%' },
        highlightActionText: 'No app install needed — works on any mobile browser',
      },
      {
        title: 'Digital E-Signature & 1-Click Quotation Approval',
        durationSec: 8,
        narration:
          'With one tap, the customer signs on their screen and clicks Approve Quotation. You receive an instant notification and the quotation status flips to Approved.',
        actionSummary: 'Client Draws E-Signature → Clicks "Approve Quotation"',
        activeSidebarMenu: 'Quotations',
        viewType: 'portal',
        subViewIndex: 1,
        cursorTarget: 'Approve & Submit Signature',
        cursorPos: { x: '80%', y: '82%' },
        highlightActionText: 'Legally timestamped digital signature saved to PDF',
      },
    ],
  },
  {
    id: 5,
    title: '5. Record Payments & Receipts',
    shortTitle: 'Add Payments',
    category: 'Step 5 • Collections',
    duration: '0:45',
    durationSec: 45,
    description:
      'Record 50% advance deposits or full settlements with bank UTR / UPI transaction references and download official Payment Receipt PDFs.',
    cta: 'Manage Payments',
    ctaHref: '/quotations',
    icon: CreditCard,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    accentGradient: 'from-amber-500 via-orange-500 to-rose-500',
    steps: [
      {
        title: 'Record Advance or Full Payment with Bank UTR / UPI Ref',
        durationSec: 8,
        narration:
          'When the customer pays the advance or full amount via UPI or Bank Transfer, click Record Payment. Select 50% Advance or Paid in Full and enter the transaction UTR reference.',
        actionSummary: 'Click "Payment" → Select 50% Advance / Full → Save UTR',
        activeSidebarMenu: 'Quotations',
        viewType: 'payment',
        subViewIndex: 0,
        cursorTarget: 'Confirm & Save Payment',
        cursorPos: { x: '81%', y: '79%' },
        highlightActionText: 'Tracks Paid ₹88,500 & Remaining Balance ₹88,500 automatically',
      },
      {
        title: 'Instant Payment Receipt PDF Generated',
        durationSec: 7,
        narration:
          'QuoteFlow immediately generates a numbered Payment Receipt PDF showing the amount received, payment mode, UTR reference, and remaining balance due.',
        actionSummary: 'Payment Confirmed → Download Payment Receipt PDF',
        activeSidebarMenu: 'Quotations',
        viewType: 'payment',
        subViewIndex: 1,
        cursorTarget: 'Download Receipt PDF',
        cursorPos: { x: '78%', y: '74%' },
        highlightActionText: 'Official Receipt #RCPT-0042 ready to share with client',
      },
    ],
  },
  {
    id: 6,
    title: '6. Draft & Issue Tax Invoice',
    shortTitle: 'Issue Invoice',
    category: 'Step 6 • Tax Invoicing',
    duration: '0:50',
    durationSec: 50,
    description:
      'Create a Draft Invoice with a DRAFT watermark for review, then click "Issue Invoice" to move it to your official Invoices list and download the final Tax Invoice PDF.',
    cta: 'Open Invoices',
    ctaHref: '/invoices',
    icon: Receipt,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-100 dark:border-sky-900/50',
    accentGradient: 'from-sky-600 via-blue-600 to-indigo-600',
    steps: [
      {
        title: 'Save as Draft Invoice (with DRAFT Watermark) or Delete Draft',
        durationSec: 8,
        narration:
          'You can save any invoice as a Draft first. Draft invoices stay in the Drafts tab, display a diagonal DRAFT watermark when printed or downloaded, and can be deleted anytime.',
        actionSummary: 'Invoices → Drafts Tab → Preview DRAFT Watermark or Issue',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        subViewIndex: 0,
        cursorTarget: 'Issue Invoice',
        cursorPos: { x: '75%', y: '34%' },
        highlightActionText: 'Drafts include a DRAFT watermark until officially issued',
      },
      {
        title: 'Click "Issue Invoice" → Moves to Official Invoices & Download PDF',
        durationSec: 8,
        narration:
          'Click Issue Invoice on the draft. The DRAFT watermark is removed, the invoice moves into your official Invoices list, and you can print or download the final Tax Invoice PDF.',
        actionSummary: 'Click "Issue Invoice" → Moved to Invoices → Download PDF',
        activeSidebarMenu: 'Invoices',
        viewType: 'invoice',
        subViewIndex: 1,
        cursorTarget: 'Download PDF',
        cursorPos: { x: '84%', y: '28%' },
        highlightActionText: 'Official Tax Invoice #INV-000014 issued & ready for GST filing',
      },
    ],
  },
];

export function TrainingView() {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [autoPlayAll, setAutoPlayAll] = useState<boolean>(true);
  const [showTransitionCard, setShowTransitionCard] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [expandedAccordionId, setExpandedAccordionId] = useState<number | null>(1);
  const [userClickedSuccess, setUserClickedSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'simulator' | 'video'>('simulator');

  const proTips: Record<number, string> = {
    1: 'Adding your bank IFSC and UPI QR code ensures clients can pay advances directly from their phones without manual account copying.',
    2: 'Saving customer profiles stores their State Code and GSTIN, enabling QuoteFlow to automatically determine Intra-State (CGST+SGST) vs Inter-State (IGST) tax.',
    3: 'Setting a 50% advance automatically creates a clean milestone payment schedule on both the quotation and the final invoice.',
    4: 'Clients can draw their signature with a finger or stylus on WhatsApp and approve in under 30 seconds—no app download or account signup required.',
    5: 'Recording an advance payment automatically recalculates balance due and issues an official payment receipt with bank UTR reference.',
    6: 'Draft invoices can be reviewed, printed with a DRAFT watermark, or deleted safely without affecting your official GST sequential numbering.',
  };

  const activeChapter = chapters.find((c) => c.id === selectedChapterId) || chapters[0];
  const activeStep = activeChapter.steps[currentStepIndex] || activeChapter.steps[0];

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    const intervalMs = 80;
    const increment = (intervalMs / stepDurationMs) * 100;

    timerRef.current = setInterval(() => {
      setStepProgress((prev) => {
        if (prev >= 100) {
          if (currentStepIndex < activeChapter.steps.length - 1) {
            setCurrentStepIndex((idx) => idx + 1);
            return 0;
          } else if (autoPlayAll && selectedChapterId < chapters.length) {
            // Smooth transition card between chapters
            setShowTransitionCard(true);
            setTimeout(() => {
              setShowTransitionCard(false);
            }, 1100);
            setSelectedChapterId((cid) => cid + 1);
            setCurrentStepIndex(0);
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
  }, [isPlaying, currentStepIndex, selectedChapterId, playbackSpeed, isMuted, autoPlayAll]);

  const handleSelectChapter = (chapterId: number) => {
    stopSpeech();
    setShowTransitionCard(true);
    setTimeout(() => setShowTransitionCard(false), 650);
    setSelectedChapterId(chapterId);
    setCurrentStepIndex(0);
    setStepProgress(0);
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
    } else if (selectedChapterId > 1) {
      const prevChapter = chapters.find((c) => c.id === selectedChapterId - 1);
      setSelectedChapterId(selectedChapterId - 1);
      setCurrentStepIndex(prevChapter ? prevChapter.steps.length - 1 : 0);
      setStepProgress(0);
    }
  };

  const handleUserActionClick = (actionName: string) => {
    stopSpeech();
    setUserClickedSuccess(actionName);
    setTimeout(() => {
      setUserClickedSuccess(null);
      handleNextStep();
    }, 550);
  };

  const handleTogglePlay = () => {
    if (
      stepProgress >= 100 &&
      currentStepIndex === activeChapter.steps.length - 1 &&
      selectedChapterId === chapters.length
    ) {
      setSelectedChapterId(1);
      setCurrentStepIndex(0);
      setStepProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePlayAllFromStart = () => {
    stopSpeech();
    setAutoPlayAll(true);
    setSelectedChapterId(1);
    setCurrentStepIndex(0);
    setStepProgress(0);
    setShowTransitionCard(true);
    setTimeout(() => setShowTransitionCard(false), 900);
    setIsPlaying(true);
  };

  const handleCopyFullVideoScript = () => {
    const fullScript = chapters
      .map(
        (ch) =>
          `=== ${ch.title.toUpperCase()} ===\n` +
          ch.steps.map((s, i) => `[Scene ${ch.id}.${i + 1} - ${s.title}]\n"${s.narration}"`).join('\n\n')
      )
      .join('\n\n');
    navigator.clipboard?.writeText(fullScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const ActiveChapterIcon = activeChapter.icon;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                QuoteFlow Interactive Training
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
          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('simulator')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'simulator'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🎮 Simulator
            </button>
            <button
              type="button"
              onClick={() => setViewMode('video')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'video'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🎬 Video Package
            </button>
          </div>

          <Link href={activeChapter.ctaHref}>
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-xs"
            >
              <span>{activeChapter.cta}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Scene Selection Pills with Checkmarks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {chapters.map((ch) => {
          const isSelected = ch.id === selectedChapterId;
          const isCompleted = ch.id < selectedChapterId;
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => handleSelectChapter(ch.id)}
              className={`flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-slate-900 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30 dark:bg-slate-800'
                  : isCompleted
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div
                  className={`p-1.5 rounded-lg ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : `${ch.bg} ${ch.color}`
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1">
                  {isCompleted && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      ✓
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      isSelected ? 'text-indigo-300' : isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    Scene {ch.id}/6
                  </span>
                </div>
              </div>
              <p
                className={`text-[11px] font-bold line-clamp-1 leading-snug ${
                  isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {ch.shortTitle}
              </p>
              <span
                className={`text-[8px] uppercase tracking-wider font-semibold mt-0.5 ${
                  isSelected ? 'text-slate-300' : isCompleted ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-400'
                }`}
              >
                {isCompleted ? '✓ Completed' : ch.category}
              </span>
            </button>
          );
        })}
      </div>

      {viewMode === 'video' ? (
        <div className="w-full max-w-5xl mx-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80">
                Full Video Course • 6 Modules (5 mins total)
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                QuoteFlow Complete Masterclass
              </h2>
              <p className="text-xs text-slate-400 max-w-lg">
                Step-by-step HD tutorial videos showing how to onboard, make AI quotes, collect WhatsApp digital signatures, and file GST invoices.
              </p>
            </div>
            <a
              href="/QuoteFlow-Tutorial-Videos.zip"
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-102"
            >
              <Download className="h-4 w-4" />
              <span>Download Video Package (ZIP)</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chapters.map((ch) => {
              const Icon = ch.icon;
              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    handleSelectChapter(ch.id);
                    setViewMode('simulator');
                    setIsPlaying(true);
                  }}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500 transition-all group cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      {ch.duration}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Module {ch.id}: {ch.shortTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>
                  <div className="pt-1 flex items-center text-[10px] font-bold text-emerald-400 gap-1">
                    <Play className="h-3 w-3 fill-emerald-400" />
                    <span>Watch Interactive Walkthrough →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MAIN ANIMATED VIDEO CANVAS */
        <div className="w-full max-w-5xl mx-auto rounded-2xl bg-slate-950 border border-slate-800 text-white shadow-2xl overflow-hidden transition-all">
        {/* Top Window Chrome Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500/90" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/90" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
            </div>
            <span className="font-mono text-[11px] text-slate-300 font-semibold truncate">
              blendandbold.com • Scene {activeChapter.id}/6: {activeChapter.shortTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {activeStep.activeSidebarMenu}
            </span>
          </div>
        </div>

        {/* Animated Stage Area */}
        <div className="relative p-3 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 overflow-hidden">
          {/* Smooth Scene Transition Overlay Card */}
          {showTransitionCard && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 text-center p-6">
              <div
                className={`h-14 w-14 rounded-2xl bg-gradient-to-tr ${activeChapter.accentGradient} flex items-center justify-center text-white shadow-xl mb-3 animate-bounce`}
              >
                <ActiveChapterIcon className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {activeChapter.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {activeChapter.title}
              </h2>
              <p className="text-xs text-slate-400 max-w-md mt-1.5">{activeChapter.description}</p>
            </div>
          )}

          {/* User Click Action Success Feedback */}
          {userClickedSuccess && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2.5 border border-emerald-400 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="h-5 w-5 text-white animate-bounce" />
              <span>✓ {userClickedSuccess} • Advancing to Next Step →</span>
            </div>
          )}

          {/* Big Center Play Button Overlay when Paused */}
          {!isPlaying && !showTransitionCard && !userClickedSuccess && (
            <div
              onClick={handleTogglePlay}
              className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-slate-950/65 backdrop-blur-[2.5px] transition-all cursor-pointer group hover:bg-slate-950/50"
            >
              <div className="flex flex-col items-center gap-3 p-5 sm:p-7 rounded-3xl bg-slate-900/95 border border-slate-700/80 shadow-2xl text-center max-w-xs sm:max-w-md transform group-hover:scale-105 transition-all">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 ring-4 ring-white/10 group-hover:ring-white/30 animate-pulse">
                  <Play className="h-8 w-8 sm:h-10 sm:w-10 ml-1 fill-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Click to Play Interactive Walkthrough
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium mt-1">
                    Scene {activeChapter.id}/6: {activeChapter.title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800/90 px-3.5 py-1.5 rounded-full border border-slate-700">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Hands-on: You can also click the glowing buttons directly!</span>
                </div>
              </div>
            </div>
          )}

          {/* Animated Cursor Overlay */}
          <div
            className="pointer-events-none absolute z-20 transition-all duration-700 ease-in-out"
            style={{
              left: activeStep.cursorPos.x,
              top: activeStep.cursorPos.y,
            }}
          >
            <div className="relative flex items-center">
              <span className="absolute -inset-2 rounded-full bg-indigo-500/30 animate-ping" />
              <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                <MousePointer className="h-3.5 w-3.5 fill-white" />
              </div>
              {activeStep.cursorTarget && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-slate-900/95 text-white border border-indigo-400/50 text-[10px] font-bold whitespace-nowrap shadow-xl">
                  {activeStep.cursorTarget}
                </span>
              )}
            </div>
          </div>

          {/* Inner App Replica Window */}
          <div
            key={`${activeChapter.id}-${currentStepIndex}`}
            className="rounded-xl border border-slate-700/80 bg-slate-950 shadow-2xl overflow-hidden text-xs transition-all duration-500 animate-in fade-in slide-in-from-bottom-2"
          >
            {/* App Top Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
              <div className="flex items-center gap-2 flex-1 max-w-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                <Search className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">Search quotes, invoices, customers...</span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                  LIVE MODE
                </span>
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    QF
                  </div>
                  <div className="hidden sm:block text-left text-[10px] leading-tight">
                    <p className="font-bold text-slate-900 dark:text-slate-100">QuoteFlow Pro</p>
                  </div>
                </div>
              </div>
            </div>

            {/* App Body: Sidebar + Dynamic Animated Scene */}
            <div className="flex min-h-[300px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
              {/* Left Sidebar */}
              <div className="w-40 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hidden sm:flex flex-col justify-between shrink-0 select-none text-[10px]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-1.5 py-1.5 font-black text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-1.5">
                    <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-[9px]">
                      QF
                    </div>
                    <span className="truncate">Blend & Bold</span>
                  </div>

                  {[
                    { name: 'Dashboard', icon: TrendingUp },
                    { name: 'Quotations', icon: FileText },
                    { name: 'Invoices', icon: Receipt },
                    { name: 'Customers', icon: Users },
                    { name: 'Settings', icon: Building2 },
                  ].map((item) => {
                    const isActive = activeStep.activeSidebarMenu === item.name;
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.name}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-xs scale-[1.02]'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <ItemIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 text-[9px] text-indigo-800 dark:text-indigo-200">
                  <p className="font-bold">blendandbold.com</p>
                  <p className="text-[8px] opacity-80">24/7 Cloud Active</p>
                </div>
              </div>

              {/* SCENE CONTENT AREA */}
              <div className="flex-1 p-3.5 sm:p-4 space-y-3 overflow-hidden">
                {/* SCENE 1: COMPANY SETUP & BANK DETAILS */}
                {activeStep.viewType === 'settings' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <span className="font-black text-xs sm:text-sm">
                          {activeStep.subViewIndex === 0
                            ? 'Step 1A: Company Profile, Logo & GSTIN'
                            : 'Step 1B: Bank Account, IFSC & UPI QR Code'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                        Organization Settings
                      </span>
                    </div>

                    {activeStep.subViewIndex === 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px]">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center text-center space-y-1.5 shadow-xs">
                          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-sm flex items-center justify-center ring-4 ring-indigo-500/20">
                            BB
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            Circular Brand Logo
                          </span>
                          <span className="text-[9px] text-emerald-600 font-semibold">
                            ✓ Uploaded (300 DPI)
                          </span>
                        </div>

                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[9px] block">Company Legal Name</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              Blend & Bold Studio Pvt. Ltd.
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-indigo-400/60 dark:border-indigo-600 ring-2 ring-indigo-500/10">
                            <span className="text-slate-400 text-[9px] block">GSTIN / VAT Tax Number</span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              29AABCB1234F1Z5
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[9px] block">Registered Address</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              MG Road, Bengaluru, Karnataka
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[9px] block">Default Currency & Tax</span>
                            <span className="font-bold text-emerald-600">
                              INR (₹) • 18% GST (CGST + SGST)
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px]">
                        <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[9px] flex items-center gap-1">
                              <Landmark className="h-3 w-3 text-indigo-500" /> Bank Name
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              HDFC Bank Ltd.
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[9px] block">Account Number</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              50200084912340
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <span className="text-slate-400 text-[9px] block">IFSC / SWIFT Code</span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              HDFC0001204
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-400/60">
                            <span className="text-slate-400 text-[9px] block">Official UPI ID</span>
                            <span className="font-mono font-bold text-emerald-600">
                              blendandbold@hdfcbank
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center text-center space-y-1">
                          <QrCode className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[10px]">
                            Scan-to-Pay QR Active
                          </span>
                          <span className="text-[8px] text-emerald-700 dark:text-emerald-400">
                            Shown on Client Portal & Invoices
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleUserActionClick('Organization & Bank Settings Saved')}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-md inline-flex items-center gap-1.5 cursor-pointer ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Save Organization & Bank Settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SCENE 2: ADD CUSTOMERS */}
                {activeStep.viewType === 'customers' && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-600" />
                        <span className="font-black text-xs sm:text-sm">
                          {activeStep.subViewIndex === 0
                            ? 'Step 2A: Add New Customer Profile'
                            : 'Step 2B: Customer Directory & Quick Quote'}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px]">
                        + Add Customer
                      </span>
                    </div>

                    {activeStep.subViewIndex === 0 ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-sm space-y-2.5 text-[10px]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-400 text-[9px] block">Customer / Company Name</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              Apex Interior & Architecture Ltd.
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-emerald-400/60">
                            <span className="text-slate-400 text-[9px] flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5 text-emerald-600" /> WhatsApp Mobile Number
                            </span>
                            <span className="font-mono font-bold text-emerald-600">
                              +91 98765 43210
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-400 text-[9px] flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5 text-indigo-500" /> Billing Email
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              accounts@apexinteriors.in
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                            <span className="text-slate-400 text-[9px] flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-amber-500" /> State & Customer GSTIN
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              Karnataka • 29AAACA9988K1Z2
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleUserActionClick('Customer Profile Saved')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs cursor-pointer ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                          >
                            Save Customer Profile ✓
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-[10px]">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500/60 flex items-center justify-between shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center">
                              AI
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                Apex Interior & Architecture Ltd.
                              </p>
                              <p className="text-[9px] text-slate-500">
                                +91 98765 43210 • GSTIN: 29AAACA9988K1Z2
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUserActionClick('New Quotation Initiated')}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] cursor-pointer ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                          >
                            + Create Quote →
                          </button>
                        </div>
                        <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between opacity-75">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              Skyline Events & Hospitality
                            </p>
                            <p className="text-[9px] text-slate-400">+91 98450 11223 • Bengaluru</p>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600">2 Quotes Approved</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SCENE 3: CREATE & SEND QUOTATION */}
                {activeStep.viewType === 'quotation' && (
                  <div className="space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-violet-600" />
                        <span className="font-black text-xs sm:text-sm">
                          Quotation #Q-000042 • Apex Interior Ltd.
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 font-bold">
                        {activeStep.subViewIndex === 0 ? 'Building Line Items' : 'Ready to Share'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-[10px]">
                      <div className="grid grid-cols-12 font-bold text-[9px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                        <span className="col-span-6">DESCRIPTION / SAC CODE</span>
                        <span className="col-span-2 text-right">QTY</span>
                        <span className="col-span-2 text-right">TAX</span>
                        <span className="col-span-2 text-right">TOTAL</span>
                      </div>
                      <div className="grid grid-cols-12 items-center text-[10px]">
                        <span className="col-span-6 font-bold text-slate-900 dark:text-white">
                          1. 3D Interior Design & Modular Setup
                        </span>
                        <span className="col-span-2 text-right">1 job</span>
                        <span className="col-span-2 text-right text-slate-500">18% GST</span>
                        <span className="col-span-2 text-right font-bold">₹1,00,000</span>
                      </div>
                      <div className="grid grid-cols-12 items-center text-[10px]">
                        <span className="col-span-6 font-bold text-slate-900 dark:text-white">
                          2. Smart Lighting & False Ceiling
                        </span>
                        <span className="col-span-2 text-right">1 lot</span>
                        <span className="col-span-2 text-right text-slate-500">18% GST</span>
                        <span className="col-span-2 text-right font-bold">₹50,000</span>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[9px] text-slate-500">
                          <span>Subtotal: ₹1,50,000</span> • <span>CGST 9%: ₹13,500</span> •{' '}
                          <span>SGST 9%: ₹13,500</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 mr-1.5">Grand Total:</span>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            ₹1,77,000.00
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        ⚡ 50% Advance Required: ₹88,500
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUserActionClick('Portal Link Copied')}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Copy Portal Link
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserActionClick('Quotation Shared on WhatsApp')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm inline-flex items-center gap-1 cursor-pointer ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                        >
                          <Send className="h-3 w-3" />
                          <span>Share on WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 4: CLIENT PORTAL & E-SIGNATURE */}
                {activeStep.viewType === 'portal' && (
                  <div className="space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Customer Portal • blendandbold.com/q/Q-000042</span>
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        {activeStep.subViewIndex === 0 ? 'Client Viewing Live' : 'Approved & Signed ✓'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[10px]">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Apex Interior Ltd.
                          </span>
                          <span className="font-black text-indigo-600">₹1,77,000</span>
                        </div>
                        <p className="text-[9px] text-slate-500">
                          Bank: HDFC Bank • A/C 50200084912340 • UPI: blendandbold@hdfcbank
                        </p>
                        <div className="p-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-[9px] text-indigo-800 dark:text-indigo-200">
                          💬 Client Chat: &ldquo;Looks great! Signing & sending 50% advance now.&rdquo;
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500/60 flex flex-col justify-between space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                            <PenTool className="h-3 w-3 text-indigo-600" /> Digital E-Signature Pad
                          </span>
                          <span className="text-emerald-600 font-bold">Verified</span>
                        </div>
                        <div className="h-11 rounded-lg bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                          <span className="font-serif italic text-base text-indigo-600 dark:text-indigo-400 tracking-widest">
                            Rohan Sharma
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUserActionClick('Quotation Approved & Signed')}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center text-[10px] shadow-xs block cursor-pointer ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-102 active:scale-98"
                        >
                          ✓ Approve Quotation & Sign
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SCENE 5: RECORD PAYMENTS & RECEIPTS */}
                {activeStep.viewType === 'payment' && (
                  <div className="space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                        <span>Record Payment & Generate Official Receipt</span>
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        50% Advance Settled
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 text-[9px] block">Total Quote Value</span>
                        <span className="font-black text-xs text-slate-900 dark:text-white">
                          ₹1,77,000.00
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                        <span className="text-emerald-700 dark:text-emerald-300 text-[9px] font-bold block">
                          Advance Paid (50%)
                        </span>
                        <span className="font-black text-xs text-emerald-600">₹88,500.00</span>
                        <span className="text-[8px] font-mono text-emerald-700 dark:text-emerald-400 block">
                          UTR: HDFC26101399481
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
                        <span className="text-amber-700 dark:text-amber-300 text-[9px] font-bold block">
                          Balance Remaining
                        </span>
                        <span className="font-black text-xs text-amber-600">₹88,500.00</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500">
                        Payment Mode: <strong>UPI / Bank Wire</strong> • Receipt #RCPT-000042
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUserActionClick('Payment Receipt PDF Downloaded')}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-xs inline-flex items-center gap-1 cursor-pointer ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download Payment Receipt PDF</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SCENE 6: DRAFT INVOICE WATERMARK -> ISSUE OFFICIAL TAX INVOICE */}
                {activeStep.viewType === 'invoice' && (
                  <div className="space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-sky-600" />
                        <span className="font-black text-xs">
                          {activeStep.subViewIndex === 0
                            ? 'Draft Invoice #INV-000014 (In Drafts Tab)'
                            : 'Official Tax Invoice #INV-000014 (Moved to Invoices)'}
                        </span>
                      </div>
                      {activeStep.subViewIndex === 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px]">
                            DRAFT
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUserActionClick('Official Tax Invoice Issued')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs inline-flex items-center gap-1 animate-pulse cursor-pointer ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Issue Invoice</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px]">
                            ISSUED / PAID
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUserActionClick('Tax Invoice PDF Downloaded')}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-xs inline-flex items-center gap-1 cursor-pointer ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-105 active:scale-95"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Invoice Sheet Preview with / without DRAFT watermark */}
                    <div className="relative p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden text-[10px] space-y-1.5">
                      {activeStep.subViewIndex === 0 && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl font-black uppercase tracking-[0.35em] text-slate-300/60 dark:text-slate-700/50 -rotate-12 select-none border-2 border-slate-300/50 px-4 py-1 rounded-xl">
                            DRAFT
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center relative z-10">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">
                            {activeStep.subViewIndex === 0 ? 'DRAFT INVOICE' : 'TAX INVOICE'} • #INV-000014
                          </p>
                          <p className="text-[9px] text-slate-500">
                            Billed to: Apex Interior & Architecture Ltd. (GSTIN: 29AAACA9988K1Z2)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xs text-indigo-600 dark:text-indigo-400">
                            ₹1,77,000.00
                          </p>
                          <p className="text-[8px] text-emerald-600 font-bold">
                            {activeStep.subViewIndex === 0
                              ? 'Print & PDF include DRAFT watermark'
                              : '✓ Official Tax Invoice Ready'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Highlight Bar */}
                <div className="p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <span className="font-bold text-white">{activeStep.highlightActionText}</span>
                  </div>
                  <span className="font-mono text-[9px] text-indigo-200 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                    {activeStep.actionSummary}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subtitle / Voiceover Teleprompter Bar */}
          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-800/60">
                  <Volume2 className="h-3 w-3" />
                  <span>Scene {activeChapter.id}.{currentStepIndex + 1} Voiceover Caption</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  Speed: {playbackSpeed}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setIsMuted(!isMuted);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                    isMuted ? 'text-rose-300 bg-rose-950/60 border-rose-800' : 'text-slate-300 bg-slate-800 border-slate-700 hover:text-white'
                  }`}
                >
                  {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  <span>{isMuted ? 'Muted' : 'Audio On'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyFullVideoScript}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
                >
                  {copiedScript ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedScript ? 'Copied Full Script!' : 'Copy All 6 Scene Scripts'}</span>
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-base text-white font-bold leading-relaxed">
              &ldquo;{activeStep.narration}&rdquo;
            </p>

            {/* Pro Tip Box */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-950/50 border border-indigo-500/25 text-xs text-indigo-200">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">💡 Pro Tip: </span>
                <span>{proTips[activeChapter.id]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Playback & Timeline Scrubber Bar */}
        <div className="bg-slate-900 px-4 py-3 border-t border-slate-800 space-y-2.5">
          {/* 6-Chapter Segmented Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1.5 h-2 rounded-full overflow-hidden">
              {chapters.map((ch) => {
                const isPastChapter = ch.id < selectedChapterId;
                const isCurrentChapter = ch.id === selectedChapterId;
                const chapterPct = isPastChapter
                  ? 100
                  : isCurrentChapter
                  ? ((currentStepIndex + stepProgress / 100) / ch.steps.length) * 100
                  : 0;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChapter(ch.id)}
                    title={ch.title}
                    className="flex-1 h-full bg-slate-800 rounded-full relative overflow-hidden cursor-pointer"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-100"
                      style={{ width: `${chapterPct}%` }}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0">
              Scene {activeChapter.id}/6 • Step {currentStepIndex + 1}/{activeChapter.steps.length}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0 && selectedChapterId === 1}
                className="text-slate-300 hover:text-white p-1.5 h-8 w-8"
                title="Previous Scene"
              >
                <Rewind className="h-3.5 w-3.5" />
              </Button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextStep}
                disabled={
                  currentStepIndex === activeChapter.steps.length - 1 &&
                  selectedChapterId === chapters.length
                }
                className="text-slate-300 hover:text-white p-1.5 h-8 w-8"
                title="Next Scene"
              >
                <FastForward className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayAllFromStart}
                className="text-slate-300 hover:text-white p-1.5 h-8 w-8"
                title="Restart Full Tutorial"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  setIsMuted(!isMuted);
                }}
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  isMuted ? 'text-rose-400 bg-rose-950/40' : 'text-slate-300 hover:text-white'
                }`}
                title={isMuted ? 'Unmute Voiceover' : 'Mute Voiceover'}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5 text-[10px]">
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      playbackSpeed === speed
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              <Link href={activeChapter.ctaHref}>
                <Button
                  size="sm"
                  className="gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3"
                >
                  <span>{activeChapter.cta}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Step-by-Step Storyboard & Voiceover Script Below Player */}
      <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span>6-Scene Video Storyboard & Voiceover Script</span>
            </h3>
            <span className="text-xs text-slate-500">
              Click any scene to preview or copy script for CapCut / Reels
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
                      ? 'border-indigo-500/60 bg-white dark:bg-slate-900 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedAccordionId(isExpanded ? null : ch.id)}
                    className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors cursor-pointer"
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
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                        {ch.title}
                      </h4>
                    </div>

                    <div className="shrink-0 p-1 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
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
                                <span className="text-[10px] font-mono text-slate-400">
                                  ~{st.durationSec}s
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                                &ldquo;{st.narration}&rdquo;
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
                            setIsPlaying(true);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="gap-1.5 text-xs font-semibold h-7"
                        >
                          <Play className="h-3 w-3 text-indigo-600" />
                          <span>Play This Scene</span>
                        </Button>

                        <Link href={ch.ctaHref}>
                          <Button
                            size="sm"
                            className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7"
                          >
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
