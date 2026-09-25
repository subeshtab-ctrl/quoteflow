'use client';

import React, { useEffect, useState, useRef } from 'react';
import { QuotationChatMessage } from '@/types/database';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send } from 'lucide-react';

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

  const fetchAndMarkRead = async () => {
    try {
      const res = await fetch(`/api/quotations/${quotationId}/chat?markRead=true`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
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
    const interval = setInterval(fetchAndMarkRead, 8000);
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
          setMessages(data.messages);
        } else {
          await fetchAndMarkRead();
        }
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Read
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="max-h-80 overflow-y-auto space-y-2.5 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
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
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-emerald-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.message}
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
