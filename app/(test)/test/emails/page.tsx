'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  FlaskConical,
  Trash2,
  Eye,
  X,
  RefreshCw,
  FileText,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TestEmailRecord } from '@/types/database';

const docTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  QUOTE: { label: 'Quote Sent', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  INVOICE: { label: 'Invoice', icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  APPROVAL: { label: 'Approval', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  REJECTION: { label: 'Rejection', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  REMINDER: { label: 'Reminder', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  PORTAL_INVITE: { label: 'Portal Invite', icon: Mail, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
};

export default function TestEmailsPage() {
  const [emails, setEmails] = useState<TestEmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TestEmailRecord | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/emails?limit=100');
      const data = await res.json();
      setEmails(data.emails || []);
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const clearEmails = async () => {
    if (!confirm('Clear all simulated emails for this organisation? This cannot be undone.')) return;
    setClearing(true);
    try {
      await fetch('/api/test/emails', { method: 'DELETE' });
      setEmails([]);
      setSelected(null);
    } catch {}
    setClearing(false);
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-5 w-5 text-amber-600" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Simulated Emails
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Emails that would be sent in live mode are captured here instead. Real recipients never receive anything.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadEmails} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {emails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearEmails}
              disabled={clearing}
              className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 p-4">
        <div className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-400">
            <strong>Sandbox Guarantee:</strong> These emails were <em>never actually sent</em>. In test mode, all outbound
            emails are intercepted and logged here so you can review them safely. Switch to live mode to send real emails.
          </p>
        </div>
      </div>

      {/* Two-column layout: list + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
        {/* Email List */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
              Loading...
            </div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No simulated emails yet</p>
              <p className="text-xs text-slate-400 mt-1">Create a test quotation and set it to "Sent" to capture the first simulated email.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {emails.map((email) => {
                const cfg = docTypeConfig[email.document_type] || docTypeConfig.QUOTE;
                const Icon = cfg.icon;
                const isSelected = selected?.id === email.id;
                return (
                  <button
                    key={email.id}
                    onClick={() => setSelected(email)}
                    className={`w-full flex items-start gap-3 p-4 text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{email.subject}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">To: {email.to_email}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(email.created_at)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Email Preview */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col">
          {selected ? (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{selected.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    To: {selected.to_name ? `${selected.to_name} <${selected.to_email}>` : selected.to_email}
                  </p>
                  <p className="text-xs text-slate-400">
                    Document: {selected.document_number} • {formatTime(selected.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-3 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* HTML Preview */}
              <div className="flex-1 overflow-auto p-4">
                {selected.html_preview ? (
                  <div
                    className="text-sm max-w-2xl mx-auto"
                    dangerouslySetInnerHTML={{ __html: selected.html_preview }}
                  />
                ) : selected.text_preview ? (
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                    {selected.text_preview}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No preview available for this email.</p>
                )}
              </div>

              {/* Warning Banner */}
              <div className="p-3 border-t border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20">
                <p className="text-[10px] font-medium text-amber-700 dark:text-amber-500 text-center">
                  🧪 SIMULATED EMAIL — This was not sent to any real recipient
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Eye className="h-10 w-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select an email from the list to preview it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
