'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User,
  Clock,
  ShieldCheck,
  Check,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Quotation, Customer, Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';
import { formatDate } from '@/lib/utils';

export type QuotationEmailTemplate = 'quotation_created' | 'quotation_reminder' | 'payment_reminder';

interface SendQuotationEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  customer?: Customer | null;
  organization?: Organization | null;
  initialTemplate?: QuotationEmailTemplate;
  onSuccess?: () => void;
}

export function SendQuotationEmailModal({
  isOpen,
  onClose,
  quotation,
  customer,
  organization,
  initialTemplate = 'quotation_created',
  onSuccess,
}: SendQuotationEmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationEmailTemplate>(initialTemplate);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [saveEmailToProfile, setSaveEmailToProfile] = useState(true);
  const [customNote, setCustomNote] = useState('');

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendResultId, setSendResultId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  const handleCloseTab = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
    if (typeof window !== 'undefined') {
      try {
        if (window.opener && window.opener !== window) {
          window.close();
        }
      } catch {
        // browser may disallow window.close if not script-opened
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sendSuccess) {
      setCountdown(3);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleCloseTab();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sendSuccess]);

  useEffect(() => {
    if (isOpen) {
      // Only reset/initialize if not currently showing success
      if (!sendSuccess) {
        setErrorMessage(null);
        setSendResultId(null);
        setSelectedTemplate(initialTemplate);
        setCustomNote('');

        const email = customer?.email || quotation.customer?.email || '';
        const isPlaceholder = email.endsWith('@mobile.client') || email.endsWith('@client.local');
        setRecipientEmail(isPlaceholder ? '' : email);
        setIsEditingEmail(isPlaceholder || !email);
      }
    } else {
      setSendSuccess(false);
      setErrorMessage(null);
      setSendResultId(null);
      setCountdown(3);
    }
  }, [isOpen]);

  const hasValidEmail = Boolean(
    recipientEmail &&
      recipientEmail.trim().length > 3 &&
      recipientEmail.includes('@') &&
      recipientEmail.includes('.')
  );

  const customerName =
    customer?.name ||
    quotation.customer?.name ||
    customer?.company_name ||
    quotation.customer?.company_name ||
    'Valued Client';

  const companyName = organization?.name || quotation.organization?.name || 'Our Company';
  const currency = quotation.currency || organization?.default_currency || 'INR';
  const amountFormatted = formatCurrency(quotation.grand_total, currency);
  const validUntilFormatted = quotation.valid_until ? formatDate(quotation.valid_until) : '7 days';

  const isPartial = Boolean(quotation.paid_amount && quotation.paid_amount > 0);
  const paidFormatted = formatCurrency(quotation.paid_amount || 0, currency);
  const balanceDueFormatted = formatCurrency(Math.max(0, quotation.grand_total - (quotation.paid_amount || 0)), currency);

  const subjectPreview =
    selectedTemplate === 'payment_reminder'
      ? `Payment Reminder: Quotation ${quotation.quotation_number} from ${companyName}`
      : selectedTemplate === 'quotation_reminder'
      ? `Gentle Follow-up: Quotation ${quotation.quotation_number} from ${companyName}`
      : `Quotation ${quotation.quotation_number} from ${companyName}`;

  const handleSaveEmail = async () => {
    if (!customer?.id || !recipientEmail.trim()) return;
    setIsSavingEmail(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipientEmail.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update customer email in profile');
      setIsEditingEmail(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update email');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!hasValidEmail) {
      setErrorMessage('Please provide a valid recipient email address.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/quotations/${quotation.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          recipientEmail: recipientEmail.trim(),
          customNote: customNote.trim() || undefined,
          saveEmail: saveEmailToProfile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch quotation email via Resend');
      }

      setSendSuccess(true);
      setSendResultId(data.id || 'resend.delivered');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send email. Please check configuration.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseTab}
      title={sendSuccess ? 'Email Confirmation' : 'Send Quotation via Email'}
    >
      <div className="space-y-4 p-1">
        {/* Success Confirmation Pop-up */}
        {sendSuccess ? (
          <div className="py-6 px-2 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Pulsing Success Icon */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
              <div className="relative h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg border border-emerald-300 dark:border-emerald-700">
                <Check className="h-8 w-8 stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                <ShieldCheck className="h-3 w-3" /> Email Sent & Delivered
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 pt-1">
                {selectedTemplate === 'payment_reminder'
                  ? 'Payment Reminder Email Sent Successfully!'
                  : selectedTemplate === 'quotation_reminder'
                  ? 'Follow-up Email Sent Successfully!'
                  : 'Quotation Email Sent Successfully!'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Quotation details delivered to <strong className="font-semibold text-slate-900 dark:text-slate-100">{recipientEmail}</strong>
              </p>
            </div>

            {/* Delivery Confirmation Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Document</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {quotation.quotation_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Customer</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {customerName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Total Amount</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {amountFormatted}
                </span>
              </div>
              {sendResultId && (
                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-800 pt-2 text-[11px]">
                  <span className="text-slate-400 font-mono">Delivery ID</span>
                  <span className="font-mono text-slate-500 truncate max-w-[200px]">{sendResultId}</span>
                </div>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium text-center">
              ✓ Client received instant portal access link with 1-click view and approval options.
            </div>

            {/* Close Tab / Done Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleCloseTab}
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold gap-1.5 shadow-md hover:shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              >
                <Check className="h-4 w-4" />
                <span>Close Tab ({countdown}s)</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Closing automatically in {countdown} {countdown === 1 ? 'second' : 'seconds'}...
            </p>
          </div>
        ) : (
          <>
            {/* Delivery Channel Banner */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Official Cloud Email (Resend)</strong> • From quotes@blendandbold.com
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-950 dark:bg-blue-900 dark:text-blue-200">
                Verified
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Document & Customer Metadata */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{customerName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Document:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {quotation.quotation_number}
                  </span>
                  <span className="text-slate-400 font-medium">({amountFormatted})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Recipient Email:</span>
                  {hasValidEmail && !isEditingEmail ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {recipientEmail}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(true)}
                        className="text-indigo-600 hover:underline text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  ) : null}
                </div>

                {(!hasValidEmail || isEditingEmail) && (
                  <div className="space-y-2 pt-1">
                    {!hasValidEmail && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Enter recipient email address:
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="client@company.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="h-8 text-xs font-mono"
                        autoFocus={isEditingEmail}
                      />
                      {customer?.id && recipientEmail.trim() && (
                        <Button
                          size="xs"
                          onClick={handleSaveEmail}
                          disabled={isSavingEmail}
                          className="bg-indigo-600 text-white shrink-0"
                        >
                          {isSavingEmail ? 'Saving...' : 'Save'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as QuotationEmailTemplate)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="quotation_created">Quotation Created (Initial Send / Resend Email)</option>
                <option value="quotation_reminder">Quotation Reminder (Follow-up Email)</option>
                <option value="payment_reminder">Payment Reminder (Pending Payment &amp; Balance Notice)</option>
              </select>
            </div>

            {/* Optional Personal Note (for follow-up or payment reminder) */}
            {(selectedTemplate === 'quotation_reminder' || selectedTemplate === 'payment_reminder') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Personal Note to Customer (Optional)</span>
                  <span className="text-[10px] text-slate-400">Included inside email box</span>
                </label>
                <textarea
                  rows={2}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={
                    selectedTemplate === 'payment_reminder'
                      ? 'e.g. Please find payment details attached or complete payment directly online via UPI/card.'
                      : 'e.g. Hi there! Just checking if you had any questions on the proposal or wanted to adjust any line items.'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Live Message Preview (Matching Modern Theme) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Live Email Preview:</span>
                <span className="text-[11px] font-mono text-indigo-500">
                  {selectedTemplate === 'payment_reminder'
                    ? 'Payment Reminder Theme'
                    : selectedTemplate === 'quotation_reminder'
                    ? 'Follow-up Theme'
                    : 'Modern Gradient Theme'}
                </span>
              </div>

              {/* Preview Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs shadow-xs">
                {/* Subject Header */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate text-[11px]">{subjectPreview}</span>
                </div>

                {/* Theme Hero Banner */}
                <div
                  className={`p-3.5 text-white space-y-1.5 ${
                    selectedTemplate === 'payment_reminder'
                      ? 'bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-600'
                      : 'bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm tracking-tight text-white">Quote<span className={selectedTemplate === 'payment_reminder' ? 'text-emerald-200' : 'text-purple-200'}>Flow</span></span>
                    <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                      {selectedTemplate === 'payment_reminder'
                        ? 'PAYMENT REMINDER'
                        : selectedTemplate === 'quotation_reminder'
                        ? 'QUOTATION FOLLOW-UP'
                        : 'NEW QUOTATION'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white pt-1">
                    {selectedTemplate === 'payment_reminder'
                      ? 'Payment reminder for your quotation 💳'
                      : selectedTemplate === 'quotation_reminder'
                      ? 'Gentle follow-up on your quotation ⏳'
                      : 'Your quotation is ready 🎉'}
                  </div>
                  <div className="text-[11px] text-white/90">
                    {selectedTemplate === 'payment_reminder'
                      ? `${companyName} has sent a friendly payment reminder.`
                      : `${companyName} has prepared a quotation for you.`}
                  </div>
                </div>

                {/* Preview Content */}
                <div className="p-3 bg-white dark:bg-slate-950 space-y-2.5">
                  <div className="text-[11px] text-slate-700 dark:text-slate-300">
                    Hi <strong>{customerName}</strong>,
                  </div>

                  {customNote.trim() && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-200 italic">
                      &ldquo;{customNote.trim()}&rdquo;
                    </div>
                  )}

                  {/* Highlights card */}
                  <div className="p-2.5 bg-[#fafaff] dark:bg-slate-900 border border-[#e8e7ff] dark:border-slate-800 rounded-lg space-y-1.5 text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Quotation</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{quotation.quotation_number}</span>
                    </div>
                    {isPartial ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Total Amount</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{amountFormatted}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Amount Paid</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">{paidFormatted}</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex justify-between items-center">
                          <span className="font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase">BALANCE DUE</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{balanceDueFormatted}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Valid Until</span>
                          <span className="text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                            {validUntilFormatted}
                          </span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex justify-between items-center">
                          <span className="font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase">
                            {selectedTemplate === 'payment_reminder' ? 'AMOUNT DUE' : 'TOTAL AMOUNT'}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{amountFormatted}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mock CTA Button */}
                  <div className="text-center pt-1">
                    <span
                      className={`inline-block text-white font-bold text-[11px] py-1.5 px-4 rounded-lg shadow-xs ${
                        selectedTemplate === 'payment_reminder'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {selectedTemplate === 'payment_reminder' ? '💳 Pay Securely Online Now →' : 'View & Respond to Quote →'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>

              <Button
                onClick={handleSendEmail}
                disabled={isSending || !hasValidEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 rounded-xl shadow-xs text-xs px-4 h-9"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {selectedTemplate === 'quotation_reminder' ? 'Send Follow-up Email' : 'Send Quotation Email'}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
