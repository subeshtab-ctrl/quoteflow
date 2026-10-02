'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SupportTicket,
  SupportTicketMessage,
  SupportTicketCategory,
  SupportTicketPriority,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  LifeBuoy,
  MessageSquare,
  Paperclip,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  Loader2,
  X,
  PhoneCall,
  Download,
  Plus,
  ArrowLeft,
  Headphones,
} from 'lucide-react';

interface SupportHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: SupportTicketCategory;
  initialTicketId?: string | null;
}

export function SupportHelpModal({
  isOpen,
  onClose,
  defaultCategory = 'Billing',
  initialTicketId,
}: SupportHelpModalProps) {
  // Modal view: 'form' | 'chat' | 'list'
  const [view, setView] = useState<'form' | 'chat' | 'list'>('form');

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>(defaultCategory);
  const [priority, setPriority] = useState<SupportTicketPriority>('Normal');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Call Back Option
  const [requestCallback, setRequestCallback] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');

  // Active Ticket & Chat State
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [ticketAttachments, setTicketAttachments] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch recent tickets on mount or open
  const loadRecentTickets = async () => {
    try {
      setIsLoadingTickets(true);
      const res = await fetch('/api/support/tickets?limit=5');
      const data = await res.json();
      if (res.ok && data.tickets) {
        setRecentTickets(data.tickets);
      }
    } catch {}
    finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRecentTickets();
      if (initialTicketId) {
        fetchTicketDetails(initialTicketId);
      } else {
        setView('form');
      }
    }
  }, [isOpen, initialTicketId]);

  // Scroll chat to bottom
  useEffect(() => {
    if (view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTicket?.messages, view]);

  // Fetch specific ticket details
  const fetchTicketDetails = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await res.json();
      if (res.ok && data.ticket) {
        setActiveTicket(data.ticket);
        setView('chat');
      }
    } catch {
      setErrorMsg('Failed to load ticket details.');
    }
  };

  // Upload file attachment
  const handleFileUpload = async (file: File, isReply = false) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/support/attachments', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      if (isReply) {
        setTicketAttachments((prev) => [...prev, data.attachment]);
      } else {
        setAttachments((prev) => [...prev, data.attachment]);
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Form Submission
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setErrorMsg('Please enter a ticket subject.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please describe your issue or question.');
      return;
    }
    if (requestCallback && !callbackPhone.trim()) {
      setErrorMsg('Please provide a valid phone number for the call back.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
          attachments,
          callback_requested: requestCallback,
          callback_phone: requestCallback ? callbackPhone.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create support ticket.');
      }

      // Success: open ticket in chat view
      setActiveTicket(data.ticket);
      setView('chat');
      // Reset form
      setSubject('');
      setDescription('');
      setAttachments([]);
      setRequestCallback(false);
      setCallbackPhone('');
      await loadRecentTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sending reply inside chat
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || (!chatMessage.trim() && ticketAttachments.length === 0)) return;

    try {
      setIsSendingReply(true);
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatMessage.trim() || 'Attached files for review',
          attachments: ticketAttachments,
        }),
      });

      if (res.ok) {
        setChatMessage('');
        setTicketAttachments([]);
        await fetchTicketDetails(activeTicket.id);
      }
    } catch {
      alert('Error sending reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const isSolved = activeTicket?.status === 'resolved' || activeTicket?.status === 'closed';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
    >
      <div className="flex flex-col max-h-[85vh] -mt-2">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Billing Support & Help Desk</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold">
                  Live Response
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct developer & billing assistance with instant ticket tracking
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setView('form')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === 'form'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setView('list');
              loadRecentTickets();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Support History & Chat</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                view === 'list'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {recentTickets.length}
            </span>
          </button>

          {view === 'chat' && activeTicket && (
            <button
              type="button"
              onClick={() => setView('list')}
              className="ml-auto flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Tickets</span>
            </button>
          )}
        </div>

        {/* VIEW 1: TICKET CREATION FORM */}
        {view === 'form' && (
          <form onSubmit={handleSubmitTicket} className="space-y-4 pt-4 overflow-y-auto pr-1">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Billing">Billing & Subscription</option>
                  <option value="Payment">Payment & Razorpay Issue</option>
                  <option value="Invoice">Tax Invoice Question</option>
                  <option value="Quote">Quotation System</option>
                  <option value="Technical Issue">Technical Assistance</option>
                  <option value="Other">Other Inquiry</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High (Impacting Operations)</option>
                  <option value="Urgent">Urgent (Payment / Blocker)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ticket Subject
              </label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Inquiring about ₹99 promotional plan / Payment receipt"
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Issue Description
              </label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide specific details so our development and billing team can resolve it immediately..."
                required
                className="text-xs resize-none"
              />
            </div>

            {/* Attachment Uploader */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <span>Attachments (Screenshots / Invoices)</span>
                </label>
                <span className="text-[11px] text-slate-400">Max 10MB per file</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs gap-1.5"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                  )}
                  <span>Upload File</span>
                </Button>

                {attachments.map((att, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <FileText className="h-3 w-3 text-indigo-500" />
                    <span className="max-w-[150px] truncate">{att.file_name}</span>
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
            </div>

            {/* Call Back Option */}
            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requestCallback}
                  onChange={(e) => setRequestCallback(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <PhoneCall className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Request a Phone Call Back</span>
                </div>
              </label>

              {requestCallback && (
                <div className="pt-1 space-y-1.5 animate-in fade-in duration-200">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    A QuoteFlow support representative will call your number directly to assist you.
                  </p>
                  <Input
                    type="tel"
                    value={callbackPhone}
                    onChange={(e) => setCallbackPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    required={requestCallback}
                    className="text-xs bg-white dark:bg-slate-900"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs gap-2 shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Ticket & Open Chat</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* VIEW 2: THREADED CHAT & TICKET STATUS */}
        {view === 'chat' && activeTicket && (
          <div className="flex flex-col flex-1 pt-3 min-h-[380px] max-h-[60vh]">
            {/* Ticket Header & Status Banner */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 mb-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {activeTicket.ticket_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[280px]">
                    {activeTicket.subject}
                  </span>
                </div>

                {/* Status Indicator */}
                <div>
                  {isSolved ? (
                    <Badge className="bg-emerald-600 text-white text-xs gap-1.5 font-bold shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Issue Solved</span>
                    </Badge>
                  ) : activeTicket.status === 'in_progress' ? (
                    <Badge className="bg-amber-500 text-white text-xs gap-1">
                      <Clock className="h-3 w-3" />
                      <span>In Progress</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-indigo-400 text-indigo-600 text-xs">
                      Open / Assigned
                    </Badge>
                  )}
                </div>
              </div>

              {/* Call Back Badge if requested */}
              {activeTicket.callback_requested && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                  <span>Call Back Requested: <strong>{activeTicket.callback_phone}</strong> (Support team alerted)</span>
                </div>
              )}

              {/* Solved Banner */}
              {isSolved && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>
                    <strong>Resolved:</strong> This ticket has been marked solved by the developer administration.
                  </span>
                </div>
              )}
            </div>

            {/* Chat Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 py-2">
              {activeTicket.messages?.map((msg) => {
                const isSupport = msg.sender_type === 'developer' || msg.sender_type === 'system';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSupport ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      {isSupport ? (
                        <>
                          <ShieldCheck className="h-3 w-3 text-indigo-500" />
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {msg.sender_name || 'Developer Support'}
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{msg.sender_name || 'You'}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isSupport
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                          : 'bg-indigo-600 text-white rounded-tr-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/50 space-y-1">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.storage_path}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-[11px] underline opacity-90 hover:opacity-100"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="truncate">{att.file_name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Reply Input */}
            <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <input
                type="file"
                ref={chatFileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0], true);
                }}
                className="hidden"
              />

              {ticketAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {ticketAttachments.map((att, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300"
                    >
                      <Paperclip className="h-2.5 w-2.5" />
                      <span className="max-w-[120px] truncate">{att.file_name}</span>
                      <button
                        type="button"
                        onClick={() => setTicketAttachments(ticketAttachments.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => chatFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-2.5 text-slate-500"
                  title="Attach file"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>

                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={isSolved ? 'Add follow-up message to this resolved ticket...' : 'Type a message to support engineer...'}
                  className="text-xs"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSendingReply || (!chatMessage.trim() && ticketAttachments.length === 0)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3"
                >
                  {isSendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 3: RECENT TICKETS LIST */}
        {view === 'list' && (
          <div className="pt-4 space-y-3 overflow-y-auto max-h-[60vh]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Support Tickets
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('form')}
                className="text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Create New</span>
              </Button>
            </div>

            {isLoadingTickets ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading your tickets...
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No tickets submitted yet.
              </div>
            ) : (
              recentTickets.map((t) => {
                const solved = t.status === 'resolved' || t.status === 'closed';
                return (
                  <div
                    key={t.id}
                    onClick={() => fetchTicketDetails(t.id)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-900 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {t.ticket_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {t.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{t.category}</span>
                        <span>•</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        {t.callback_requested && (
                          <span className="text-indigo-500 flex items-center gap-1">
                            <PhoneCall className="h-2.5 w-2.5" /> Call Requested
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {solved ? (
                        <Badge className="bg-emerald-600 text-white text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Solved</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-indigo-400 text-indigo-600 text-xs">
                          {t.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
