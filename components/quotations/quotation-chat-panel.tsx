'use client';

import React, { useEffect, useState, useRef } from 'react';
import { QuotationChatMessage } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, CheckCheck, ShieldCheck, Lock, FileText, Download, Paperclip } from 'lucide-react';

interface QuotationChatPanelProps {
  quotationId: string;
  quotationNumber: string;
  customerName?: string;
}

export function QuotationChatPanel({
  quotationId,
  quotationNumber,
  customerName,
}: QuotationChatPanelProps) {
  const [messages, setMessages] = useState<QuotationChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);

  const fetchAndMarkRead = async () => {
    try {
      const res = await fetch(`/api/quotations/${quotationId}/chat?markRead=true`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          const newCount = data.messages.length;
          const hadNewMessage = newCount > prevCountRef.current;
          prevCountRef.current = newCount;
          setMessages(data.messages);
          if (hadNewMessage) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }
        }
      }
    } catch (err) {
      console.error('Error loading quotation chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndMarkRead();
    const interval = setInterval(fetchAndMarkRead, 2500);
    return () => clearInterval(interval);
  }, [quotationId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#chat') {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch(`/api/quotations/${quotationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplyText('');
        if (Array.isArray(data.messages)) {
          prevCountRef.current = data.messages.length;
          setMessages(data.messages);
        } else {
          await fetchAndMarkRead();
        }
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      ref={panelRef}
      id="chat"
      className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden scroll-mt-6"
    >
      <div className="border-b border-slate-100 bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Customer Chat ({messages.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Direct chat for {quotationNumber} {customerName ? `with ${customerName}` : ''}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="max-h-72 overflow-y-auto space-y-2.5 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading chat messages...</div>
          ) : messages.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No messages from customer yet. You can send a message below.
            </div>
          ) : (
            messages.map((msg) => {
              const isStaff = msg.sender_role === 'STAFF';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className={`text-[11px] font-bold ${
                        isStaff ? 'text-indigo-600' : 'text-emerald-700'
                      }`}
                    >
                      {msg.sender_name} {isStaff ? '(Team)' : '(Customer)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(msg.created_at)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                      isStaff
                        ? 'bg-slate-900 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-emerald-200 rounded-bl-xs'
                    }`}
                  >
                    <div>{msg.message}</div>
                    {msg.attachment && (
                      <div className={`mt-2 pt-2 border-t ${isStaff ? 'border-white/20' : 'border-slate-200'}`}>
                        {msg.attachment.deleted_at ? (
                          <div
                            className={`flex items-start gap-1.5 p-2 rounded-lg text-[10px] leading-snug ${
                              isStaff
                                ? 'bg-white/10 text-amber-300'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                              {msg.attachment.deleted_reason ||
                                'Payment screenshot automatically deleted after company verification.'}
                            </span>
                          </div>
                        ) : msg.attachment.url ? (
                          <div className="space-y-1.5">
                            {msg.attachment.is_payment_proof && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" /> Payment Screenshot
                              </span>
                            )}
                            <a
                              href={msg.attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                            >
                              {msg.attachment.type?.startsWith('image/') || msg.attachment.url.startsWith('data:image/') ? (
                                <img
                                  src={msg.attachment.url}
                                  alt={msg.attachment.name || 'Payment screenshot'}
                                  className="max-h-48 max-w-full rounded object-contain bg-slate-100"
                                />
                              ) : (
                                <div className="flex items-center gap-2 p-2 bg-slate-100 text-xs text-slate-800 rounded">
                                  <FileText className="h-4 w-4 text-indigo-600" />
                                  <span className="truncate font-medium">{msg.attachment.name}</span>
                                </div>
                              )}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {isStaff && (
                      <div
                        className="mt-1 flex items-center justify-end gap-1"
                        title={msg.is_read ? 'Read by customer' : 'Delivered'}
                      >
                        <span
                          className={`text-[9px] font-medium ${
                            msg.is_read ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {msg.is_read ? 'Read' : 'Delivered'}
                        </span>
                        <CheckCheck
                          className={`h-3.5 w-3.5 ${
                            msg.is_read ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendReply} className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply to the customer..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSending}
            disabled={!replyText.trim() || isSending}
            className="px-3.5"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Reply
          </Button>
        </form>
      </div>
    </div>
  );
}
