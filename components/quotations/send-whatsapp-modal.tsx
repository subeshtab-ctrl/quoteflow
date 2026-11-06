'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Send,
  FileText,
  User,
  Smartphone,
  Check,
  ShieldCheck,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Quotation, Customer, Organization, WhatsAppTemplate } from '@/types/database';
import { cleanPhoneNumber, formatPhoneNumber, COUNTRY_CODES, getDefaultCountryCode } from '@/lib/country-codes';
import { buildWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp/automation';

interface SendQuotationWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  customer?: Customer | null;
  organization?: Organization | null;
  initialTemplate?: 'quotation_created' | 'quotation_reminder' | 'payment_reminder';
  onSuccess?: () => void;
}

export function SendQuotationWhatsAppModal({
  isOpen,
  onClose,
  quotation,
  customer,
  organization,
  initialTemplate = 'quotation_created',
  onSuccess,
}: SendQuotationWhatsAppModalProps) {
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplate);
  const [includeSecureLink, setIncludeSecureLink] = useState(true);
  const [attachPdf, setAttachPdf] = useState(false);

  // Phone state
  const defaultCode = customer?.phone_country_code || (organization?.business_country === 'IN' ? '+91' : '+1');
  const [phoneCountryCode, setPhoneCountryCode] = useState(defaultCode);
  const [phoneNumber, setPhoneNumber] = useState(customer?.phone || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendResultId, setSendResultId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSendSuccess(false);
      setErrorMessage(null);
      setSendResultId(null);
      setCopiedMsg(false);
      setSelectedTemplate(initialTemplate || 'quotation_created');
      setIsCheckingConnection(true);

      // Fetch WhatsApp connection status
      fetch('/api/integrations/whatsapp/connection')
        .then((r) => r.json())
        .then((data) => {
          setIsConnected(Boolean(data.isConnected));
          setConnectionDetails(data.connection);
        })
        .catch(() => setIsConnected(false))
        .finally(() => setIsCheckingConnection(false));

      // Fetch approved templates
      fetch('/api/integrations/whatsapp/templates')
        .then((r) => r.json())
        .then((data) => {
          if (data.templates && Array.isArray(data.templates)) {
            setTemplates(data.templates);
            if (!initialTemplate || initialTemplate === 'quotation_created') {
              const defaultTmpl = data.templates.find(
                (t: WhatsAppTemplate) => t.name === 'quotation_created' && t.status === 'APPROVED'
              );
              if (defaultTmpl) setSelectedTemplate(defaultTmpl.name);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialTemplate]);

  const hasPhone = Boolean(phoneNumber && phoneNumber.trim().length >= 5);

  const handleSavePhone = async () => {
    if (!customer?.id || !phoneNumber.trim()) return;
    setIsSavingPhone(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber.trim(),
          phone_country_code: phoneCountryCode,
        }),
      });
      if (!res.ok) throw new Error('Failed to update customer phone');
      setIsEditingPhone(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update phone');
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Pre-formatted message text
  const messageText = buildWhatsAppMessage({
    type:
      selectedTemplate === 'payment_reminder'
        ? 'PAYMENT_REMINDER'
        : selectedTemplate === 'quotation_reminder'
        ? 'QUOTE_REMINDER'
        : 'QUOTE_READY',
    customer,
    quotation,
    organization,
  });

  const directWhatsAppUrl = getWhatsAppUrl({
    targetPhone: phoneNumber,
    countryCode: phoneCountryCode,
    message: messageText,
  });

  const handleOpenDirectWhatsApp = () => {
    window.open(directWhatsAppUrl, '_blank');
    setSendSuccess(true);
    setSendResultId('direct.whatsapp');
    if (onSuccess) onSuccess();
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleSendWhatsApp = async () => {
    // If official Meta WhatsApp Business is not connected, use direct WhatsApp immediately
    if (!isConnected) {
      handleOpenDirectWhatsApp();
      return;
    }

    if (!hasPhone) {
      setErrorMessage('Add a WhatsApp number for this customer before sending.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/integrations/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'QUOTATION',
          documentId: quotation.id,
          templateName: selectedTemplate,
          recipientPhone: `${phoneCountryCode}${phoneNumber.replace(/\D/g, '')}`,
          includeSecureLink,
          attachPdf,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send WhatsApp message via Meta Cloud API');
      }

      setSendSuccess(true);
      setSendResultId(data.messageId);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message via Meta Cloud API.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Quotation via WhatsApp">
      <div className="space-y-4 p-1">
        {/* Success State */}
        {sendSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {sendResultId === 'direct.whatsapp' ? 'Opening WhatsApp...' : 'Quotation Sent via WhatsApp!'}
            </h4>
            <p className="text-xs text-slate-500 font-mono">
              {sendResultId === 'direct.whatsapp'
                ? 'Your quotation link has been loaded into WhatsApp.'
                : `Message ID: ${sendResultId || 'wamid.sent'}`}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              {sendResultId === 'direct.whatsapp'
                ? 'Send message in WhatsApp to deliver to your client.'
                : 'Live delivery status tracked in WhatsApp Business message history.'}
            </p>
          </div>
        ) : (
          <>
            {/* Connection Status Banner */}
            {!isCheckingConnection && (
              isConnected ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Meta WhatsApp Business Connected</strong> ({connectionDetails?.display_phone_number || 'Cloud API'})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                    1-Tap Cloud Bot
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Direct WhatsApp Share (Works instantly with WhatsApp Web / App)</span>
                  </div>
                  <Link
                    href="/settings?tab=integrations"
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
                  >
                    <span>Meta Cloud API Setup</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1">
                  <span>{errorMessage}</span>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleOpenDirectWhatsApp}
                      className="text-xs font-bold underline hover:text-rose-900"
                    >
                      Click here to open directly in WhatsApp instead →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Document & Customer Metadata */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {customer?.name || quotation.customer?.name || 'Valued Client'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Document:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {quotation.quotation_number}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">WhatsApp Number:</span>
                  {hasPhone && !isEditingPhone ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {phoneCountryCode} {phoneNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(true)}
                        className="text-indigo-600 hover:underline text-[11px] font-semibold"
                      >
                        Edit
                      </button>
                    </div>
                  ) : null}
                </div>

                {(!hasPhone || isEditingPhone) && (
                  <div className="space-y-2 pt-1">
                    {!hasPhone && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Customer WhatsApp number (optional — if empty, you can choose any contact inside WhatsApp):
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value={phoneCountryCode}
                        onChange={(e) => setPhoneCountryCode(e.target.value)}
                        className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.dialCode}>
                            {c.flag} {c.dialCode} ({c.name})
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="Mobile Number (e.g. 9876543210)"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      {customer?.id && phoneNumber.trim() && (
                        <Button
                          size="xs"
                          onClick={handleSavePhone}
                          disabled={isSavingPhone}
                          className="bg-indigo-600 text-white shrink-0"
                        >
                          {isSavingPhone ? 'Saving...' : 'Save'}
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
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="quotation_created">Quotation Created (Initial Send / Resend WhatsApp)</option>
                <option value="quotation_reminder">Quotation Reminder (Follow-up)</option>
                <option value="payment_reminder">Payment Reminder (Pending Payment Notice)</option>
              </select>
            </div>

            {/* Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Message Preview:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(messageText);
                    setCopiedMsg(true);
                    setTimeout(() => setCopiedMsg(false), 2000);
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  {copiedMsg ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedMsg ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto font-sans leading-relaxed">
                {messageText}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {isConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenDirectWhatsApp}
                    className="border-slate-300 text-slate-700 text-xs gap-1"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Open in App</span>
                  </Button>
                )}

                <Button
                  onClick={handleSendWhatsApp}
                  disabled={isSending || (isConnected && !hasPhone)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 rounded-xl shadow-xs text-xs px-4 h-9"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : isConnected ? (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send via WhatsApp API</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Share on WhatsApp</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
