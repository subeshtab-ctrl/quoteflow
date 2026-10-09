'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SupportTicket, SupportTicketMessage } from '@/types/database';
import {
  MessageSquare,
  Send,
  Paperclip,
  X,
  FileText,
  PhoneCall,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupportChatFloatingWidgetProps {
  ticket: SupportTicket;
  onClose: () => void;
  senderType: 'business' | 'developer';
  senderName?: string;
  senderUserId?: string;
  onTicketUpdated?: (updated: SupportTicket) => void;
}

export function SupportChatFloatingWidget({
  ticket: initialTicket,
  onClose,
  senderType,
  senderName = 'You',
  senderUserId,
  onTicketUpdated,
}: SupportChatFloatingWidgetProps) {
  const [ticket, setTicket] = useState<SupportTicket>(initialTicket);
  const [messages, setMessages] = useState<SupportTicketMessage[]>(initialTicket.messages || []);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state if initialTicket changes
  useEffect(() => {
    setTicket(initialTicket);
    if (initialTicket.messages) {
      setMessages(initialTicket.messages);
    }
  }, [initialTicket]);

  // Scroll to bottom on initial load and when message count increases
  const prevCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevCountRef.current || prevCountRef.current === 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length]);

  // Silent Background Polling (No UI flicker or reset)
  useEffect(() => {
    let isMounted = true;
    const pollTicket = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      try {
        const res = await fetch(`/api/support/tickets/${ticket.id}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.ticket && isMounted) {
            setTicket(json.ticket);
            if (json.ticket.messages) {
              setMessages(json.ticket.messages);
            }
            onTicketUpdated?.(json.ticket);
          }
        }
      } catch {
        // Silent background fallback
      }
    };

    const interval = setInterval(pollTicket, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ticket.id, onTicketUpdated]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Attachment must be under 10MB.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ticket_id', ticket.id);

      const res = await fetch('/api/support/attachments', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setAttachments((prev) => [
        ...prev,
        {
          id: data.attachment?.id || `att_${Date.now()}`,
          storage_path: data.storage_path || data.attachment?.storage_path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        },
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if ((!text && attachments.length === 0) || isSending) return;

    try {
      setIsSending(true);
      const res = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text || '(Attachment enclosed)',
          attachments,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send message');

      if (json.message) {
        setMessages((prev) => [...prev, json.message]);
      }
      setInputText('');
      setAttachments([]);

      // Trigger immediate silent poll
      const refRes = await fetch(`/api/support/tickets/${ticket.id}`, { cache: 'no-store' });
      if (refRes.ok) {
        const refJson = await refRes.json();
        if (refJson.ticket) {
          setTicket(refJson.ticket);
          setMessages(refJson.ticket.messages || []);
          onTicketUpdated?.(refJson.ticket);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setStatusUpdating(true);
      const res = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (res.ok && json.ticket) {
        setTicket(json.ticket);
        onTicketUpdated?.(json.ticket);
      }
    } catch {
      // Silent error
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      id="support-chat-popup"
      className="fixed bottom-4 right-4 z-50 w-[350px] sm:w-[385px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col"
      style={{ maxHeight: 'calc(100vh - 5rem)' }}
    >
      {/* Header Bar - Identical to Client Portal Chat Header */}
      <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-900 px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white truncate">
                {ticket.ticket_number}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[210px]" title={ticket.subject}>
              {ticket.subject}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Close Chat"
            aria-label="Close support chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Developer Admin Status Control Bar */}
      {senderType === 'developer' && (
        <div className="bg-slate-950 px-3.5 py-1.5 border-b border-slate-800 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-medium">Status:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={statusUpdating}
              onClick={() => handleUpdateStatus('in_process')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                ticket.status === 'in_process'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              In Process
            </button>
            <button
              type="button"
              disabled={statusUpdating}
              onClick={() => handleUpdateStatus('waiting_for_customer')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                ticket.status === 'waiting_for_customer'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Waiting
            </button>
            <button
              type="button"
              disabled={statusUpdating}
              onClick={() => handleUpdateStatus('resolved')}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                ticket.status === 'resolved' || ticket.status === 'closed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Resolved ✓
            </button>
          </div>
        </div>
      )}

      {/* Customer Status Banner */}
      {senderType === 'business' && (
        <div className="bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Support Status:</span>
          <span
            className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
              ticket.status === 'resolved' || ticket.status === 'closed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : ticket.status === 'waiting_for_customer'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
            }`}
          >
            {ticket.status === 'resolved' ? 'Solved ✓' : ticket.status.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Callback Requested Notice */}
      {ticket.callback_requested && (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 px-3.5 py-2 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
            <PhoneCall className="h-3.5 w-3.5 text-indigo-600" />
            <span>Call Back: {ticket.callback_phone || 'Customer Phone'}</span>
          </div>
          {ticket.callback_phone && (
            <a
              href={`tel:${ticket.callback_phone}`}
              className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
            >
              Call
            </a>
          )}
        </div>
      )}

      {/* Chat Messages Scroll Container */}
      <div className="p-3.5 flex-1 overflow-y-auto space-y-2.5 h-72 min-h-[260px] bg-slate-50 dark:bg-slate-950/50">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No messages yet. Send a message below to start chatting with support.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe =
              senderType === 'business'
                ? msg.sender_type === 'business'
                : msg.sender_type === 'developer';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                  <span
                    className={`text-[10px] font-bold ${
                      isMe
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {isMe ? `${msg.sender_name} (You)` : msg.sender_name}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {formatTime(msg.created_at)}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                  }`}
                >
                  {msg.message && <div className="whitespace-pre-wrap">{msg.message}</div>}

                  {/* Attachments inside message bubble */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-700 space-y-1.5">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                          <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                          <span className="truncate flex-1">{att.file_name}</span>
                          {att.storage_path && (
                            <a
                              href={att.storage_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] underline hover:opacity-80"
                            >
                              View
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Staging Bar */}
      {attachments.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5 shrink-0">
          {attachments.map((att, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              <FileText className="h-3 w-3 text-indigo-500" />
              <span className="truncate max-w-[120px]">{att.file_name}</span>
              <button
                type="button"
                onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Action Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shrink-0"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,application/pdf"
        />

        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Attach Screenshot / PDF"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            senderType === 'developer'
              ? 'Type reply to customer...'
              : 'Type reply to support...'
          }
          className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        <Button
          type="submit"
          size="sm"
          disabled={(!inputText.trim() && attachments.length === 0) || isSending}
          className="h-8 w-8 p-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 flex items-center justify-center"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
