'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AiProspectLead } from '@/types/growth-assistant';

interface OutreachApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: AiProspectLead | null;
  defaultChannel?: 'EMAIL' | 'WHATSAPP';
  customTitle?: string;
  initialMessage?: string;
  onSuccess?: () => void;
}

export function OutreachApprovalModal({
  isOpen,
  onClose,
  lead,
  defaultChannel = 'EMAIL',
  customTitle,
  initialMessage,
  onSuccess,
}: OutreachApprovalModalProps) {
  if (!isOpen) return null;

  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>(defaultChannel);
  const [recipient, setRecipient] = useState(
    channel === 'EMAIL'
      ? lead?.contactEmail || 'prospect@business.com'
      : lead?.contactPhone || '+91 98765 43210'
  );
  const [subject, setSubject] = useState(
    `Introduction to Professional Services from QuoteFlow Partner`
  );
  const [messageBody, setMessageBody] = useState(
    initialMessage ||
      `Hi ${lead?.contactPerson || lead?.businessName || 'there'},\n\nI noticed your business in ${
        lead?.city || 'our service area'
      } and wanted to reach out regarding our commercial solutions. We specialize in high-reliability delivery with transparent pricing and rapid turnaround.\n\nWould you be open to a quick 5-minute conversation or receiving a customized quote proposal?\n\nBest regards,\nBusiness Owner`
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setError(null);
    try {
      // In production, dispatch via verified email or WhatsApp API
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSentSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to send outreach message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {customTitle || 'Human-Approved Outreach Draft'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Review and approve before sending to ensure compliance and personalization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3.5 flex-1 overflow-y-auto">
          {sentSuccess ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Message Dispatched!</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Outreach approved and sent successfully.
              </p>
            </div>
          ) : (
            <>
              {/* Channel Selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChannel('EMAIL')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    channel === 'EMAIL'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('WHATSAPP')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    channel === 'WHATSAPP'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Recipient {channel === 'EMAIL' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Subject (for email) */}
              {channel === 'EMAIL' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Message Content (Editable)
                </label>
                <textarea
                  rows={6}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  QuoteFlow guarantees human verification: No automated messages are dispatched without your explicit one-click confirmation.
                </span>
              </div>
            </>
          )}

          {error && (
            <div className="p-2.5 rounded-lg text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {!sentSuccess && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !messageBody.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Sending...' : 'Approve & Send Message'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
