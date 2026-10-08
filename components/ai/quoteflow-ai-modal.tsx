'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ExternalLink,
  Edit,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useThemeCustomization } from '@/lib/theme/theme-customization-context';
import { Quotation } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actionType?: 'quote_draft' | 'quote_sent' | 'payment_report' | 'quotation_report' | 'sales_report' | 'missing_contact' | 'general_help';
  quotation?: Quotation;
  sentDetails?: {
    quoteNumber: string;
    customerName: string;
    amount: number;
    currency: string;
    status: string;
    viewUrl: string;
  };
  reportData?: any;
}

const SUGGESTED_PROMPTS = [
  { icon: FileText, text: 'Draft a quote', query: 'Create a quote for Glass 500 and Battery 600 for ABC Customer' },
  { icon: CreditCard, text: 'Payment report', query: 'Show payment report' },
  { icon: AlertCircle, text: 'Overdue invoices', query: 'Show overdue invoices' },
  { icon: TrendingUp, text: 'Sales this month', query: 'Show this month\'s sales' },
  { icon: FileText, text: 'Quotation report', query: 'Show quotation report' },
  { icon: Users, text: 'Pending payments', query: 'Which customers haven\'t paid?' },
];

export function QuoteFlowAiModal() {
  const router = useRouter();
  const { isAiModalOpen, closeAiModal } = useThemeCustomization();
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeDraftQuote, setActiveDraftQuote] = useState<Quotation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your action-oriented QuoteFlow Copilot. Tell me what to create, send, or analyze and I will perform it directly:',
      actionType: 'general_help',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          activeDraftId: activeDraftQuote?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      if (data.quotation && data.actionType === 'quote_draft') {
        setActiveDraftQuote(data.quotation);
      } else if (data.actionType === 'quote_sent') {
        setActiveDraftQuote(null); // Quote sent, clear active draft
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.replyText,
        actionType: data.actionType,
        quotation: data.quotation,
        sentDetails: data.sentDetails,
        reportData: data.reportData,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl flex flex-col h-[650px] max-h-[92vh] overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  QuoteFlow Copilot
                </h3>
                <span className="rounded-full bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                  Live Actions
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Action-oriented quotation creator & live business intelligence
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
              <div className={`space-y-2.5 max-w-[88%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white font-medium ml-auto'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  {msg.text}
                </div>

                {/* 1. Interactive Quotation Draft Card */}
                {msg.actionType === 'quote_draft' && msg.quotation && (
                  <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900 p-4 shadow-sm space-y-3 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Quotation Draft
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold">
                          {msg.quotation.quotation_number}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        Status: <strong className="text-amber-600 dark:text-amber-400">Draft</strong>
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      <span>Customer: </span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {msg.quotation.customer?.name || 'Customer'}
                      </strong>
                    </div>

                    {/* Line Items List */}
                    <div className="space-y-1.5 py-1">
                      {(msg.quotation.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {item.description}
                          </span>
                          <div className="flex items-center gap-4 text-slate-500">
                            <span>Qty {item.quantity}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {formatCurrency(item.unit_price, msg.quotation?.currency || 'INR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals Summary */}
                    <div className="pt-2 space-y-1 text-[11px] border-t border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatCurrency(msg.quotation.subtotal, msg.quotation.currency)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tax ({msg.quotation.tax_rate}%)</span>
                        <span>{formatCurrency(msg.quotation.tax_amount, msg.quotation.currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <span>Grand Total</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-black">
                          {formatCurrency(msg.quotation.grand_total, msg.quotation.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: [Edit Quote] and [Confirm & Send] */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => {
                          closeAiModal();
                          router.push(`/quotations/${msg.quotation?.id}`);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Quote</span>
                      </button>

                      <button
                        onClick={() => handleSend('Send it')}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-[11px] shadow-sm transition-all"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Confirm & Send</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Quotation Sent Confirmation Card */}
                {msg.actionType === 'quote_sent' && msg.sentDetails && (
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 shadow-sm space-y-3 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Quotation Sent Successfully</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-850 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <div>
                        <span className="text-slate-400 block">Quote #</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-mono">
                          {msg.sentDetails.quoteNumber}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Customer</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {msg.sentDetails.customerName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Amount</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                          {formatCurrency(msg.sentDetails.amount, msg.sentDetails.currency as any)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Status</span>
                        <strong className="text-indigo-600 dark:text-indigo-400">
                          {msg.sentDetails.status}
                        </strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        closeAiModal();
                        router.push(msg.sentDetails?.viewUrl || '/quotations');
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                    >
                      <span>View Quote</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* 3. Payment Summary Report Card */}
                {msg.actionType === 'payment_report' && msg.reportData && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                        {msg.reportData.title}
                      </span>
                      <CreditCard className="h-4 w-4 text-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                          Received Payments
                        </span>
                        <span className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                          {formatCurrency(msg.reportData.received, msg.reportData.currency)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                        <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                          Pending Payments
                        </span>
                        <span className="text-sm font-black text-amber-800 dark:text-amber-300">
                          {formatCurrency(msg.reportData.pending, msg.reportData.currency)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
                        <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                          Overdue Payments
                        </span>
                        <span className="text-sm font-black text-rose-800 dark:text-rose-300">
                          {formatCurrency(msg.reportData.overdue, msg.reportData.currency)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block">
                          Total Invoiced
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(msg.reportData.totalInvoiced, msg.reportData.currency)}
                        </span>
                      </div>
                    </div>

                    {msg.reportData.unpaidList?.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Outstanding Invoices:
                        </span>
                        {msg.reportData.unpaidList.map((inv: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                            <span>{inv.customer} ({inv.invoiceNumber})</span>
                            <span className={inv.isOverdue ? 'text-rose-600 font-bold' : 'font-medium'}>
                              {formatCurrency(inv.amount, msg.reportData.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Quotation Summary Report Card */}
                {msg.actionType === 'quotation_report' && msg.reportData && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                        {msg.reportData.title}
                      </span>
                      <FileText className="h-4 w-4 text-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block">Total Quotes</span>
                        <span className="text-base font-black text-slate-900 dark:text-slate-100">
                          {msg.reportData.totalQuotes}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[10px] text-emerald-600 block">Approved</span>
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                          {msg.reportData.approvedCount}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                        <span className="text-[10px] text-amber-600 block">Pending</span>
                        <span className="text-base font-black text-amber-700 dark:text-amber-300">
                          {msg.reportData.pendingCount}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-[10px] text-indigo-600 block">Win Rate</span>
                        <span className="text-base font-black text-indigo-700 dark:text-indigo-300">
                          {msg.reportData.conversionRate}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Monthly Sales Report Card */}
                {msg.actionType === 'sales_report' && msg.reportData && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                        {msg.reportData.title}
                      </span>
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase block">
                          This Month Sales
                        </span>
                        <span className="text-lg font-black text-indigo-900 dark:text-indigo-200">
                          {formatCurrency(msg.reportData.thisMonthSales, msg.reportData.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Approved Quotes</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {msg.reportData.approvedQuotesCount}
                        </span>
                      </div>
                    </div>
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
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3.5 py-2.5 rounded-2xl">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span>Working on your request...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors shadow-2xs"
                >
                  <Icon className="h-3 w-3 text-slate-400" />
                  <span>{p.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
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
              placeholder={
                activeDraftQuote
                  ? `Active Draft ${activeDraftQuote.quotation_number} selected. Try: "Change Glass to 600", "Add 2 batteries", "Send it"`
                  : "e.g. 'Create a quote for Glass 500 and Battery 600 for ABC Customer'"
              }
              className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
