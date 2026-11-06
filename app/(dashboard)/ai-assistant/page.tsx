'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Loader2,
  User,
  Plus,
  Paperclip,
  Mic,
  FileText,
  Clock,
  TrendingUp,
  Users,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { RichAiResponsePayload } from '@/types/rich-ai';
import { RichAIMessage } from '@/components/ai/rich';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';
import { Customer } from '@/types/database';
import {
  MultipleCustomerMatchesCard,
  ExactCustomerMatchCard,
  QuoteDraftPreviewCard,
  QuoteCreatedSuccessCard,
  CustomerNotFoundCard,
  InteractiveQuoteDraftCard,
  InlineAddCustomerModal,
} from '@/components/ai/customer-action-cards';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  richPayload?: RichAiResponsePayload;
  actionType?: string;
  customer?: Customer;
  candidateMatches?: Array<{ customer: Customer; score?: number; reason?: string }>;
  searchedTerm?: string;
  pendingQuotePayload?: any;
  quotation?: any;
  sentDetails?: any;
  isStreaming?: boolean;
}

const EXAMPLE_ACTIONS = [
  {
    icon: FileText,
    colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    title: 'Create a quote',
    subtitle: 'e.g. Battery $400 and Gas $100 for Subesh',
    prompt: 'Create quote Battery $400 and Gas $100 for Subesh',
  },
  {
    icon: Users,
    colorClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    title: 'Follow up with customers',
    subtitle: 'Show quotes waiting for approval',
    prompt: 'Show quotes waiting for approval',
  },
  {
    icon: Clock,
    colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    title: 'Show overdue invoices',
    subtitle: 'List pending and overdue payments',
    prompt: 'Show overdue invoices',
  },
  {
    icon: TrendingUp,
    colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    title: 'Show sales this month',
    subtitle: 'Analyse quotes, approvals and payments',
    prompt: "Show this month's sales",
  },
];

export default function AiAssistantPage() {
  const router = useRouter();
  const { resolvedTheme } = useThemeCustomization();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    company: string;
    initials: string;
  }>({
    name: 'Subesh M',
    company: 'Demo Company',
    initials: 'SM',
  });

  // Modal for inline new customer creation
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [modalSearchedTerm, setModalSearchedTerm] = useState('');
  const [modalPendingPayload, setModalPendingPayload] = useState<any>(null);
  const [currentPendingPayload, setCurrentPendingPayload] = useState<any>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize and fetch user settings
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.organization) {
          const compName = data.organization.name || 'Demo Company';
          const userName = data.user?.fullName || 'Subesh M';
          const initials =
            userName
              .split(' ')
              .map((p: string) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'SM';

          setUserProfile({
            name: userName,
            company: compName,
            initials: initials || 'SM',
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleResetChat = () => {
    setMessages([]);
    setCurrentPendingPayload(null);
    setInput('');
  };

  // Main dispatcher to send prompt or structured payload to AI Copilot
  const handleSend = async (
    customText?: string,
    options?: {
      confirmedCustomerId?: string;
      pendingQuotePayload?: any;
    }
  ) => {
    const textToSend = (customText !== undefined ? customText : input).trim();
    if ((!textToSend && !options?.confirmedCustomerId) || isThinking) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Display user message bubble
    if (textToSend) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: textToSend,
        timestamp: nowTime,
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    if (customText === undefined) setInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          clientHour: new Date().getHours(),
          confirmedCustomerId: options?.confirmedCustomerId,
          pendingQuotePayload: options?.pendingQuotePayload || currentPendingPayload,
          action: options?.action,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || 'Could not process request. Please try again.');
      }

      const data = await res.json();

      if (data.pendingQuotePayload) {
        setCurrentPendingPayload(data.pendingQuotePayload);
      }
      if (data.actionType === 'quote_created' || data.actionType === 'quote_sent') {
        setCurrentPendingPayload(null);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.replyText || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        richPayload: data.richPayload,
        actionType: data.actionType,
        customer: data.customer,
        candidateMatches: data.candidateMatches,
        searchedTerm: data.searchedTerm,
        pendingQuotePayload: data.pendingQuotePayload,
        quotation: data.quotation,
        sentDetails: data.sentDetails,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: err.message || 'Sorry, I encountered a temporary connection issue.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || 'Could not select customer. Please try again.');
      }

      const data = await res.json();
      if (data.pendingQuotePayload) {
        setCurrentPendingPayload(data.pendingQuotePayload);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.replyText || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        richPayload: data.richPayload,
        actionType: data.actionType,
        customer: data.customer || selectedCustomer,
        candidateMatches: data.candidateMatches,
        searchedTerm: data.searchedTerm,
        pendingQuotePayload: data.pendingQuotePayload,
        quotation: data.quotation,
        sentDetails: data.sentDetails,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: err.message || 'Sorry, I encountered an error while selecting that customer.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || 'Could not create quote. Please try again.');
      }

      const data = await res.json();
      if (data.actionType === 'quote_created' || data.actionType === 'quote_sent') {
        setCurrentPendingPayload(null);
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.replyText || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        richPayload: data.richPayload,
        actionType: data.actionType,
        customer: data.customer,
        candidateMatches: data.candidateMatches,
        searchedTerm: data.searchedTerm,
        pendingQuotePayload: data.pendingQuotePayload,
        quotation: data.quotation,
        sentDetails: data.sentDetails,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: err.message || 'Sorry, I encountered an error while creating the quote.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Confirm customer and immediately build quotation with preserved state
  const handleConfirmCustomerAndCreate = (customer: Customer, pendingPayload: any) => {
    handleCustomerSelected(customer, pendingPayload);
  };

  // Open inline modal when customer is not found
  const handleOpenAddCustomerModal = (searchedTerm: string, pendingPayload: any) => {
    setModalSearchedTerm(searchedTerm);
    setModalPendingPayload(pendingPayload);
    setShowAddCustomerModal(true);
  };

  // Save new customer and resume quotation drafting automatically
  const handleSaveCustomerAndResume = async (formData: any) => {
    setIsSavingCustomer(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          company_name: formData.company_name?.trim() || formData.name.trim(),
          email: formData.email?.trim() || `${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.local`,
          phone: formData.phone?.trim() || '9800000000',
          country: formData.country?.trim() || 'United Arab Emirates',
          billing_address: formData.billing_address?.trim() || '',
          tax_number: formData.tax_number?.trim() || '',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to save customer');
      }

      const savedCustomer = await res.json();
      setShowAddCustomerModal(false);

      // Automatically finalize the quotation without re-entering anything
      handleSend(`Customer ${savedCustomer.name} saved. Finalizing quotation...`, {
        confirmedCustomerId: savedCustomer.id,
        pendingQuotePayload: modalPendingPayload,
      });
    } catch (err: any) {
      alert(err.message || 'Error saving customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto rounded-3xl bg-white dark:bg-[#080F20] border border-slate-200 dark:border-[#263653] shadow-2xl overflow-hidden transition-colors">
      {/* Top Header Bar matching QuoteFlow official design */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#263653] bg-white/95 dark:bg-[#101A2D]/95 backdrop-blur-md sticky top-0 z-20">
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
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-[#F5F7FF] tracking-tight">QuoteFlow AI</h1>
              {/* Online Neon Green Badge */}
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#11C995]/15 text-[#11C995] border border-[#11C995]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#11C995] animate-pulse" />
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#A8B4CA] hidden sm:block">Your intelligent business assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* New Chat Reset Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#A8B4CA] hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#17243B] hover:bg-slate-200 dark:hover:bg-[#263653] border border-slate-200/80 dark:border-[#263653] transition-colors"
              title="Start a new chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}

          {/* User Profile Chip */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#263653]">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-[#5638F5] to-[#2388FF] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {userProfile.initials}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-bold text-slate-900 dark:text-[#F5F7FF] leading-tight">{userProfile.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-[#A8B4CA]">{userProfile.company}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages / Welcome Screen Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin bg-slate-50/50 dark:bg-[#080F20]">
        {/* Welcome Screen & Try These Examples (Centered when no messages) */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8 sm:py-14 animate-in fade-in duration-300">
            {/* Centered Official QuoteFlow Logo */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/20 mb-4 hover:scale-105 transition-transform duration-200">
              <img
                src="/quoteflow-icon.png"
                alt="QuoteFlow"
                className="h-full w-full object-contain"
              />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              Meet QuoteFlow AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A8B4CA] max-w-md mx-auto mb-8 sm:mb-10 leading-relaxed">
              Create quotes, follow up with customers and get paid faster.
            </p>

            {/* Try These Examples: 4 Compact Action Cards */}
            <div className="w-full max-w-3xl">
              <div className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
                Try these examples
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
                {EXAMPLE_ACTIONS.map((ex, idx) => {
                  const Icon = ex.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(ex.prompt)}
                      className="group flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-[#101A2D] hover:bg-slate-50 dark:hover:bg-[#17243B] border border-slate-200/80 dark:border-[#263653] hover:border-[#5638F5]/60 transition-all shadow-xs text-left"
                    >
                      <div className="flex items-start justify-between w-full mb-3">
                        <div className={cn('p-2.5 rounded-xl', ex.colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#5638F5] dark:group-hover:text-[#2388FF] group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-1">
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
            </div>
          </div>
        ) : (
          /* Collapsible compact row of examples when conversation is in progress */
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/60 dark:border-[#263653]/60 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
              Examples:
            </span>
            {EXAMPLE_ACTIONS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(ex.prompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-[#101A2D] hover:bg-slate-50 dark:hover:bg-[#17243B] border border-slate-200/70 dark:border-[#263653] text-slate-600 dark:text-[#A8B4CA] hover:text-[#5638F5] dark:hover:text-white transition-colors shrink-0"
              >
                <span>{ex.title}</span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
              </button>
            ))}
          </div>
        )}

        {/* Conversation Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="w-full">
            {msg.sender === 'user' ? (
              /* User Bubble on the Right */
              <div className="flex justify-end items-start gap-2.5 max-w-2xl ml-auto">
                <div className="flex flex-col items-end">
                  <div className="rounded-2xl bg-gradient-to-r from-[#5638F5] to-[#2388FF] text-white px-5 py-3 text-xs sm:text-sm font-medium shadow-md shadow-[#5638F5]/20 leading-relaxed">
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-[#A8B4CA]/70 mt-1 font-mono">{msg.timestamp}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5638F5] to-[#2388FF] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                  {userProfile.initials}
                </div>
              </div>
            ) : (
              /* AI Response on the Left */
              <div className="flex justify-start items-start gap-3 max-w-full">
                <div className="w-full space-y-3">
                  {/* Sender Header */}
                  <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400 dark:text-[#A8B4CA]">
                    <div className="h-5 w-5 rounded-md overflow-hidden shrink-0 shadow-2xs">
                      <img
                        src="/quoteflow-icon.png"
                        alt="QuoteFlow AI"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">QuoteFlow AI</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Standard or Rich Visual AI Message */}
                  {msg.richPayload && msg.richPayload.isVisualResponse ? (
                    <RichAIMessage
                      payload={msg.richPayload}
                      timestamp={msg.timestamp}
                      onSelectQuestion={(q) => handleSend(q)}
                      onRetry={() => handleSend(msg.text)}
                    />
                  ) : (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] shadow-xs text-xs sm:text-sm text-slate-800 dark:text-[#F5F7FF] leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  )}

                  {/* CASE 1: QUOTE DRAFT PREVIEW (Uncommitted Draft) & EXACT CUSTOMER MATCH */}
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
                      onViewQuote={(quoteId) => router.push(`/quotations/${quoteId}`)}
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
                      onEditQuote={(quoteId) => router.push(`/quotations/${quoteId}`)}
                    />
                  )}

                  {/* CASE 6: QUOTATION SENT CONFIRMATION */}
                  {msg.actionType === 'quote_sent' && (
                    <QuoteCreatedSuccessCard
                      quotation={msg.quotation}
                      sentDetails={msg.sentDetails}
                      onSendEmail={() => handleSend('Send it')}
                      onViewQuote={(quoteId) => router.push(msg.sentDetails?.viewUrl || `/quotations/${quoteId}`)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing / Loading Indicator */}
        {isThinking && (
          <div className="flex items-center gap-3 py-2 text-slate-500 dark:text-[#A8B4CA]">
            <div className="h-6 w-6 rounded-lg overflow-hidden shrink-0 shadow-xs">
              <img src="/quoteflow-icon.png" alt="Thinking" className="h-full w-full object-contain animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#5638F5] dark:text-[#2388FF]" />
              <span>QuoteFlow AI is working...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Composer matching mockup */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-[#263653] bg-white dark:bg-[#101A2D]">
        <div className="flex items-center gap-1.5 sm:gap-2 max-w-4xl mx-auto rounded-full bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#263653] px-2 sm:px-3 py-1.5 shadow-sm focus-within:border-[#5638F5] dark:focus-within:border-[#2388FF] transition-all">
          {/* + Add action button */}
          <button
            type="button"
            onClick={() => handleSend('Draft a quote')}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#101A2D] flex items-center justify-center text-slate-500 dark:text-[#A8B4CA] hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            title="Draft a Quote"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Paperclip Attachment button */}
          <button
            type="button"
            onClick={() => handleSend('Help me import products for a quote')}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#101A2D] flex items-center justify-center text-slate-500 dark:text-[#A8B4CA] hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            title="Attach File"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentPendingPayload?.items?.length > 0
                ? 'Add an item, change price, discount, tax or terms...'
                : 'Ask QuoteFlow AI anything...'
            }
            disabled={isThinking}
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-[#F5F7FF] placeholder-slate-400 px-2 py-1"
          />

          {/* Mic Voice Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
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
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#5638F5] to-[#2388FF] hover:opacity-95 text-white font-semibold shadow-md shadow-[#5638F5]/30 transition-all disabled:opacity-40"
            title="Send"
          >
            {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Inline Add Customer Modal */}
      {showAddCustomerModal && (
        <InlineAddCustomerModal
          searchedTerm={modalSearchedTerm}
          onClose={() => setShowAddCustomerModal(false)}
          onSaveCustomer={handleSaveCustomerAndResume}
          isSaving={isSavingCustomer}
        />
      )}
    </div>
  );
}
