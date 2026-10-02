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
  Plus,
  Search,
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
  Download,
} from 'lucide-react';

export function SupportView({ initialTickets }: { initialTickets?: SupportTicket[] }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets || []);
  const [isLoading, setIsLoading] = useState(!initialTickets);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Create Ticket Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>('Technical Issue');
  const [newPriority, setNewPriority] = useState<SupportTicketPriority>('Normal');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachments, setNewAttachments] = useState<any[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Active Ticket Detail / Chat Modal
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingActiveTicket, setIsLoadingActiveTicket] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setTickets(json.tickets || []);
      }
    } catch {
      console.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [selectedStatus, selectedCategory, searchQuery]);

  const loadTicketDetails = async (ticketId: string) => {
    try {
      setIsLoadingActiveTicket(true);
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      const json = await res.json();
      if (res.ok) {
        setActiveTicket(json.ticket);
      }
    } catch {
      console.error('Error loading ticket details');
    } finally {
      setIsLoadingActiveTicket(false);
    }
  };

  const handleFileUpload = async (file: File, isReply = false) => {
    if (!file) return;
    try {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/support/attachments', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload file');

      if (isReply) {
        setReplyAttachments((prev) => [...prev, json.attachment]);
      } else {
        setNewAttachments((prev) => [...prev, json.attachment]);
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) return;

    try {
      setIsCreatingTicket(true);
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newSubject,
          category: newCategory,
          priority: newPriority,
          description: newDescription,
          attachments: newAttachments,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create ticket');

      setCreateModalOpen(false);
      setNewSubject('');
      setNewDescription('');
      setNewAttachments([]);
      await fetchTickets();
      if (json.ticket) {
        loadTicketDetails(json.ticket.id);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyMessage.trim()) return;
    try {
      setIsSendingReply(true);
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyMessage,
          attachments: replyAttachments,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send message');

      setReplyMessage('');
      setReplyAttachments([]);
      await loadTicketDetails(activeTicket.id);
      await fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Error sending reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadTicketDetails(activeTicket.id);
        await fetchTickets();
      }
    } catch {
      alert('Error updating ticket status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <LifeBuoy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Developer Support & Help Desk</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Direct communication bridge with our engineering support staff. Submit issues, track bug fixes, or request billing assistance.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 shadow-xs shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Support Ticket</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by #ID, subject, or description..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_customer">Waiting on You</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            <option value="Billing">Billing</option>
            <option value="Subscription">Subscription</option>
            <option value="Quote">Quote</option>
            <option value="Invoice">Invoice</option>
            <option value="Technical Issue">Technical Issue</option>
            <option value="Bug Report">Bug Report</option>
            <option value="Feature Request">Feature Request</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs">Loading tickets...</p>
          </div>
        ) : tickets.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => loadTicketDetails(t.id)}
                className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {t.ticket_number}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                      {t.category}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : t.priority === 'High'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {t.subject}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {t.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                      t.status === 'open'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : t.status === 'in_progress'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : t.status === 'waiting_for_customer'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : t.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {t.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            <MessageSquare className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No support tickets found</p>
            <p className="mt-1">Need help? Open a new ticket to speak directly with our engineering staff.</p>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {createModalOpen && (
        <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Open Support Ticket">
          <form onSubmit={handleCreateTicket} className="space-y-4 p-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Brief summary of the issue or inquiry..."
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
                >
                  <option value="Billing">Billing</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Quote">Quote</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Customer Portal">Customer Portal</option>
                  <option value="Payment">Payment</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as SupportTicketPriority)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs"
                >
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Detailed Description</label>
              <Textarea
                rows={4}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Please describe the steps to reproduce or details of your request..."
                required
                className="text-xs"
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Attachments (Screenshots / Documents)</label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f, false);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="gap-2 text-xs"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>{isUploadingFile ? 'Uploading...' : 'Attach File (Max 10MB)'}</span>
              </Button>

              {newAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newAttachments.map((att, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-200"
                    >
                      <FileText className="h-3 w-3 text-indigo-500" />
                      <span>{att.file_name}</span>
                      <button
                        type="button"
                        onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingTicket || isUploadingFile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isCreatingTicket ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                <span>Submit Ticket</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Ticket Details & Chat Modal */}
      {activeTicket && (
        <Modal
          isOpen={Boolean(activeTicket)}
          onClose={() => setActiveTicket(null)}
          title={`Ticket ${activeTicket.ticket_number}`}
        >
          <div className="space-y-4 p-4 text-xs max-h-[80vh] flex flex-col">
            {/* Ticket Header Details */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {activeTicket.subject}
                </span>
                <span className="font-semibold text-slate-400 text-[11px]">
                  {activeTicket.category} • {activeTicket.priority} Priority
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Status:</span>
                  <Badge variant="outline" className="font-bold uppercase text-[10px]">
                    {activeTicket.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {activeTicket.status !== 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] text-emerald-600 hover:text-emerald-700 border-emerald-300"
                      onClick={() => handleUpdateStatus('resolved')}
                    >
                      Mark Resolved
                    </Button>
                  )}
                  {activeTicket.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] text-slate-600 hover:text-slate-700"
                      onClick={() => handleUpdateStatus('closed')}
                    >
                      Close Ticket
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 min-h-[200px] max-h-[350px]">
              {activeTicket.messages?.map((m) => {
                const isDev = m.sender_type === 'developer';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isDev ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        {m.sender_name || (isDev ? 'QuoteFlow Engineer' : 'Customer')}
                      </span>
                      <span>• {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-2xs leading-relaxed ${
                        isDev
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                          : 'bg-indigo-600 text-white rounded-tr-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attachments in thread */}
            {activeTicket.attachments && activeTicket.attachments.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Attachments:</span>
                <div className="flex flex-wrap gap-2">
                  {activeTicket.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.storage_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] hover:bg-slate-200 transition-colors"
                    >
                      <Download className="h-3 w-3 text-indigo-500" />
                      <span>{att.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Input */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <Textarea
                rows={2}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response to developer support..."
                className="text-xs"
              />
              <div className="flex items-center justify-between">
                <input
                  type="file"
                  ref={replyFileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, true);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => replyFileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="h-7 text-xs gap-1.5 text-slate-500"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Attach</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyMessage.trim()}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
                >
                  {isSendingReply ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Send Reply</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
