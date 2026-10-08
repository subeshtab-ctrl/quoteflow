'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Send,
  FileText,
  Receipt,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Bot,
} from 'lucide-react';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actionCard?: {
    type: 'quote_draft' | 'invoice_reminder' | 'kpi_summary' | 'customer_lookup';
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
  };
}

const SUGGESTED_PROMPTS = [
  { icon: FileText, text: 'Draft a new quotation', query: 'Draft a standard quotation for client services' },
  { icon: Receipt, text: 'Create an invoice', query: 'Create a new invoice for completed work' },
  { icon: CreditCard, text: 'Check payment status', query: 'Show me all pending and received payments' },
  { icon: TrendingUp, text: 'Sales this month', query: 'What are my total sales and revenue trends this month?' },
  { icon: AlertCircle, text: 'Overdue invoices', query: 'List any overdue invoices requiring follow up' },
  { icon: Users, text: 'Find customer', query: 'Look up customer contact and quotation history' },
];

export function QuoteFlowAiModal() {
  const router = useRouter();
  const { isAiModalOpen, closeAiModal } = useThemeCustomization();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your QuoteFlow Business Copilot. How can I assist you with your quotations, invoices, or customer workflows today?',
    },
  ]);

  if (!isAiModalOpen) return null;

  const handleSend = async (userQuery?: string) => {
    const query = userQuery || input;
    if (!query.trim() || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Simulate smart context response
    setTimeout(() => {
      let aiResponse: Message;
      const q = query.toLowerCase();

      if (q.includes('quote') || q.includes('draft') || q.includes('proposal')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'I can prepare a new quotation draft for you right away. You can specify line items, tax rates, and customer details directly in the editor.',
          actionCard: {
            type: 'quote_draft',
            title: 'New Quotation Draft Ready',
            description: 'Launch the quotation builder with your preset business terms and tax configurations.',
            buttonLabel: 'Open Quotation Builder',
            buttonHref: '/quotations/new',
          },
        };
      } else if (q.includes('invoice') || q.includes('bill')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'To generate a professional tax invoice, you can convert an existing approved quotation with 1-click or start a fresh invoice.',
          actionCard: {
            type: 'invoice_reminder',
            title: 'Create Direct Invoice',
            description: 'Create an invoice with online Razorpay or Bank UPI payment links enabled.',
            buttonLabel: 'Launch Invoice Creator',
            buttonHref: '/invoices/new',
          },
        };
      } else if (q.includes('payment') || q.includes('billing') || q.includes('subscription')) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'You can monitor real-time subscription status, upgrade to QuoteFlow Pro, and review payment gateway settings in Subscription & Billing.',
          actionCard: {
            type: 'kpi_summary',
            title: 'QuoteFlow Pro & Billing',
            description: 'Manage Razorpay plan active status, invoices, and payment receipts.',
            buttonLabel: 'View Billing Overview',
            buttonHref: '/billing',
          },
        };
      } else {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `I've analyzed your workspace. All live documents, invoices, and customer approval workflows are synchronized and operating securely.`,
          actionCard: {
            type: 'customer_lookup',
            title: 'Dashboard Overview',
            description: 'Review live metrics, sales charts, and recent activity.',
            buttonLabel: 'View Dashboard',
            buttonHref: '/dashboard',
          },
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
      setIsThinking(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow AI
                </h3>
                <span className="rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                  Copilot
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Business intelligence & workflow assistant
              </p>
            </div>
          </div>
          <button
            onClick={closeAiModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div className={`space-y-2 max-w-[85%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white font-medium ml-auto'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Optional Action Card */}
                {msg.actionCard && (
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {msg.actionCard.title}
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {msg.actionCard.description}
                    </p>
                    <button
                      onClick={() => {
                        closeAiModal();
                        if (msg.actionCard?.buttonHref) {
                          router.push(msg.actionCard.buttonHref);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] transition-colors"
                    >
                      <span>{msg.actionCard.buttonLabel}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts Pills */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {SUGGESTED_PROMPTS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(p.query)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                >
                  <Icon className="h-3 w-3 text-slate-400" />
                  <span>{p.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your quotes, invoices, or revenue..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
