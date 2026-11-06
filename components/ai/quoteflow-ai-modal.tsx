'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Send,
  FileText,
  TrendingUp,
  Users,
  Clock,
  Loader2,
  Edit,
  Plus,
  Mic,
  Maximize2,
  Minimize2,
  ChevronRight,
  UserPlus,
  AlertCircle,
  Calendar,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Flame,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';
import { Quotation, Customer, CurrencyCode } from '@/types/database';
import { DailyBusinessBriefing, AiAttentionItem } from '@/lib/ai/proactive-engine';
import { formatCurrency } from '@/lib/quotations/calculations';
import { RichAiResponsePayload } from '@/types/rich-ai';
import { RichAIMessage } from '@/components/ai/rich';
import { OperatorDailyPlan } from '@/types/business-operator';
import { OperatorDailyPlanCard } from '@/components/ai/operator-daily-plan-card';
import {
  PipelineTemperatureCard,
  LeadRecoveryCard,
  WinLossCard,
} from '@/components/ai/operator-insights-cards';
import {
  MultipleCustomerMatchesCard,
  QuoteDraftPreviewCard,
  QuoteCreatedSuccessCard,
  CustomerNotFoundCard,
  InteractiveQuoteDraftCard,
} from '@/components/ai/customer-action-cards';
import { cn } from '@/lib/utils';
import {
  BusinessMistake,
  BusinessHealthScore,
} from '@/types/growth-assistant';
import { NeedsAttentionView } from '@/components/ai/growth/needs-attention-view';
import { BusinessHealthView } from '@/components/ai/growth/business-health-view';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  richPayload?: RichAiResponsePayload;
  actionType?:
    | 'quote_draft'
    | 'quote_sent'
    | 'payment_report'
    | 'quotation_report'
    | 'sales_report'
    | 'missing_contact'
    | 'general_help'
    | 'customer_exact_match'
    | 'customer_multi_match'
    | 'customer_not_found'
    | 'proactive_briefing'
    | 'operator_daily_plan'
    | 'pipeline_analysis'
    | 'lead_recovery'
    | 'win_loss_insights'
    | 'batch_messages_ready'
    | 'quote_draft_preview'
    | 'quote_created'
    | 'guided_quote_ask_items'
    | 'guided_quote_ask_customer';
  quotation?: Quotation;
  customer?: Customer;
  candidateMatches?: Array<{ customer: Customer; score: number; reason: string }>;
  searchedTerm?: string;
  pendingQuotePayload?: any;
  sentDetails?: {
    quoteNumber: string;
    customerName: string;
    amount: number;
    currency: string;
    status: string;
    viewUrl: string;
  };
  reportData?: any;
  briefing?: DailyBusinessBriefing;
  batchMessages?: any[];
  operatorPlan?: OperatorDailyPlan;
  pipelineAnalysis?: any;
  recoveryItems?: any[];
  winLossAnalysis?: any;
}

const EXAMPLE_ACTIONS = [
  {
    icon: Zap,
    colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    title: 'What should I do today?',
    subtitle: 'Daily action plan, urgent follow-ups & revenue',
    action: 'daily_plan',
    prompt: 'What should I do today?',
  },
  {
    icon: FileText,
    colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    title: 'Create a quote',
    subtitle: 'e.g. Battery $400 and Gas $100 for Subesh',
    action: 'start_quote_workflow',
    prompt: 'Create quote',
  },
  {
    icon: Users,
    colorClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    title: 'Follow up with customers',
    subtitle: 'Show quotes waiting for approval',
    action: 'quotes_waiting_approval',
    prompt: 'Show quotes waiting for approval',
  },
  {
    icon: Clock,
    colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    title: 'Show overdue invoices',
    subtitle: 'List pending and overdue payments',
    action: 'overdue_invoices',
    prompt: 'Show overdue invoices',
  },
  {
    icon: TrendingUp,
    colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    title: 'Show sales this month',
    subtitle: 'Analyse quotes, approvals and payments',
    action: 'sales_report',
    prompt: 'Show sales this month',
  },
];

export function QuoteFlowAiModal() {
  const router = useRouter();
  const { isAiModalOpen, closeAiModal } = useThemeCustomization();

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDraftQuote, setActiveDraftQuote] = useState<Quotation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Batch Review Modal State
  const [batchMessagesToReview, setBatchMessagesToReview] = useState<any[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [batchSendResult, setBatchSendResult] = useState<string | null>(null);

  // Inline "Add Customer" Form State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    country: 'India',
    billing_address: '',
    tax_number: '',
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [pendingPayloadToResume, setPendingPayloadToResume] = useState<any>(null);
  const [currentPendingPayload, setCurrentPendingPayload] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);



  // Navigation & View State
  const [activeTab, setActiveTab] = useState<
    'chat' | 'mistakes' | 'health' | 'briefing' | 'attention'
  >('chat');

  // Growth Intelligence State
  const [growthMistakes, setGrowthMistakes] = useState<BusinessMistake[]>([]);
  const [businessHealth, setBusinessHealth] = useState<BusinessHealthScore | null>(null);
  const [isGrowthLoading, setIsGrowthLoading] = useState(false);

  // AI Attention & Today's Briefing State
  const [briefing, setBriefing] = useState<DailyBusinessBriefing | null>(null);
  const [actionDoneMap, setActionDoneMap] = useState<Record<string, boolean>>({});
  const [toastMessageMap, setToastMessageMap] = useState<Record<string, string>>({});
  const [snoozeTarget, setSnoozeTarget] = useState<AiAttentionItem | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // First-Login AI Welcome Onboarding State
  const [onboardingWelcome, setOnboardingWelcome] = useState<{
    showWelcome: boolean;
    ownerName: string;
    businessName: string;
    config: any;
    setupStatus: any;
  } | null>(null);

  const loadOnboardingWelcome = () => {
    fetch('/api/welcome/onboarding')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && !data.aiWelcomeSeen && data.aiWelcomeConfig?.enabled) {
          setOnboardingWelcome({
            showWelcome: true,
            ownerName: data.ownerName || 'there',
            businessName: data.businessName || 'Your Business',
            config: data.aiWelcomeConfig,
            setupStatus: data.setupStatus,
          });
        } else {
          setOnboardingWelcome(null);
        }
      })
      .catch(() => {});
  };

  const handleOnboardingSuggestionClick = async (sugg: any) => {
    // Mark AI welcome as seen so it never shows again
    fetch('/api/welcome/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_ai_welcome_seen' }),
    }).catch(() => {});
    setOnboardingWelcome(null);

    // Route by structured action type
    if (sugg.action === 'CREATE_FIRST_QUOTE') {
      handleSend('Help me create my first quote');
    } else if (sugg.action === 'SETUP_BUSINESS') {
      const setup = onboardingWelcome?.setupStatus;
      if (setup) {
        let setupSummary = `I checked your business profile for **${onboardingWelcome?.businessName || 'your company'}**:\n`;
        setupSummary += `• Business Name: ${setup.businessNameSet ? '✅ Configured' : '❌ Needs setting'}\n`;
        setupSummary += `• Currency: ${setup.currencySet ? '✅ Set' : '❌ Needs setting'}\n`;
        setupSummary += `• Logo: ${setup.logoSet ? '✅ Uploaded' : '○ Not yet uploaded'}\n`;
        setupSummary += `• Default Tax Rate: ${setup.taxConfigured ? '✅ Configured' : '○ Not yet set'}\n`;
        setupSummary += `• Terms & Conditions: ${setup.termsConfigured ? '✅ Configured' : '○ Default standard'}\n\n`;
        setupSummary += `👉 **Next Step:** ${setup.nextRecommendedStep}\n\nWould you like me to guide you through this now?`;

        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: 'user', text: sugg.label },
          { id: (Date.now() + 1).toString(), sender: 'ai', text: setupSummary },
        ]);
      } else {
        handleSend('Help me set up my business settings');
      }
    } else if (sugg.action === 'EXPLAIN_QUOTEFLOW') {
      const explanation = `**QuoteFlow AI is your Intelligent Business Operator.**\n\nHere is how I help keep your business moving:\n\n1. **⚡ Natural Language Quotes**: Say *"Quote John Doe $500 for web design with 10% discount"* and I draft the full quotation instantly.\n2. **👀 Quote & Customer Tracking**: I alert you when clients open your quotes, request changes, or when follow-ups are due.\n3. **✅ Digital Approvals & Invoicing**: Clients sign online with fingertip e-signatures. With 1-click, convert approved quotes to tax invoices.\n4. **💰 Payment Tracking & Insights**: Monitor outstanding balances, send WhatsApp/email payment reminders, and analyze repeat revenue.\n\nReady to get started? Try typing **"Create my first quote"** or ask me anything!`;
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: 'user', text: sugg.label },
        { id: (Date.now() + 1).toString(), sender: 'ai', text: explanation },
      ]);
    } else if (sugg.action === 'ADD_CUSTOMER') {
      handleSend('I want to add a customer to my workspace');
    } else if (sugg.action === 'OPEN_QUOTES') {
      closeAiModal();
      router.push('/quotations');
    } else if (sugg.action === 'OPEN_CUSTOMERS') {
      closeAiModal();
      router.push('/customers');
    } else if (sugg.action === 'OPEN_SETTINGS') {
      closeAiModal();
      router.push('/settings');
    } else {
      handleSend(sugg.prompt || sugg.label);
    }
  };

  const loadGrowthData = () => {
    setIsGrowthLoading(true);
    fetch('/api/ai/growth')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success) {
          setGrowthMistakes(data.mistakes || []);
          setBusinessHealth(data.health || null);
        }
      })
      .catch(() => {})
      .finally(() => setIsGrowthLoading(false));
  };

  const loadBriefing = () => {
    setIsBriefingLoading(true);
    const hour = new Date().getHours();
    fetch(`/api/ai/proactive?hour=${hour}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DailyBusinessBriefing | null) => {
        if (data) {
          setBriefing(data);
          try {
            const shownToday = localStorage.getItem('quoteflow_modal_ai_attention_shown_' + todayStr);
            const activeItems = (data.attentionItems || []).filter(
              (it) => it.priority !== 'INFORMATION' && !actionDoneMap[it.id]
            );
            // Show AI Attention once a day if active items exist and not yet shown today
            if (!shownToday && activeItems.length > 0) {
              setActiveTab('attention');
              localStorage.setItem('quoteflow_modal_ai_attention_shown_' + todayStr, 'true');
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setIsBriefingLoading(false));
  };

  useEffect(() => {
    if (isAiModalOpen) {
      loadBriefing();
      loadGrowthData();
      loadOnboardingWelcome();
    }
  }, [isAiModalOpen]);

  const handleAttentionAction = async (item: AiAttentionItem, actionKey: string, payload?: any) => {
    if (actionKey === 'view_quote' && item.targetId) {
      closeAiModal();
      router.push(`/quotations/${item.targetId}`);
      return;
    }
    if (actionKey === 'view_invoice' && item.targetId) {
      closeAiModal();
      router.push(`/invoices/${item.targetId}`);
      return;
    }
    if (actionKey === 'send_whatsapp') {
      const cleanPhone = (payload?.recipientPhone || '').replace(/[^\d+]/g, '');
      const encodedMsg = encodeURIComponent(payload?.message || '');
      if (cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
      }
      setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      setToastMessageMap((prev) => ({ ...prev, [item.id]: '✓ WhatsApp reminder opened' }));
      try {
        await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'whatsapp_sent',
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
          }),
        });
      } catch {}
      return;
    }
    if (actionKey === 'send_email') {
      setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      setToastMessageMap((prev) => ({ ...prev, [item.id]: '✓ Email reminder recorded' }));
      try {
        await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'email_sent',
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
            recipientEmail: payload?.recipientEmail,
            subject: payload?.subject,
            body: payload?.body,
          }),
        });
      } catch {}
      return;
    }
    if (actionKey === 'remind_later') {
      setSnoozeTarget(item);
      return;
    }
    if (actionKey === 'dismiss' || actionKey === 'ignore') {
      setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      try {
        await fetch('/api/ai/proactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionKey,
            recommendationId: item.id,
            recommendationKey: item.recommendationKey,
            targetId: item.targetId,
            targetNumber: item.targetNumber,
          }),
        });
      } catch {}
      return;
    }
  };

  const executeModalSnooze = async (item: AiAttentionItem, days: number = 3) => {
    try {
      await fetch('/api/ai/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'snooze',
          snoozeDays: days,
          recommendationId: item.id,
          recommendationKey: item.recommendationKey,
          targetId: item.targetId,
          targetNumber: item.targetNumber,
        }),
      });
      setToastMessageMap((p) => ({ ...p, [item.id]: `✓ Snoozed for ${days} days` }));
      setTimeout(() => {
        setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
        setSnoozeTarget(null);
      }, 700);
    } catch {
      setActionDoneMap((prev) => ({ ...prev, [item.id]: true }));
      setSnoozeTarget(null);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  if (!isAiModalOpen) return null;

  const handleSend = async (
    userQuery?: string,
    additionalPayload?: {
      confirmedCustomerId?: string;
      pendingQuotePayload?: any;
      action?: string;
    }
  ) => {
    const query = userQuery !== undefined ? userQuery : input;
    if (!query.trim() && !additionalPayload?.confirmedCustomerId && additionalPayload?.action !== 'commit_quote') return;
    if (isThinking) return;

    if (onboardingWelcome?.showWelcome) {
      fetch('/api/welcome/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_ai_welcome_seen' }),
      }).catch(() => {});
      setOnboardingWelcome(null);
    }

    if (additionalPayload?.action === 'start_quote_workflow') {
      setCurrentPendingPayload(null);
      setActiveDraftQuote(null);
    }

    if (query.trim()) {
      const userMsg: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: query.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
    }

    setInput('');
    setIsThinking(true);
    setActiveTab('chat');

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          clientHour: new Date().getHours(),
          activeDraftId: activeDraftQuote?.id || null,
          confirmedCustomerId: additionalPayload?.confirmedCustomerId || null,
          pendingQuotePayload: additionalPayload?.pendingQuotePayload || currentPendingPayload || null,
          action: additionalPayload?.action || null,
        }),
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 401) {
          throw new Error('Your session has expired. Please refresh the page to sign in again.');
        }
        throw new Error('AI Copilot encountered a temporary connection issue. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to process request');
      }

      if (data.pendingQuotePayload) {
        setCurrentPendingPayload(data.pendingQuotePayload);
      }
      if (data.actionType === 'quote_created' || data.actionType === 'quote_sent') {
        setCurrentPendingPayload(null);
      }

      if (data.quotation && (data.actionType === 'quote_draft' || data.actionType === 'quote_created')) {
        setActiveDraftQuote(data.quotation);
      } else if (data.actionType === 'quote_sent') {
        setActiveDraftQuote(null);
      }

      if (data.actionType === 'batch_messages_ready' && data.batchMessages) {
        setBatchMessagesToReview(data.batchMessages);
        setShowBatchModal(true);
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.replyText,
        richPayload: data.richPayload,
        actionType: data.actionType,
        quotation: data.quotation,
        customer: data.customer,
        candidateMatches: data.candidateMatches,
        searchedTerm: data.searchedTerm,
        pendingQuotePayload: data.pendingQuotePayload,
        sentDetails: data.sentDetails,
        reportData: data.reportData,
        briefing: data.briefing,
        batchMessages: data.batchMessages,
        operatorPlan: data.operatorPlan,
        pipelineAnalysis: data.pipelineAnalysis,
        recoveryItems: data.recoveryItems,
        winLossAnalysis: data.winLossAnalysis,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: err.message || 'Sorry, I encountered an error while processing that action.',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Select customer from multiple matches (Structured Action: Never sends button text back to chat)
  const handleCustomerSelected = async (selectedCustomer: Customer, pendingPayload?: any) => {
    if (isThinking) return;
    setIsThinking(true);

    const pending = pendingPayload || currentPendingPayload;
    const updatedPayload = {
      ...pending,
      customer: selectedCustomer,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      step: 'draft_ready',
      workflowStatus: 'draft_ready',
      customerResolved: true,
    };
    setCurrentPendingPayload(updatedPayload);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select_customer',
          customerId: selectedCustomer.id,
          confirmedCustomerId: selectedCustomer.id,
          customer: selectedCustomer,
          pendingQuotePayload: updatedPayload,
        }),
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 401) {
          throw new Error('Your session has expired. Please refresh the page to sign in again.');
        }
        throw new Error('AI Copilot encountered a temporary connection issue. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to select customer');
      }

      if (data.pendingQuotePayload) {
        setCurrentPendingPayload(data.pendingQuotePayload);
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.replyText,
        richPayload: data.richPayload,
        actionType: data.actionType,
        quotation: data.quotation,
        customer: data.customer || selectedCustomer,
        candidateMatches: data.candidateMatches,
        searchedTerm: data.searchedTerm,
        pendingQuotePayload: data.pendingQuotePayload,
        sentDetails: data.sentDetails,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: err.message || 'Sorry, I encountered an error while selecting that customer.',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Structured Quote Commit Action (Never sends button text back to chat)
  const handleCommitQuote = async (cust?: Customer, pendingPayload?: any) => {
    if (isThinking) return;
    setIsThinking(true);

    const pending = pendingPayload || currentPendingPayload;
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit_quote',
          confirmedCustomerId: cust?.id || pending?.customerId,
          pendingQuotePayload: pending,
        }),
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 401) {
          throw new Error('Your session has expired. Please refresh the page to sign in again.');
        }
        throw new Error('AI Copilot encountered a temporary connection issue. Please try again.');
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create quote');
      }

      if (data.actionType === 'quote_created' || data.actionType === 'quote_sent') {
        setCurrentPendingPayload(null);
      }

      if (data.quotation) {
        setActiveDraftQuote(data.quotation);
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.replyText,
        richPayload: data.richPayload,
        actionType: data.actionType,
        quotation: data.quotation,
        customer: data.customer,
        candidateMatches: data.candidateMatches,
        searchedTerm: data.searchedTerm,
        pendingQuotePayload: data.pendingQuotePayload,
        sentDetails: data.sentDetails,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: err.message || 'Sorry, I encountered an error while creating the quote.',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Open inline customer modal when customer is not found
  const handleOpenAddCustomerModal = (searchedTerm: string, pendingPayload: any) => {
    setNewCustomerForm({
      name: searchedTerm || '',
      company_name: searchedTerm || '',
      email: '',
      phone: '',
      country: 'India',
      billing_address: '',
      tax_number: '',
    });
    setPendingPayloadToResume(pendingPayload);
    setShowAddCustomerModal(true);
  };

  // Save new customer inline and immediately resume quote creation
  const handleSaveCustomerAndResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || isSavingCustomer) return;

    setIsSavingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomerForm.name.trim(),
          company_name: newCustomerForm.company_name.trim() || newCustomerForm.name.trim(),
          email: newCustomerForm.email.trim() || `${newCustomerForm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.local`,
          phone: newCustomerForm.phone.trim() || '9800000000',
          country: newCustomerForm.country.trim(),
          billing_address: newCustomerForm.billing_address.trim(),
          tax_number: newCustomerForm.tax_number.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to save customer');
      }

      const savedCustomer = await res.json();
      setShowAddCustomerModal(false);

      handleCustomerSelected(savedCustomer, pendingPayloadToResume);
    } catch (err: any) {
      alert(err.message || 'Error saving customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };



  // Execute batch follow-up send after confirmation
  const handleConfirmBatchSend = async () => {
    if (batchMessagesToReview.length === 0 || isSendingBatch) return;

    setIsSendingBatch(true);
    try {
      const res = await fetch('/api/ai/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_send',
          batchMessages: batchMessagesToReview,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send batch');

      setBatchSendResult(`✅ Successfully processed batch! Follow-up reminders have been queued.`);
      setTimeout(() => {
        setShowBatchModal(false);
        setBatchSendResult(null);
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to send batch reminders');
    } finally {
      setIsSendingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative w-full flex flex-col overflow-hidden transition-all duration-200 border border-slate-200 dark:border-[#263653] bg-white dark:bg-[#080F20] text-slate-900 dark:text-[#F5F7FF] shadow-2xl ${
          isExpanded
            ? 'max-w-6xl h-[95vh] sm:rounded-3xl'
            : 'max-w-4xl h-full sm:h-[820px] max-h-[100dvh] sm:max-h-[92vh] sm:rounded-3xl rounded-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header matching mockup */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#263653] px-4 sm:px-6 py-3 bg-white dark:bg-[#101A2D] shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl overflow-hidden shadow-sm shadow-indigo-500/20">
              <img
                src="/quoteflow-icon.png"
                alt="QuoteFlow"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                  QuoteFlow AI
                </span>
                <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA] hidden sm:block">
                Your intelligent business assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#17243B] transition-colors hidden sm:inline-flex"
              title={isExpanded ? 'Collapse size' : 'Expand workspace'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={closeAiModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#17243B] transition-colors"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 border-b border-slate-200 dark:border-[#263653] bg-slate-50/70 dark:bg-[#101A2D] text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all shrink-0',
              activeTab === 'chat'
                ? 'border-[#5638F5] text-[#5638F5] dark:text-[#2388FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <span>🤖</span>
            <span>Interactive Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mistakes')}
            className={cn(
              'flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all shrink-0',
              activeTab === 'mistakes'
                ? 'border-[#5638F5] text-[#5638F5] dark:text-[#2388FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <span>⚠️</span>
            <span>Needs Attention</span>
            {growthMistakes.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
                {growthMistakes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={cn(
              'flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all shrink-0',
              activeTab === 'health'
                ? 'border-[#5638F5] text-[#5638F5] dark:text-[#2388FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <span>🛡️</span>
            <span>Business Health</span>
            {businessHealth && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                {businessHealth.overallScore}/100
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('briefing')}
            className={cn(
              'flex items-center gap-1.5 py-3 px-3 border-b-2 transition-all shrink-0',
              activeTab === 'briefing'
                ? 'border-[#5638F5] text-[#5638F5] dark:text-[#2388FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            <span>📅</span>
            <span>Today's Briefing</span>
          </button>
        </div>

        {/* TAB: MISTAKES & INEFFICIENCIES */}
        {activeTab === 'mistakes' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            <NeedsAttentionView
              mistakes={growthMistakes}
              isLoading={isGrowthLoading}
              onAction={(m) => {
                if (m.actionKey.startsWith('/quotations') || m.actionKey.startsWith('/invoices') || m.actionKey.startsWith('/customers')) {
                  closeAiModal();
                  router.push(m.actionKey);
                } else {
                  setActiveTab('chat');
                  handleSend(m.title);
                }
              }}
              onDismiss={(m) => {
                setGrowthMistakes((prev) => prev.filter((it) => it.id !== m.id));
              }}
            />
          </div>
        )}

        {/* TAB: TRANSPARENT BUSINESS HEALTH SCORE */}
        {activeTab === 'health' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
            <BusinessHealthView health={businessHealth} isLoading={isGrowthLoading} />
          </div>
        )}

        {/* TAB 1: AI ATTENTION (Past 7 Days, Once a day, In-progress 6th day warning) */}
        {activeTab === 'attention' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span>AI Needs Your Attention</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">
                  Proactive situations identified automatically based on customer views, validity, and in-progress deadlines (Past 7 Days).
                </p>
              </div>
              <button
                type="button"
                onClick={loadBriefing}
                disabled={isBriefingLoading}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-[#263653] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Refresh attention items"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isBriefingLoading && 'animate-spin')} />
              </button>
            </div>

            {/* Weekly Performance Overview Card */}
            {briefing?.attentionItems?.find((it) => it.id === 'info_summary') && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] space-y-1 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Weekly Performance Overview</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#A8B4CA] leading-relaxed">
                  {briefing.attentionItems.find((it) => it.id === 'info_summary')?.description}
                </p>
              </div>
            )}

            {/* Attention Cards List */}
            {briefing?.attentionItems?.filter((it) => it.priority !== 'INFORMATION' && !actionDoneMap[it.id]).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-[#A8B4CA] space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-200">All caught up for today!</p>
                <p>No urgent items requiring attention. Any actioned, discarded, or ignored items remain hidden for today.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#5638F5] to-[#2388FF] text-white font-bold"
                >
                  <span>Go to Interactive Chat</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {briefing?.attentionItems
                  ?.filter((it) => it.priority !== 'INFORMATION' && !actionDoneMap[it.id])
                  .map((item) => {
                    const isUrgent = item.priority === 'URGENT';
                    const isOpp = item.priority === 'OPPORTUNITY';

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'p-4 rounded-2xl border transition-all space-y-3 shadow-xs',
                          isUrgent
                            ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                            : isOpp
                            ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-[#263653] bg-white dark:bg-[#101A2D]'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {item.title}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
                                  isUrgent
                                    ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                                    : isOpp
                                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'
                                )}
                              >
                                {item.priority.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-[#A8B4CA] leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Action Toast Feedback */}
                        {toastMessageMap[item.id] && (
                          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 animate-in fade-in">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{toastMessageMap[item.id]}</span>
                          </div>
                        )}

                        {/* Interactive Snooze Picker */}
                        {snoozeTarget?.id === item.id ? (
                          <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] space-y-2 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>Snooze Reminder:</span>
                              <button onClick={() => setSnoozeTarget(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => executeModalSnooze(item, 1)}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] text-xs font-semibold hover:border-indigo-500"
                              >
                                1 Day
                              </button>
                              <button
                                type="button"
                                onClick={() => executeModalSnooze(item, 3)}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] text-xs font-semibold hover:border-indigo-500"
                              >
                                3 Days
                              </button>
                              <button
                                type="button"
                                onClick={() => executeModalSnooze(item, 7)}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] text-xs font-semibold hover:border-indigo-500"
                              >
                                7 Days
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Direct Action Buttons */
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-[#263653]/60">
                            {item.actions.map((act) => (
                              <button
                                key={act.id}
                                type="button"
                                onClick={() => handleAttentionAction(item, act.actionKey, act.payload)}
                                className={cn(
                                  'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs',
                                  act.actionKey === 'send_whatsapp'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : act.actionKey === 'send_email'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : act.actionKey === 'view_quote' || act.actionKey === 'view_invoice'
                                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-[#17243B] dark:hover:bg-[#263653] text-slate-800 dark:text-white'
                                    : act.actionKey === 'dismiss' || act.actionKey === 'ignore'
                                    ? 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    : 'border border-slate-200 dark:border-[#263653] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#17243B]'
                                )}
                              >
                                {act.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TODAY'S BRIEFING (7 Days metrics & 4 core questions) */}
        {activeTab === 'briefing' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#2388FF]" />
                  <span>Today's Business Briefing</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA]">
                  Week-over-week performance analysis and answers to your 4 core business questions.
                </p>
              </div>
            </div>

            {briefing?.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-white dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quotes Created</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">{briefing.metrics.quotesCreated}</span>
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Quoted</span>
                  <span className="text-base font-black text-[#5638F5] dark:text-[#2388FF]">
                    {formatCurrency(briefing.metrics.quoteValue, briefing.currency || 'USD')}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <span className="text-[10px] uppercase tracking-wider block">Approved</span>
                  <span className="text-base font-black">{briefing.metrics.quotesApproved}</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <span className="text-[10px] uppercase tracking-wider block">Awaiting Approval</span>
                  <span className="text-base font-black">{briefing.metrics.quotesAwaitingApproval}</span>
                </div>
              </div>
            )}

            {briefing?.fourQuestions && (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">What Happened Recently?</span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{briefing.fourQuestions.whatHappened}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] space-y-1">
                  <span className="text-[11px] font-bold text-amber-500 uppercase">What Needs Attention?</span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{briefing.fourQuestions.whatNeedsAttention}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] space-y-1">
                  <span className="text-[11px] font-bold text-emerald-500 uppercase">What Is Working?</span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{briefing.fourQuestions.whatIsWorking}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] space-y-1">
                  <span className="text-[11px] font-bold text-[#5638F5] dark:text-[#2388FF] uppercase">Recommended Next Steps</span>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{briefing.fourQuestions.whatShouldIDoNext}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INTERACTIVE CHAT (With Welcome Screen & Bottom Composer) */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 scroll-smooth">
          {/* Welcome Screen & Try These Examples (Centered when no messages) */}
          {messages.length === 0 ? (
            onboardingWelcome?.showWelcome ? (
              <div className="flex flex-col items-center justify-center text-center py-4 sm:py-8 animate-in fade-in duration-300 max-w-xl mx-auto">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/20 mb-3 hover:scale-105 transition-transform duration-200">
                  <img
                    src="/quoteflow-icon.png"
                    alt="QuoteFlow"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Welcome to Your AI Business Assistant</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  Hi {onboardingWelcome.ownerName} 👋
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A8B4CA] max-w-md mx-auto mb-6 leading-relaxed">
                  {onboardingWelcome.config?.description ||
                    "Welcome to QuoteFlow AI. I'm here to help you create quotes, understand your customers, follow opportunities and keep your business moving."}
                </p>

                <div className="w-full text-left bg-gradient-to-br from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-4 sm:p-5 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2.5 flex items-center justify-between">
                    <span>You can start by asking me something like:</span>
                    <span className="text-[10px] text-slate-400 font-normal">Tap any chip to begin</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(onboardingWelcome.config?.suggestions || []).map((sugg: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleOnboardingSuggestionClick(sugg)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-400 hover:shadow-xs transition-all text-left group cursor-pointer"
                      >
                        <div className="pr-2">
                          <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                            {sugg.label}
                          </div>
                          {sugg.subtitle && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {sugg.subtitle}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 sm:py-10 animate-in fade-in duration-300">
              {/* Centered Official QuoteFlow Logo */}
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/20 mb-3.5 hover:scale-105 transition-transform duration-200">
                <img
                  src="/quoteflow-icon.png"
                  alt="QuoteFlow"
                  className="h-full w-full object-contain"
                />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                Meet QuoteFlow AI
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A8B4CA] max-w-md mx-auto mb-6 sm:mb-8 leading-relaxed">
                Create quotes, follow up with customers and get paid faster.
              </p>

              {/* Try These Examples: 4 Compact Action Cards */}
              <div className="w-full max-w-3xl">
                <div className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-1">
                  Try these examples
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 text-left">
                  {EXAMPLE_ACTIONS.map((ex, idx) => {
                    const Icon = ex.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(ex.prompt, { action: ex.action })}
                        className="group flex flex-col justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#101A2D] hover:bg-slate-100 dark:hover:bg-[#17243B] border border-slate-200/80 dark:border-[#263653] hover:border-[#5638F5]/60 transition-all shadow-xs text-left"
                      >
                        <div className="flex items-start justify-between w-full mb-2">
                          <div className={cn('p-2 rounded-xl', ex.colorClass)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#5638F5] dark:group-hover:text-[#2388FF] group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-0.5">
                            {ex.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#A8B4CA] leading-snug line-clamp-2">
                            {ex.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Natural Business Questions: Growth & Learning Queries */}
                <div className="mt-4 pt-3.5 border-t border-slate-200/70 dark:border-[#263653]/60 text-left">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Ask QuoteFlow AI Naturally
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'What should I do today?',
                      'Which quotes are ready to invoice?',
                      'Which quotes should I follow up today?',
                      "Which customers haven't paid?",
                      'Why are my sales down?',
                      'Which services make me the most money?',
                      'Which customers may reorder this month?',
                      'Find customers similar to my best customers',
                      'What is my business health score?',
                    ].map((query, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleSend(query)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-[#101A2D] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-[#263653] hover:border-indigo-300 dark:hover:border-indigo-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
                      >
                        {query}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )
          ) : (
            /* Collapsible compact row of examples when conversation is in progress */
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-[#263653]/60 scrollbar-none">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                Quick Ask:
              </span>
              {[
                '⚡ What should I do today?',
                'Why are my sales down?',
                'Which services make me the most money?',
                'Which quotes should I follow up today?',
                "Which customers haven't paid?",
                'What is my business health score?',
              ].map((query, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(query)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-slate-50 dark:bg-[#101A2D] hover:bg-slate-100 dark:hover:bg-[#17243B] border border-slate-200/70 dark:border-[#263653] text-slate-600 dark:text-[#A8B4CA] hover:text-[#5638F5] dark:hover:text-white transition-colors shrink-0"
                >
                  <span>{query}</span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              } animate-in fade-in duration-200`}
            >
              {/* Message Header (Sender Label & Timestamp) */}
              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400 dark:text-[#A8B4CA]">
                {msg.sender === 'ai' ? (
                  <>
                    <div className="h-5 w-5 rounded-md overflow-hidden shrink-0 shadow-2xs">
                      <img
                        src="/quoteflow-icon.png"
                        alt="QuoteFlow AI"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">QuoteFlow AI</span>
                    <span>•</span>
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-600 dark:text-slate-400">You</span>
                    <span>•</span>
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
              </div>

              {/* Message Body */}
              <div className="max-w-[96%] sm:max-w-[85%] space-y-3">
                {msg.sender === 'user' ? (
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-[#2388FF] text-white font-medium shadow-sm">
                      {msg.text}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#5638F5] to-[#2388FF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      S
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200/80 dark:border-[#263653] text-xs sm:text-sm text-slate-800 dark:text-[#F5F7FF] leading-relaxed shadow-xs space-y-3">
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Rich Response Payload if available */}
                    {msg.richPayload && (
                      <RichAIMessage
                        payload={msg.richPayload}
                        onSelectQuestion={(q) => handleSend(q)}
                      />
                    )}

                    {/* CASE 1: QUOTE DRAFT PREVIEW (Uncommitted Draft) */}
                    {(msg.actionType === 'quote_draft_preview' || msg.actionType === 'customer_exact_match') && (
                      <QuoteDraftPreviewCard
                        customer={msg.customer}
                        pendingQuotePayload={msg.pendingQuotePayload}
                        onCreateQuote={(cust, payload) => {
                          handleCommitQuote(cust, payload || msg.pendingQuotePayload);
                        }}
                        onEditDraft={() => {
                          setInput('Change ');
                        }}
                        onAddItem={() => {
                          setInput('Add ');
                        }}
                      />
                    )}

                    {/* CASE 2: QUOTE CREATED SUCCESSFULLY */}
                    {msg.actionType === 'quote_created' && (
                      <QuoteCreatedSuccessCard
                        quotation={msg.quotation}
                        sentDetails={msg.sentDetails}
                        onSendEmail={() => handleSend('Send it')}
                        onViewQuote={(quoteId) => {
                          closeAiModal();
                          router.push(`/quotations/${quoteId}`);
                        }}
                      />
                    )}

                    {/* CASE 3: MULTIPLE CUSTOMER MATCHES CARD */}
                    {msg.actionType === 'customer_multi_match' && msg.candidateMatches && (
                      <MultipleCustomerMatchesCard
                        candidateMatches={msg.candidateMatches}
                        pendingQuotePayload={msg.pendingQuotePayload}
                        onSelectCustomer={(c, payload) => {
                          handleCustomerSelected(c, payload || msg.pendingQuotePayload);
                        }}
                      />
                    )}

                    {/* CASE 4: CUSTOMER NOT FOUND CARD */}
                    {msg.actionType === 'customer_not_found' && (
                      <CustomerNotFoundCard
                        searchedTerm={msg.searchedTerm}
                        pendingQuotePayload={msg.pendingQuotePayload}
                        onOpenAddModal={handleOpenAddCustomerModal}
                      />
                    )}

                    {/* CASE 5: INTERACTIVE QUOTATION DRAFT CARD */}
                    {msg.actionType === 'quote_draft' && msg.quotation && (
                      <InteractiveQuoteDraftCard
                        quotation={msg.quotation}
                        onSendQuote={() => handleSend('Send it')}
                        onEditQuote={(quoteId) => {
                          closeAiModal();
                          router.push(`/quotations/${quoteId}`);
                        }}
                      />
                    )}

                    {/* CASE 6: QUOTATION SENT CONFIRMATION */}
                    {msg.actionType === 'quote_sent' && (
                      <QuoteCreatedSuccessCard
                        quotation={msg.quotation}
                        sentDetails={msg.sentDetails}
                        onSendEmail={() => handleSend('Send it')}
                        onViewQuote={(quoteId) => {
                          closeAiModal();
                          router.push(msg.sentDetails?.viewUrl || `/quotations/${quoteId}`);
                        }}
                      />
                    )}

                    {/* CASE 7: BUSINESS OPERATOR DAILY ACTION PLAN CARD */}
                    {msg.actionType === 'operator_daily_plan' && msg.operatorPlan && (
                      <OperatorDailyPlanCard
                        plan={msg.operatorPlan}
                        onClose={closeAiModal}
                      />
                    )}

                    {/* CASE 8: PIPELINE TEMPERATURE CARD */}
                    {msg.actionType === 'pipeline_analysis' && msg.pipelineAnalysis && (
                      <PipelineTemperatureCard
                        analysis={msg.pipelineAnalysis}
                        onClose={closeAiModal}
                      />
                    )}

                    {/* CASE 9: LEAD RECOVERY CARD */}
                    {msg.actionType === 'lead_recovery' && msg.recoveryItems && (
                      <LeadRecoveryCard
                        items={msg.recoveryItems}
                        onClose={closeAiModal}
                      />
                    )}

                    {/* CASE 10: WIN / LOSS INSIGHTS CARD */}
                    {msg.actionType === 'win_loss_insights' && msg.winLossAnalysis && (
                      <WinLossCard analysis={msg.winLossAnalysis} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-3 py-2 text-slate-500 dark:text-[#A8B4CA]">
              <div className="h-6 w-6 rounded-lg overflow-hidden shrink-0 shadow-xs">
                <img src="/quoteflow-icon.png" alt="Thinking" className="h-full w-full object-contain animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-[#101A2D] border border-slate-200 dark:border-[#263653] text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5638F5] dark:text-[#2388FF]" />
                <span>QuoteFlow AI is working...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Composer matching mockup */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#263653] bg-white dark:bg-[#101A2D]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto rounded-full bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] px-3 sm:px-4 py-1.5 shadow-sm focus-within:border-[#5638F5] dark:focus-within:border-[#2388FF] transition-all"
          >
            {/* Contextual Text Input Placeholder */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                currentPendingPayload?.step === 'awaiting_items'
                  ? 'Enter products/services and prices...'
                  : currentPendingPayload?.step === 'awaiting_customer'
                  ? 'Enter customer name, email or phone...'
                  : currentPendingPayload?.items?.length > 0
                  ? 'Add an item, change price, discount, tax or terms...'
                  : activeTab === 'attention'
                  ? 'Ask about customer follow-ups...'
                  : 'Ask QuoteFlow AI anything...'
              }
              disabled={isThinking}
              className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-[#F5F7FF] placeholder-slate-400 px-2 py-1"
            />

            {/* Mic Voice Button */}
            <button
              type="button"
              onClick={() => {
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                  try {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'en-US';
                    recognition.start();
                    recognition.onresult = (event: any) => {
                      const spoken = event.results[0][0].transcript;
                      setInput(spoken);
                    };
                  } catch {
                    alert('Voice input is ready. Please speak your quotation request.');
                  }
                } else {
                  alert('Voice dictation is supported in modern browsers.');
                }
              }}
              className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#101A2D] flex items-center justify-center text-slate-500 dark:text-[#A8B4CA] hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
              title="Voice Input"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Purple-to-Blue Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 text-white font-semibold shadow-md shadow-[#5638F5]/30 transition-all disabled:opacity-40"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </>
    )}

        {/* BATCH MESSAGE REVIEW MODAL */}
        {showBatchModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Review Follow-Up Messages ({batchMessagesToReview.length})
                  </h4>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {batchMessagesToReview.map((msgItem, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {msgItem.recipientName} ({msgItem.targetNumber})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {msgItem.channel}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                      {msgItem.messageText}
                    </div>
                  </div>
                ))}
              </div>

              {batchSendResult ? (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center">
                  {batchSendResult}
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBatchSend}
                    disabled={isSendingBatch}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSendingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    <span>{isSendingBatch ? 'Sending...' : 'Confirm & Send All'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INLINE "ADD NEW CUSTOMER" MODAL */}
        {showAddCustomerModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-indigo-500" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Add Customer &amp; Continue Quote
                  </h4>
                </div>
                <button
                  onClick={() => setShowAddCustomerModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomerAndResume} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.name}
                    onChange={(e) =>
                      setNewCustomerForm({
                        ...newCustomerForm,
                        name: e.target.value,
                        company_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                      placeholder="e.g. +91 9800000000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newCustomerForm.email}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                      placeholder="client@example.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.billing_address}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, billing_address: e.target.value })}
                    placeholder="City, State"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Tax / GSTIN / TRN
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.tax_number}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, tax_number: e.target.value })}
                    placeholder="Optional Tax ID"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(false)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCustomer}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSavingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>Save &amp; Continue Quote</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
