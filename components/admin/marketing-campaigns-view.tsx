'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Send,
  MessageSquare,
  Mail,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Filter,
  Search,
  Settings,
  HelpCircle,
  Smartphone,
  ShieldAlert,
  ArrowRight,
  Download,
  Users,
  UserPlus,
  Image as ImageIcon,
  Plus,
  X,
  Link2,
  RotateCcw,
  Pencil,
  CheckCheck,
  Eye,
  XCircle,
  Monitor,
  Code2,
  Palette,
  Layers,
  SendHorizontal,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { type CustomEmailTemplate, compileTemplateEmail } from '@/lib/email/template-compiler';

export interface CampaignContact {
  id: string;
  name: string;
  email: string;
  phone: string; // digits only with country code e.g. 919876543210
  rawPhone: string;
  status: 'valid' | 'whatsapp_only' | 'email_only' | 'invalid';
  selected: boolean;
  company?: string;
  source?: 'manual' | 'customer_database' | 'excel' | 'demo';
  whatsappSent?: boolean;
  whatsappSentAt?: string;
  whatsappStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsappDeliveredAt?: string;
  whatsappReadAt?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  emailStatus?: 'pending' | 'sent' | 'delivered' | 'opened' | 'bounced';
  emailDeliveredAt?: string;
  emailOpenedAt?: string;
  emailBouncedAt?: string;
  emailBounceReason?: string;
}

export function MarketingCampaignsView() {
  const [activeSubTab, setActiveSubTab] = useState<'campaign' | 'templates' | 'history' | 'gateway'>('campaign');
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'customer_database' | 'manual' | 'excel' | 'demo'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'unsent' | 'sent' | 'delivered' | 'read' | 'bounced'>('all');
  const [batchActionMessage, setBatchActionMessage] = useState<string>('');

  // Manual Contact Add State
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualAddSuccess, setManualAddSuccess] = useState(false);

  // Edit Contact Modal State
  const [editingContact, setEditingContact] = useState<CampaignContact | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editWhatsappStatus, setEditWhatsappStatus] = useState<'pending' | 'sent' | 'delivered' | 'read' | 'failed'>('pending');
  const [editEmailStatus, setEditEmailStatus] = useState<'pending' | 'sent' | 'delivered' | 'opened' | 'bounced'>('pending');
  const [editEmailBounceReason, setEditEmailBounceReason] = useState('');
  const [editSaveSuccess, setEditSaveSuccess] = useState(false);

  // Image Attachment State
  const [attachedImageUrl, setAttachedImageUrl] = useState<string>('');
  const [attachedImageName, setAttachedImageName] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [includeImageLinkInWhatsapp, setIncludeImageLinkInWhatsapp] = useState(true);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Channel & Template State
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'email' | 'both'>('whatsapp');
  const [campaignName, setCampaignName] = useState('QuoteFlow Pro Launch Offer');
  const [promoCode, setPromoCode] = useState('PROMO149');
  const [promoLink, setPromoLink] = useState('https://blendandbold.com?ref=whatsapp');

  // WhatsApp Message
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    'Hi {name}! 🎉\n\nQuoteFlow Pro is now live for just *₹149/month*!\n\nCreate unlimited professional quotations with AI Copilot, send instant 1-tap WhatsApp approval links, and get paid 3x faster.\n\nUse special code *{offer_code}* to get started:\n{link}\n\nReply STOP to unsubscribe.'
  );

  // Email Template
  const [emailSubject, setEmailSubject] = useState('Special Offer: Get QuoteFlow Pro for just {offer_code} 🚀');
  const [emailBody, setEmailBody] = useState(
    'We are excited to invite you to QuoteFlow Pro!\n\nCreate unlimited quotations in seconds using our AI Copilot, share interactive digital approval portals with your clients over WhatsApp, and convert accepted quotes into sequential GST invoices with 1 click.'
  );
  const [emailCtaText, setEmailCtaText] = useState('Claim ₹149 Offer Now');
  const [emailFromAddress, setEmailFromAddress] = useState('marketing@blendandbold.com');
  const [emailFromName, setEmailFromName] = useState('QuoteFlow Marketing');

  // Custom HTML + CSS Email Templates State
  const [templates, setTemplates] = useState<CustomEmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');
  const [templateSubject, setTemplateSubject] = useState<string>('');
  const [templateHtml, setTemplateHtml] = useState<string>('');
  const [templateCss, setTemplateCss] = useState<string>('');
  const [templatePlainText, setTemplatePlainText] = useState<string>('');
  const [templateEditorTab, setTemplateEditorTab] = useState<'html' | 'css' | 'plainText'>('html');
  const [templatePreviewDevice, setTemplatePreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState<boolean>(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState<string>('subeshtab@gmail.com');
  const [isSendingTemplateTest, setIsSendingTemplateTest] = useState<boolean>(false);
  const [templateTestResult, setTemplateTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Queue State
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sentContactIds, setSentContactIds] = useState<Set<string>>(new Set());
  const [skippedContactIds, setSkippedContactIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  // Email Broadcast State
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailProgress, setEmailProgress] = useState<{ sent: number; total: number; failed: number } | null>(null);
  const [emailBroadcastDone, setEmailBroadcastDone] = useState(false);

  // Meta WhatsApp Cloud API Broadcast State
  const [isSendingMetaWhatsApp, setIsSendingMetaWhatsApp] = useState(false);
  const [metaWhatsAppProgress, setMetaWhatsAppProgress] = useState<{ sent: number; total: number; failed: number } | null>(null);
  const [metaWhatsAppBroadcastDone, setMetaWhatsAppBroadcastDone] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  const [testMessageResult, setTestMessageResult] = useState<string | null>(null);

  // History & Gateway State
  const [campaignHistory, setCampaignHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState({
    provider: 'queue',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    ultraMsgInstanceId: '',
    ultraMsgToken: '',
  });
  const [isSavingGateway, setIsSavingGateway] = useState(false);
  const [gatewaySaveSuccess, setGatewaySaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedContactsList, setSavedContactsList] = useState<CampaignContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  // Load past campaigns, gateway config, and saved contacts on mount
  useEffect(() => {
    fetchHistoryAndConfig();
    fetchSavedContacts(true);
    fetchTemplates();
  }, []);

  const fetchHistoryAndConfig = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/admin/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaignHistory(data.campaigns || []);
        if (data.gatewayConfig) {
          setGatewayConfig((prev) => ({ ...prev, ...data.gatewayConfig }));
        }
      }
    } catch (e) {
      console.warn('Could not load campaign history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch custom email templates
  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const res = await fetch('/api/admin/email-templates');
      if (res.ok) {
        const data = await res.json();
        const loaded: CustomEmailTemplate[] = data.templates || [];
        setTemplates(loaded);
        if (loaded.length > 0 && !selectedTemplateId) {
          selectTemplate(loaded[0]);
        }
      }
    } catch (err) {
      console.warn('Could not load email templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const selectTemplate = (t: CustomEmailTemplate) => {
    setSelectedTemplateId(t.id);
    setTemplateName(t.name);
    setTemplateSubject(t.subject);
    setTemplateHtml(t.html);
    setTemplateCss(t.css);
    setTemplatePlainText(t.plainText || '');
    setTemplateSaveSuccess(false);
    setTemplateTestResult(null);
  };

  const handleNewTemplate = () => {
    const newId = `tmpl_${Date.now()}`;
    setSelectedTemplateId(newId);
    setTemplateName('New Custom Campaign Template');
    setTemplateSubject('Special Announcement: QuoteFlow Pro 🚀');
    setTemplateHtml(`
<div class="container">
  <h1>Hello {{customer_name}},</h1>
  <p>We are reaching out regarding <strong>{{business_name}}</strong>.</p>
  <p>QuoteFlow lets you generate professional proposals in seconds using conversational AI, send instant WhatsApp approvals with digital finger e-signatures, and convert approved quotes to tax invoices in 1 click.</p>
  <div style="text-align: center; margin: 28px 0;">
    <a href="{{quote_link}}" class="btn">View Proposal Online</a>
  </div>
  <div class="footer">
    <p>© 2026 QuoteFlow • <a href="{{unsubscribe_link}}">Unsubscribe</a></p>
  </div>
</div>
`.trim());
    setTemplateCss(`
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f8fafc;
  color: #0f172a;
  margin: 0;
  padding: 24px;
}
.container {
  max-width: 580px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 36px;
  border: 1px solid #e2e8f0;
}
h1 {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 16px 0;
}
p {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 16px 0;
}
.btn {
  display: inline-block;
  background: #4f46e5;
  color: #ffffff !important;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
}
.footer {
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
  padding-top: 18px;
  text-align: center;
}
.footer a {
  color: #64748b;
  text-decoration: underline;
}
`.trim());
    setTemplatePlainText('Hello {{customer_name}},\n\nUpdate regarding {{business_name}}.\nView details: {{quote_link}}');
    setTemplateSaveSuccess(false);
    setTemplateTestResult(null);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    try {
      setIsSavingTemplate(true);
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          template: {
            id: selectedTemplateId || `tmpl_${Date.now()}`,
            name: templateName.trim(),
            subject: templateSubject.trim(),
            html: templateHtml,
            css: templateCss,
            plainText: templatePlainText,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplateSaveSuccess(true);
        setTimeout(() => setTemplateSaveSuccess(false), 3000);
        await fetchTemplates();
      } else {
        alert(data.error || 'Failed to save template');
      }
    } catch (err: any) {
      alert('Error saving template: ' + err.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDuplicateTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      setIsSavingTemplate(true);
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'duplicate',
          id: selectedTemplateId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.template) {
        await fetchTemplates();
        selectTemplate(data.template);
      } else {
        alert(data.error || 'Failed to duplicate template');
      }
    } catch (err: any) {
      alert('Error duplicating template: ' + err.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;
    try {
      setIsSavingTemplate(true);
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: selectedTemplateId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchTemplates();
        if (templates.length > 1) {
          const remaining = templates.filter((t) => t.id !== selectedTemplateId);
          if (remaining.length > 0) selectTemplate(remaining[0]);
        }
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (err: any) {
      alert('Error deleting template: ' + err.message);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSendTemplateTestEmail = async () => {
    if (!testRecipientEmail || !testRecipientEmail.includes('@')) {
      alert('Please enter a valid recipient email address.');
      return;
    }
    try {
      setIsSendingTemplateTest(true);
      setTemplateTestResult(null);
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          recipientEmail: testRecipientEmail.trim(),
          template: {
            id: selectedTemplateId,
            name: templateName,
            subject: templateSubject,
            html: templateHtml,
            css: templateCss,
            plainText: templatePlainText,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplateTestResult({
          success: true,
          message: `✓ Test email sent to ${testRecipientEmail}! Message ID: ${data.messageId || 'ok'}`,
        });
      } else {
        setTemplateTestResult({
          success: false,
          message: `✕ Failed: ${data.error || 'Could not send test email'}`,
        });
      }
    } catch (err: any) {
      setTemplateTestResult({
        success: false,
        message: `✕ Network error: ${err.message}`,
      });
    } finally {
      setIsSendingTemplateTest(false);
    }
  };

  const handleUseTemplateInCampaign = () => {
    if (templateSubject) {
      setEmailSubject(templateSubject);
    }
    if (templateHtml) {
      setEmailBody(templateHtml);
    }
    setSelectedChannel('email');
    setActiveSubTab('campaign');
  };

  const insertVariableTag = (tag: string) => {
    const formatted = `{{${tag}}}`;
    if (templateEditorTab === 'html') {
      setTemplateHtml((prev) => prev + formatted);
    } else if (templateEditorTab === 'css') {
      setTemplateCss((prev) => prev + formatted);
    } else {
      setTemplatePlainText((prev) => prev + formatted);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formatted).catch(() => {});
    }
    setCopiedTag(formatted);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  // Fetch saved contacts (from server database + previous manual entries)
  const fetchSavedContacts = async (autoLoadIfEmpty = false) => {
    try {
      setIsLoadingContacts(true);
      const res = await fetch('/api/admin/campaigns/contacts');
      if (res.ok) {
        const data = await res.json();
        const loaded: CampaignContact[] = data.contacts || [];
        const uploaded: CampaignContact[] = data.uploadedContacts || [];
        setSavedContactsList(loaded);
        if (autoLoadIfEmpty) {
          setContacts((current) => {
            if (current.length === 0) {
              if (uploaded.length > 0) {
                setFileName(data.uploadedFileName || 'QuoteFlow Uploaded List');
                return uploaded;
              }
              if (typeof window !== 'undefined') {
                try {
                  const cached = localStorage.getItem('quoteflow_campaign_contacts_v2');
                  if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed.contacts) && parsed.contacts.length > 0) {
                      setFileName(parsed.fileName || 'Saved Contacts List');
                      return parsed.contacts;
                    }
                  }
                } catch {}
              }
              if (loaded.length > 0) {
                setFileName('QuoteFlow Saved Contacts');
                return loaded;
              }
            }
            return current;
          });
        }
      }
    } catch (err) {
      console.warn('Could not load saved contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Explicitly Load Saved Contacts button action
  const handleLoadSavedContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const res = await fetch('/api/admin/campaigns/contacts');
      if (res.ok) {
        const data = await res.json();
        const loaded: CampaignContact[] = data.contacts || [];
        setSavedContactsList(loaded);
        if (loaded.length === 0) {
          alert('No saved contacts found yet. You can add contacts manually or upload an Excel file.');
        } else {
          setContacts(loaded);
          setFileName('QuoteFlow Saved Contacts');
        }
      } else {
        alert('Could not fetch saved contacts.');
      }
    } catch (err) {
      alert('Failed to load saved contacts.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Format and normalize phone numbers
  const normalizePhoneNumber = (raw: string): string => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    // If 10 digits (standard Indian mobile e.g. 9876543210), prepend 91
    if (digits.length === 10) {
      digits = '91' + digits;
    }
    // If starts with 0 and total is 11, replace leading 0 with 91
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.substring(1);
    }
    return digits;
  };

  // Helper to extract 10-digit mobile suffix for comparison
  const getPhoneSuffix = (phoneStr: string): string => {
    const digits = (phoneStr || '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };

  // Helper to check if two contacts share the same phone or email
  const isSameContact = (
    c1: { phone?: string; email?: string; rawPhone?: string },
    c2: { phone?: string; email?: string; rawPhone?: string }
  ): boolean => {
    const s1 = getPhoneSuffix(c1.phone || c1.rawPhone || '');
    const s2 = getPhoneSuffix(c2.phone || c2.rawPhone || '');
    if (s1 && s2 && s1 === s2) return true;

    const e1 = (c1.email || '').trim().toLowerCase();
    const e2 = (c2.email || '').trim().toLowerCase();
    if (e1 && e2 && e1 === e2) return true;

    return false;
  };

  // Pure function to deduplicate an array of CampaignContacts
  const deduplicateContactList = (
    list: CampaignContact[]
  ): { uniqueContacts: CampaignContact[]; duplicatesRemoved: number } => {
    const uniqueContacts: CampaignContact[] = [];
    const seenPhoneSuffixes = new Set<string>();
    const seenEmails = new Set<string>();
    let duplicatesRemoved = 0;

    for (const c of list) {
      const phoneSuffix = getPhoneSuffix(c.phone || c.rawPhone || '');
      const email = (c.email || '').trim().toLowerCase();

      const isDup =
        (phoneSuffix && seenPhoneSuffixes.has(phoneSuffix)) ||
        (email && seenEmails.has(email));

      if (isDup) {
        duplicatesRemoved++;
        // Preserve sent status in the existing contact
        const existing = uniqueContacts.find((u) => {
          const uSuffix = getPhoneSuffix(u.phone || u.rawPhone || '');
          const uEmail = (u.email || '').trim().toLowerCase();
          return (phoneSuffix && uSuffix === phoneSuffix) || (email && uEmail === email);
        });
        if (existing) {
          if (c.whatsappSent && !existing.whatsappSent) {
            existing.whatsappSent = true;
            existing.whatsappSentAt = c.whatsappSentAt || existing.whatsappSentAt;
          }
          if (c.emailSent && !existing.emailSent) {
            existing.emailSent = true;
            existing.emailSentAt = c.emailSentAt || existing.emailSentAt;
          }
        }
      } else {
        if (phoneSuffix) seenPhoneSuffixes.add(phoneSuffix);
        if (email) seenEmails.add(email);
        uniqueContacts.push({ ...c });
      }
    }

    return { uniqueContacts, duplicatesRemoved };
  };

  // Save contacts list to localStorage and backend
  const persistContactsList = (list: CampaignContact[], currentFileName?: string) => {
    const fName = currentFileName || fileName || 'QuoteFlow Campaign Contacts';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'quoteflow_campaign_contacts_v2',
          JSON.stringify({ contacts: list, fileName: fName })
        );
      } catch {}
    }

    fetch('/api/admin/campaigns/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulk_upload',
        contacts: list,
        fileName: fName,
      }),
    }).catch(() => {});
  };

  // Manual button to clean and delete any duplicates in the recipient list
  const handleCleanDuplicates = () => {
    if (contacts.length === 0) {
      alert('Recipient list is empty.');
      return;
    }

    const { uniqueContacts, duplicatesRemoved } = deduplicateContactList(contacts);

    if (duplicatesRemoved === 0) {
      alert(`No duplicates found! All ${contacts.length} contacts have unique phone numbers and email addresses.`);
      return;
    }

    setContacts(uniqueContacts);
    persistContactsList(uniqueContacts, fileName || 'Deduplicated Contacts');

    alert(`Successfully removed ${duplicatesRemoved} duplicate contacts. ${uniqueContacts.length} unique contacts remain in your list.`);
  };

  // Handle Manual Contact Addition & Permanent Persistence
  const handleAddManualContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = manualName.trim();
    const rawPhone = manualPhone.trim();
    const rawEmail = manualEmail.trim().toLowerCase();
    const rawCompany = manualCompany.trim();
    const phone = normalizePhoneNumber(rawPhone);

    const hasValidPhone = phone.length >= 10 && phone.length <= 15;
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

    if (!hasValidPhone && !hasValidEmail) {
      alert('Please enter at least a valid 10-digit WhatsApp phone number or a valid email address.');
      return;
    }

    // Duplicate check against existing contacts
    const phoneSuffix = getPhoneSuffix(phone);
    const isDuplicate = contacts.some((c) => {
      const existingSuffix = getPhoneSuffix(c.phone || c.rawPhone || '');
      const existingEmail = (c.email || '').trim().toLowerCase();
      if (phoneSuffix && existingSuffix && phoneSuffix === existingSuffix) return true;
      if (rawEmail && existingEmail && rawEmail === existingEmail) return true;
      return false;
    });

    if (isDuplicate) {
      alert('A contact with this phone number or email address already exists in your list.');
      return;
    }

    let status: CampaignContact['status'] = 'invalid';
    if (hasValidPhone && hasValidEmail) status = 'valid';
    else if (hasValidPhone) status = 'whatsapp_only';
    else if (hasValidEmail) status = 'email_only';

    const newContact: CampaignContact = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name || (hasValidPhone ? `User ${phone.slice(-4)}` : 'Valued Customer'),
      email: hasValidEmail ? rawEmail : '',
      phone: hasValidPhone ? phone : '',
      rawPhone,
      company: rawCompany,
      status,
      selected: true,
      source: 'manual',
    };

    // Save permanently to server database
    try {
      await fetch('/api/admin/campaigns/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContact.name,
          phone: rawPhone,
          email: rawEmail,
          company: rawCompany,
        }),
      });
    } catch (err) {
      console.warn('Failed to persist contact to server:', err);
    }

    const updated = [newContact, ...contacts];
    setContacts(updated);
    setSavedContactsList((prev) => [newContact, ...prev.filter((c) => !isSameContact(c, newContact))]);
    persistContactsList(updated, fileName || 'QuoteFlow Saved Contacts');

    if (!fileName) {
      setFileName('QuoteFlow Saved Contacts');
    }

    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setManualCompany('');
    setManualAddSuccess(true);
    setTimeout(() => setManualAddSuccess(false), 2500);
  };

  // Open Edit Contact Modal
  const handleOpenEditContact = (c: CampaignContact) => {
    setEditingContact(c);
    setEditName(c.name || '');
    setEditPhone(c.rawPhone || c.phone || '');
    setEditEmail(c.email || '');
    setEditCompany(c.company || '');
    setEditWhatsappStatus(getWhatsAppStatus(c));
    setEditEmailStatus(getEmailStatus(c));
    setEditEmailBounceReason(c.emailBounceReason || '');
    setEditSaveSuccess(false);
  };

  // Save changes to edited contact
  const handleSaveEditContact = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingContact) return;

    const cleanName = editName.trim();
    const rawPhone = editPhone.trim();
    const cleanEmail = editEmail.trim().toLowerCase();
    const phone = normalizePhoneNumber(rawPhone);
    const cleanCompany = editCompany.trim();

    const hasValidPhone = phone.length >= 10 && phone.length <= 15;
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

    if (!hasValidPhone && !hasValidEmail) {
      alert('Please enter at least a valid phone number (10+ digits) or a valid email address.');
      return;
    }

    // Check duplicate against other contacts in the list (excluding editingContact itself)
    const phoneSuffix = getPhoneSuffix(phone);
    const isDuplicate = contacts.some((c) => {
      if (c.id === editingContact.id) return false;
      const existingSuffix = getPhoneSuffix(c.phone || c.rawPhone || '');
      const existingEmail = (c.email || '').trim().toLowerCase();
      if (phoneSuffix && existingSuffix && phoneSuffix === existingSuffix) return true;
      if (cleanEmail && existingEmail && cleanEmail === existingEmail) return true;
      return false;
    });

    if (isDuplicate) {
      alert('Another contact with this phone number or email address already exists in your list.');
      return;
    }

    let status: CampaignContact['status'] = 'invalid';
    if (hasValidPhone && hasValidEmail) status = 'valid';
    else if (hasValidPhone) status = 'whatsapp_only';
    else if (hasValidEmail) status = 'email_only';

    const updatedContact: CampaignContact = {
      ...editingContact,
      name: cleanName || (hasValidPhone ? `User ${phone.slice(-4)}` : 'Valued Customer'),
      phone: hasValidPhone ? phone : '',
      rawPhone,
      email: hasValidEmail ? cleanEmail : '',
      company: cleanCompany,
      status,
      whatsappStatus: editWhatsappStatus,
      whatsappSent: editWhatsappStatus !== 'pending',
      whatsappDeliveredAt:
        editWhatsappStatus === 'delivered' || editWhatsappStatus === 'read'
          ? editingContact.whatsappDeliveredAt || new Date().toISOString()
          : undefined,
      whatsappReadAt:
        editWhatsappStatus === 'read'
          ? editingContact.whatsappReadAt || new Date().toISOString()
          : undefined,
      emailStatus: editEmailStatus,
      emailSent: editEmailStatus !== 'pending',
      emailDeliveredAt:
        editEmailStatus === 'delivered' || editEmailStatus === 'opened'
          ? editingContact.emailDeliveredAt || new Date().toISOString()
          : undefined,
      emailOpenedAt:
        editEmailStatus === 'opened'
          ? editingContact.emailOpenedAt || new Date().toISOString()
          : undefined,
      emailBouncedAt:
        editEmailStatus === 'bounced'
          ? editingContact.emailBouncedAt || new Date().toISOString()
          : undefined,
      emailBounceReason:
        editEmailStatus === 'bounced'
          ? editEmailBounceReason || 'Recipient address mailbox rejected'
          : undefined,
    };

    const updatedList = contacts.map((c) => (c.id === editingContact.id ? updatedContact : c));
    setContacts(updatedList);
    setSavedContactsList((prev) => prev.map((c) => (c.id === editingContact.id ? updatedContact : c)));
    persistContactsList(updatedList);

    // Sync to backend
    try {
      await fetch('/api/admin/campaigns/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_contact',
          id: editingContact.id,
          name: updatedContact.name,
          phone: rawPhone,
          email: cleanEmail,
          company: cleanCompany,
          whatsappStatus: editWhatsappStatus,
          emailStatus: editEmailStatus,
          emailBounceReason: editEmailBounceReason,
        }),
      });
    } catch (err) {
      console.warn('Could not sync contact update to backend:', err);
    }

    setEditSaveSuccess(true);
    setTimeout(() => {
      setEditingContact(null);
      setEditSaveSuccess(false);
    }, 600);
  };

  // Remove or Delete contact
  const handleDeleteContact = async (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    setSavedContactsList((prev) => prev.filter((c) => c.id !== id));
    persistContactsList(updated);

    if (id.startsWith('manual_')) {
      try {
        await fetch(`/api/admin/campaigns/contacts?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Could not delete from server store:', e);
      }
    }
  };

  // Handle Image File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }

    setIsUploadingImage(true);
    setAttachedImageName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/campaigns/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setAttachedImageUrl(data.imageUrl);
      } else {
        // Fallback to local base64 reader if server upload returns dataUrl
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (evt.target?.result) {
            setAttachedImageUrl(String(evt.target.result));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setAttachedImageUrl(String(evt.target.result));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Excel / CSV File Upload with Strict Deduplication
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so selecting the same file twice triggers onChange
    e.target.value = '';

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          alert('Uploaded spreadsheet appears to be empty.');
          return;
        }

        // Detect column headers
        const keys = Object.keys(data[0]);
        const nameKey = keys.find((k) => /name|customer|client|lead|person/i.test(k)) || keys[0] || 'name';
        const emailKey = keys.find((k) => /email|mail/i.test(k)) || keys.find((k) => /@/.test(data[0][k])) || 'email';
        const phoneKey = keys.find((k) => /phone|whatsapp|mobile|cell|contact|number/i.test(k)) || 'phone';
        const companyKey = keys.find((k) => /company|business|organization|firm|agency/i.test(k));

        const parsedContacts: CampaignContact[] = [];

        data.forEach((row, idx) => {
          const rawName = String(row[nameKey] || '').trim();
          const rawEmail = String(row[emailKey] || '').trim().toLowerCase();
          const rawPhone = String(row[phoneKey] || '').trim();
          const rawCompany = companyKey ? String(row[companyKey] || '').trim() : '';
          const phone = normalizePhoneNumber(rawPhone);

          const hasValidPhone = phone.length >= 10 && phone.length <= 15;
          const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);

          let status: CampaignContact['status'] = 'invalid';
          if (hasValidPhone && hasValidEmail) status = 'valid';
          else if (hasValidPhone) status = 'whatsapp_only';
          else if (hasValidEmail) status = 'email_only';

          if (rawName || hasValidPhone || hasValidEmail) {
            parsedContacts.push({
              id: `c_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: rawName || (hasValidPhone ? `User ${phone.slice(-4)}` : 'Valued Customer'),
              email: hasValidEmail ? rawEmail : '',
              phone: hasValidPhone ? phone : '',
              rawPhone,
              company: rawCompany,
              status,
              source: 'excel',
              selected: status !== 'invalid',
              whatsappSent: false,
              emailSent: false,
            });
          }
        });

        // 1. Remove internal duplicates within the uploaded file itself
        const { uniqueContacts: uniqueUploaded, duplicatesRemoved: internalDups } = deduplicateContactList(parsedContacts);

        if (uniqueUploaded.length === 0) {
          alert('No valid contacts could be read from this file.');
          return;
        }

        // 2. Check against existing contacts
        const isCurrentListOnlyDemo = contacts.length > 0 && contacts.every((c) => c.source === 'demo');

        if (contacts.length === 0 || isCurrentListOnlyDemo) {
          // Fresh upload or replacing demo contacts
          setFileName(file.name);
          setContacts(uniqueUploaded);
          persistContactsList(uniqueUploaded, file.name);

          if (internalDups > 0) {
            alert(`Imported ${uniqueUploaded.length} contacts from "${file.name}". Automatically deleted ${internalDups} duplicate entries.`);
          } else {
            alert(`Successfully imported ${uniqueUploaded.length} contacts from "${file.name}".`);
          }
        } else {
          // Check how many of uniqueUploaded are duplicates of existing contacts
          const newUniqueToAdd: CampaignContact[] = [];
          let duplicatesOfExisting = 0;

          for (const upContact of uniqueUploaded) {
            const alreadyExists = contacts.some((c) => isSameContact(c, upContact));
            if (alreadyExists) {
              duplicatesOfExisting++;
            } else {
              newUniqueToAdd.push(upContact);
            }
          }

          if (newUniqueToAdd.length === 0) {
            // Uploaded the EXACT SAME file twice or all contacts already exist
            alert(`Duplicate File Detected: All ${uniqueUploaded.length} contacts in "${file.name}" already exist in your recipient list. No duplicate contacts were added.`);
            return;
          }

          // Merge existing with new unique entries
          const merged = [...contacts, ...newUniqueToAdd];
          setContacts(merged);
          setFileName(fileName ? `${fileName} + ${file.name}` : file.name);
          persistContactsList(merged, file.name);

          const totalDupsSkipped = internalDups + duplicatesOfExisting;
          alert(`Added ${newUniqueToAdd.length} new unique contacts from "${file.name}". Automatically deleted/skipped ${totalDupsSkipped} duplicate entries.`);
        }
      } catch (err: any) {
        alert('Failed to parse file: ' + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Download a sample Excel template
  const handleDownloadSample = () => {
    const sampleData = [
      { 'Customer Name': 'Rahul Sharma', 'WhatsApp Number': '9876543210', Email: 'rahul@example.com', Company: 'Apex Traders' },
      { 'Customer Name': 'Priya Patel', 'WhatsApp Number': '9123456789', Email: 'priya@example.com', Company: 'Zenith Studio' },
      { 'Customer Name': 'Amit Verma', 'WhatsApp Number': '+91 9988776655', Email: 'amit@example.com', Company: 'Verma Interiors' },
      { 'Customer Name': 'Sneha Rao', 'WhatsApp Number': '9845012345', Email: 'sneha@example.com', Company: 'Rao Logistics' },
      { 'Customer Name': 'Vikram Singh', 'WhatsApp Number': '9711223344', Email: 'vikram@example.com', Company: 'Singh & Sons' },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_Contacts');
    XLSX.writeFile(wb, 'QuoteFlow_Marketing_Contacts_Sample.xlsx');
  };

  // Add sample demo contacts showcasing all delivery and read statuses
  const handleAddSampleData = () => {
    const demoContacts: CampaignContact[] = [
      {
        id: 'd_1',
        name: 'Rahul Sharma',
        company: 'Apex Traders',
        email: 'rahul.test@example.com',
        phone: '919876543210',
        rawPhone: '9876543210',
        status: 'valid',
        selected: true,
        source: 'demo',
        whatsappSent: true,
        whatsappStatus: 'delivered',
        emailSent: true,
        emailStatus: 'opened',
      },
      {
        id: 'd_2',
        name: 'Priya Patel',
        company: 'Zenith Architecture',
        email: 'priya.test@example.com',
        phone: '919123456789',
        rawPhone: '9123456789',
        status: 'valid',
        selected: true,
        source: 'demo',
        whatsappSent: true,
        whatsappStatus: 'read',
        emailSent: true,
        emailStatus: 'delivered',
      },
      {
        id: 'd_3',
        name: 'Amit Verma',
        company: 'Verma Interiors',
        email: 'amit.verma@example.com',
        phone: '919988776655',
        rawPhone: '9988776655',
        status: 'valid',
        selected: true,
        source: 'demo',
        whatsappSent: true,
        whatsappStatus: 'sent',
        emailSent: false,
        emailStatus: 'pending',
      },
      {
        id: 'd_4',
        name: 'Sneha Rao',
        company: 'Rao Logistics',
        email: 'invalid.mailbox@example.com',
        phone: '919845012345',
        rawPhone: '9845012345',
        status: 'valid',
        selected: true,
        source: 'demo',
        whatsappSent: false,
        whatsappStatus: 'pending',
        emailSent: true,
        emailStatus: 'bounced',
        emailBounceReason: '550 5.1.1 User unknown / mailbox unavailable',
      },
      {
        id: 'd_5',
        name: 'Vikram Singh',
        company: 'Singh & Sons Hardware',
        email: 'vikram.test@example.com',
        phone: '919711223344',
        rawPhone: '9711223344',
        status: 'valid',
        selected: true,
        source: 'demo',
        whatsappSent: true,
        whatsappStatus: 'failed',
        emailSent: true,
        emailStatus: 'sent',
      },
      {
        id: 'd_6',
        name: 'Anita Nair',
        company: 'Kochi Web Designers',
        email: 'anita.nair@example.com',
        phone: '919447012345',
        rawPhone: '9447012345',
        status: 'valid',
        selected: true,
        source: 'demo',
        whatsappSent: false,
        whatsappStatus: 'pending',
        emailSent: false,
        emailStatus: 'pending',
      },
    ];
    setContacts(demoContacts);
    setFileName('Demo_Contacts_List.xlsx');
  };

  // Status Resolvers
  const getWhatsAppStatus = (c: CampaignContact): 'pending' | 'sent' | 'delivered' | 'read' | 'failed' => {
    if (c.whatsappStatus) return c.whatsappStatus;
    if (c.whatsappSent) return 'sent';
    return 'pending';
  };

  const getEmailStatus = (c: CampaignContact): 'pending' | 'sent' | 'delivered' | 'opened' | 'bounced' => {
    if (c.emailStatus) return c.emailStatus;
    if (c.emailSent) return 'sent';
    return 'pending';
  };

  // Helper to determine if a contact is sent or unsent
  const isContactSent = (c: CampaignContact): boolean => {
    if (selectedChannel === 'whatsapp') return !!c.whatsappSent;
    if (selectedChannel === 'email') return !!c.emailSent;
    return !!c.whatsappSent || !!c.emailSent;
  };

  const isContactUnsent = (c: CampaignContact): boolean => {
    if (selectedChannel === 'whatsapp') return !c.whatsappSent && !!c.phone;
    if (selectedChannel === 'email') return !c.emailSent && !!c.email;
    return (!c.whatsappSent && !!c.phone) || (!c.emailSent && !!c.email);
  };

  // Delivery & Engagement Counts
  const totalContactsCount = contacts.length;
  const unsentCount = contacts.filter((c) => isContactUnsent(c)).length;
  const sentCount = contacts.filter((c) => isContactSent(c)).length;

  const deliveredCount = contacts.filter((c) => {
    const wa = getWhatsAppStatus(c);
    const em = getEmailStatus(c);
    return wa === 'delivered' || wa === 'read' || em === 'delivered' || em === 'opened';
  }).length;

  const readOpenedCount = contacts.filter((c) => {
    const wa = getWhatsAppStatus(c);
    const em = getEmailStatus(c);
    return wa === 'read' || em === 'opened';
  }).length;

  const bouncedFailedCount = contacts.filter((c) => {
    const wa = getWhatsAppStatus(c);
    const em = getEmailStatus(c);
    return wa === 'failed' || em === 'bounced';
  }).length;

  const completionPercent = totalContactsCount > 0 ? Math.round((sentCount / totalContactsCount) * 100) : 0;

  // Source Counts
  const clientCount = contacts.filter((c) => c.source === 'customer_database').length;
  const savedLeadsCount = contacts.filter((c) => c.source === 'manual').length;
  const excelCount = contacts.filter((c) => c.source === 'excel').length;
  const demoCount = contacts.filter((c) => c.source === 'demo').length;

  // Filtered contacts
  const filteredContacts = contacts.filter((c) => {
    // Channel filter
    if (channelFilter === 'whatsapp' && !c.phone) return false;
    if (channelFilter === 'email' && !c.email) return false;

    // Delivery status filter (all / unsent / sent / delivered / read / bounced)
    if (deliveryFilter === 'unsent' && !isContactUnsent(c)) return false;
    if (deliveryFilter === 'sent' && !isContactSent(c)) return false;
    if (deliveryFilter === 'delivered') {
      const wa = getWhatsAppStatus(c);
      const em = getEmailStatus(c);
      if (wa !== 'delivered' && wa !== 'read' && em !== 'delivered' && em !== 'opened') return false;
    }
    if (deliveryFilter === 'read') {
      const wa = getWhatsAppStatus(c);
      const em = getEmailStatus(c);
      if (wa !== 'read' && em !== 'opened') return false;
    }
    if (deliveryFilter === 'bounced') {
      const wa = getWhatsAppStatus(c);
      const em = getEmailStatus(c);
      if (wa !== 'failed' && em !== 'bounced') return false;
    }

    // Source filter
    if (sourceFilter !== 'all' && c.source !== sourceFilter) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedContacts = contacts.filter((c) => c.selected);
  const whatsappTargetContacts = selectedContacts.filter((c) => !!c.phone);
  const emailTargetContacts = selectedContacts.filter((c) => !!c.email);

  // Toggle selection for all currently filtered contacts
  const toggleSelectAll = (checked: boolean) => {
    const targetIds = new Set(filteredContacts.map((c) => c.id));
    setContacts((prev) =>
      prev.map((c) => (targetIds.has(c.id) ? { ...c, selected: checked } : c))
    );
  };

  const toggleSelect = (id: string) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const isAllFilteredSelected =
    filteredContacts.length > 0 && filteredContacts.every((c) => c.selected);

  // Select the next N unsent contacts (e.g. 100 or 50) for batch sending
  const handleSelectNextBatch = (batchSize: number) => {
    let count = 0;
    setContacts((prev) =>
      prev.map((c) => {
        if (isContactUnsent(c) && count < batchSize) {
          count++;
          return { ...c, selected: true };
        }
        return { ...c, selected: false };
      })
    );
    setBatchActionMessage(`Selected next ${Math.min(batchSize, unsentCount)} unsent contacts for today's batch!`);
    setTimeout(() => setBatchActionMessage(''), 3000);
  };

  // Select all unsent contacts
  const handleSelectAllUnsent = () => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        selected: isContactUnsent(c),
      }))
    );
    setBatchActionMessage(`Selected all ${unsentCount} unsent contacts!`);
    setTimeout(() => setBatchActionMessage(''), 3000);
  };

  // Deselect all contacts
  const handleDeselectAll = () => {
    setContacts((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  // Reset delivery flags back to pending
  const handleResetDeliveryStatus = async () => {
    if (!confirm('Are you sure you want to reset all sent status flags back to Pending/Unsent?')) return;
    setContacts((prev) => {
      const next = prev.map((c) => ({
        ...c,
        whatsappSent: false,
        whatsappSentAt: undefined,
        emailSent: false,
        emailSentAt: undefined,
      }));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('quoteflow_campaign_contacts_v2', JSON.stringify({ contacts: next, fileName }));
        } catch {}
      }
      return next;
    });

    try {
      await fetch('/api/admin/campaigns/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_status', channel: 'all' }),
      });
    } catch {}
    setBatchActionMessage('Reset delivery status for all contacts.');
    setTimeout(() => setBatchActionMessage(''), 3000);
  };

  // Compile message for a specific contact
  const formatWhatsappMessage = (contactName: string) => {
    let msg = whatsappTemplate
      .replace(/{name}/gi, contactName || 'there')
      .replace(/{company}/gi, 'QuoteFlow')
      .replace(/{offer_code}/gi, promoCode)
      .replace(/{link}/gi, promoLink);

    if (attachedImageUrl && includeImageLinkInWhatsapp && !msg.includes(attachedImageUrl)) {
      msg += `\n\n🖼️ View Flyer: ${attachedImageUrl}`;
    }

    return msg;
  };

  // 1-Click WhatsApp Queue Flow
  const startWhatsappQueue = () => {
    if (whatsappTargetContacts.length === 0) {
      alert('Please select at least one contact with a valid WhatsApp phone number.');
      return;
    }
    setQueueIndex(0);
    setIsQueueActive(true);
  };

  const currentQueueContact = whatsappTargetContacts[queueIndex];

  const handleSendCurrentQueue = () => {
    if (!currentQueueContact) return;

    const message = formatWhatsappMessage(currentQueueContact.name);
    const encodedText = encodeURIComponent(message);
    const directUrl = `https://wa.me/${currentQueueContact.phone}?text=${encodedText}`;

    // Open WhatsApp Web in new tab
    window.open(directUrl, '_blank', 'noopener,noreferrer');

    // Mark as sent in local state & persistent storage
    setSentContactIds((prev) => new Set(prev).add(currentQueueContact.id));

    const updatedContact: CampaignContact = {
      ...currentQueueContact,
      whatsappSent: true,
      whatsappSentAt: new Date().toISOString(),
    };

    setContacts((prev) => {
      const next = prev.map((c) => (c.id === currentQueueContact.id ? updatedContact : c));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('quoteflow_campaign_contacts_v2', JSON.stringify({ contacts: next, fileName }));
        } catch {}
      }
      return next;
    });

    fetch('/api/admin/campaigns/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_sent',
        contactIds: [currentQueueContact.id],
        channel: 'whatsapp',
      }),
    }).catch(() => {});

    // Auto-advance
    if (queueIndex < whatsappTargetContacts.length - 1) {
      setQueueIndex((prev) => prev + 1);
    } else {
      // Completed queue
      recordCompletedCampaign('whatsapp_queue', sentContactIds.size + 1);
    }
  };

  const handleSkipCurrentQueue = () => {
    if (!currentQueueContact) return;
    setSkippedContactIds((prev) => new Set(prev).add(currentQueueContact.id));
    if (queueIndex < whatsappTargetContacts.length - 1) {
      setQueueIndex((prev) => prev + 1);
    }
  };

  const recordCompletedCampaign = async (channel: string, count: number) => {
    try {
      await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          channel,
          totalRecipients: count,
          messagePreview: whatsappTemplate.slice(0, 150),
          stats: { sent: count, failed: 0 },
        }),
      });
      fetchHistoryAndConfig();
    } catch {}
  };

  // Email Batch Broadcast
  const handleLaunchEmailBroadcast = async () => {
    if (emailTargetContacts.length === 0) {
      alert('Please select at least one contact with a valid email address.');
      return;
    }

    if (!confirm(`Are you sure you want to send this promotional email broadcast to ${emailTargetContacts.length} recipients via Resend?`)) {
      return;
    }

    setIsSendingEmail(true);
    setEmailProgress({ sent: 0, total: emailTargetContacts.length, failed: 0 });
    setEmailBroadcastDone(false);

    try {
      const res = await fetch('/api/admin/campaigns/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: emailTargetContacts.map((c) => ({ name: c.name, email: c.email })),
          subject: emailSubject,
          messageBody: emailBody,
          offerCode: promoCode,
          ctaLink: promoLink,
          ctaText: emailCtaText,
          imageUrl: attachedImageUrl,
          fromEmail: emailFromAddress,
          fromName: emailFromName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailProgress({
          sent: data.sentCount || 0,
          total: emailTargetContacts.length,
          failed: data.failedCount || 0,
        });
        setEmailBroadcastDone(true);
        recordCompletedCampaign('email_resend', data.sentCount || 0);

        // Mark sent status for the emailed contacts!
        const sentIds = emailTargetContacts.map((c) => c.id);
        const nowIso = new Date().toISOString();
        setContacts((prev) => {
          const next = prev.map((c) =>
            sentIds.includes(c.id) ? { ...c, emailSent: true, emailSentAt: nowIso } : c
          );
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('quoteflow_campaign_contacts_v2', JSON.stringify({ contacts: next, fileName }));
            } catch {}
          }
          return next;
        });

        fetch('/api/admin/campaigns/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_sent',
            contactIds: sentIds,
            channel: 'email',
          }),
        }).catch(() => {});
      } else {
        alert('Email broadcast failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Error during email broadcast: ' + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Meta WhatsApp Cloud API Automated Broadcast
  const handleLaunchMetaWhatsAppBroadcast = async () => {
    if (whatsappTargetContacts.length === 0) {
      alert('Please select at least one contact with a valid WhatsApp phone number.');
      return;
    }

    if (!confirm(`Are you sure you want to broadcast this WhatsApp campaign to ${whatsappTargetContacts.length} recipients via Meta WhatsApp Cloud API?`)) {
      return;
    }

    setIsSendingMetaWhatsApp(true);
    setMetaWhatsAppProgress({ sent: 0, total: whatsappTargetContacts.length, failed: 0 });
    setMetaWhatsAppBroadcastDone(false);

    try {
      const res = await fetch('/api/admin/campaigns/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: whatsappTargetContacts.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || c.rawPhone,
            company: c.company,
          })),
          messageText: whatsappTemplate,
          promoCode,
          promoLink,
          companyName: 'QuoteFlow',
          useTemplate: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMetaWhatsAppProgress({
          sent: data.sentCount || 0,
          total: whatsappTargetContacts.length,
          failed: data.failedCount || 0,
        });
        setMetaWhatsAppBroadcastDone(true);
        recordCompletedCampaign('meta_cloud_api', data.sentCount || 0);

        const successfulIds = data.successfulContactIds || whatsappTargetContacts.map((c) => c.id);
        const nowIso = new Date().toISOString();
        setContacts((prev) => {
          const next = prev.map((c) =>
            successfulIds.includes(c.id)
              ? { ...c, whatsappSent: true, whatsappSentAt: nowIso, whatsappStatus: 'sent' }
              : c
          );
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('quoteflow_campaign_contacts_v2', JSON.stringify({ contacts: next, fileName }));
            } catch {}
          }
          return next;
        });

        fetch('/api/admin/campaigns/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_sent',
            contactIds: successfulIds,
            channel: 'whatsapp',
          }),
        }).catch(() => {});
      } else {
        alert('Meta WhatsApp broadcast failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      alert('Error during Meta WhatsApp broadcast: ' + e.message);
    } finally {
      setIsSendingMetaWhatsApp(false);
    }
  };

  const handleSendTestWhatsApp = async () => {
    if (!testPhoneNumber.trim()) {
      alert('Please enter a valid mobile number with country code (e.g. 919876543210).');
      return;
    }
    try {
      setIsSendingTestMessage(true);
      setTestMessageResult(null);
      const res = await fetch('/api/admin/campaigns/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: 'Admin Test', phone: testPhoneNumber.trim() }],
          messageText: 'This is a test notification from QuoteFlow Developer Admin via Meta WhatsApp Cloud API.',
          promoCode: 'TEST2026',
          promoLink: 'https://www.blendandbold.com',
          useTemplate: false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestMessageResult(`✓ Successfully sent test message to ${testPhoneNumber}! Source: ${data.provider}`);
      } else {
        setTestMessageResult(`✕ Failed: ${data.error || 'Could not send test message'}`);
      }
    } catch (err: any) {
      setTestMessageResult(`✕ Error: ${err.message}`);
    } finally {
      setIsSendingTestMessage(false);
    }
  };

  // Save Gateway Config
  const handleSaveGateway = async () => {
    setIsSavingGateway(true);
    try {
      const res = await fetch('/api/admin/campaigns/gateway-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayConfig),
      });
      if (res.ok) {
        setGatewaySaveSuccess(true);
        setTimeout(() => setGatewaySaveSuccess(false), 3000);
      }
    } catch (e) {
      alert('Failed to save gateway config');
    } finally {
      setIsSavingGateway(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-white to-violet-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Send className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
                Marketing &amp; Promotional Broadcasts
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                WhatsApp Queue Active (100% Free)
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Upload spreadsheets or manually enter contacts. Send targeted promotions with personalized merge tags, zero Meta setup fees, flyer image attachments, and automated Resend emails.
            </p>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setActiveSubTab('campaign')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === 'campaign'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              New Campaign
            </button>
            <button
              onClick={() => {
                setActiveSubTab('templates');
                if (templates.length === 0) fetchTemplates();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'templates'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Mail className="h-3 w-3" />
              <span>Email Templates ({templates.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeSubTab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Past Campaigns ({campaignHistory.length})
            </button>
            <button
              onClick={() => setActiveSubTab('gateway')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                activeSubTab === 'gateway'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Settings className="h-3 w-3" />
              <span>Gateway API</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: NEW CAMPAIGN WORKFLOW */}
      {activeSubTab === 'campaign' && (
        <div className="space-y-6">
          {/* STEP 1: CONTACTS INGESTION (EXCEL UPLOAD OR MANUAL ADD) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Step 1: Add Contacts (Spreadsheet or Manual Entry)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Upload Excel (.xlsx, .csv) or click "+ Add Contact Manually" to type in numbers. Contacts do NOT need to be saved in your phone!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                  className="text-xs gap-1.5 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-100/60 font-bold"
                  title="Manually type in a WhatsApp number and email"
                >
                  <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isManualAddOpen ? 'Close Manual Entry' : '+ Add Contact Manually'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadSavedContacts}
                  disabled={isLoadingContacts}
                  className="text-xs gap-1.5 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 font-bold"
                  title="Load all saved contacts and QuoteFlow customer clients from database"
                >
                  {isLoadingContacts ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                  )}
                  <span>
                    Load Contacts {savedContactsList.length > 0 ? `(${savedContactsList.length})` : ''}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSampleData}
                  className="text-xs gap-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Load 5 demo test contacts for quick testing"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Load Demo Leads</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadSample}
                  className="text-xs gap-1.5 text-slate-700 dark:text-slate-300"
                  title="Download an Excel template to test"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Sample Excel</span>
                </Button>
              </div>
            </div>

            {/* MANUAL CONTACT INPUT FORM (EXPANDABLE) */}
            {isManualAddOpen && (
              <form onSubmit={handleAddManualContact} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Quick Add Contact (No Excel File Required)
                    </span>
                  </div>
                  {manualAddSuccess && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 animate-pulse">
                      <Check className="h-3 w-3" /> Contact Added Successfully!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Full Name
                    </label>
                    <Input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="text-xs h-9 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      WhatsApp Mobile Number
                    </label>
                    <Input
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="e.g. 9876543210 or +91..."
                      className="text-xs h-9 font-mono bg-white dark:bg-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Auto-normalizes: 10-digit numbers get +91
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Email Address (Optional)
                    </label>
                    <Input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="e.g. rahul@example.com"
                      className="text-xs h-9 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Company / Business (Optional)
                    </label>
                    <Input
                      value={manualCompany}
                      onChange={(e) => setManualCompany(e.target.value)}
                      placeholder="e.g. Apex Traders"
                      className="text-xs h-9 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsManualAddOpen(false)}
                    className="text-xs h-8 text-slate-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add to Recipient List</span>
                  </Button>
                </div>
              </form>
            )}

            {/* Drag & Drop Upload Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-850 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {fileName ? (
                    <span className="text-indigo-600 font-bold flex items-center gap-1.5 justify-center">
                      <FileSpreadsheet className="h-4 w-4" />
                      Active list: {fileName} ({contacts.length} contacts)
                    </span>
                  ) : (
                    <>
                      <span className="text-indigo-600 font-bold">Click to browse</span> or drag and drop your Excel or CSV file
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Auto-detects Name, Email, and WhatsApp/Mobile columns. Missing country codes are normalized to India (+91) by default.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: CONTACTS REVIEW & VERIFICATION TABLE */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            {/* Batch Dispatch Progress & Quick Actions Card */}
            {contacts.length > 0 && (
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/70 via-slate-50/70 to-purple-50/70 dark:from-slate-850 dark:via-slate-850 dark:to-indigo-950/40 p-4 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <span>Batch Dispatch Progress</span>
                      <span className="text-indigo-600 font-extrabold">({selectedChannel.toUpperCase()})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-base font-extrabold text-slate-900 dark:text-white mr-1">
                        {sentCount} of {totalContactsCount} Sent
                      </span>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[11px]">
                        ⏳ {unsentCount} Unsent
                      </Badge>
                      <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-[11px]">
                        ✓✓ {deliveredCount} Delivered
                      </Badge>
                      <Badge variant="outline" className="bg-violet-50 text-violet-800 border-violet-300 font-bold text-[11px]">
                        👁️ {readOpenedCount} Read / Opened
                      </Badge>
                      {bouncedFailedCount > 0 && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[11px]">
                          🚫 {bouncedFailedCount} Bounced / Failed
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500 font-semibold ml-1">({completionPercent}% Completed)</span>
                    </div>
                  </div>

                  {/* Batch Selection Actions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSelectNextBatch(100)}
                      disabled={unsentCount === 0}
                      className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                      title="Automatically check the next 100 unsent contacts for today's batch"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      <span>Select Next 100 Unsent</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectNextBatch(50)}
                      disabled={unsentCount === 0}
                      className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-300"
                      title="Select next 50 unsent contacts"
                    >
                      <span>Next 50</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAllUnsent}
                      disabled={unsentCount === 0}
                      className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border-slate-300"
                    >
                      <span>All Unsent</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleDeselectAll}
                      className="h-8 text-xs text-slate-500 hover:text-slate-800"
                    >
                      <span>Clear</span>
                    </Button>
                    {sentCount > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleResetDeliveryStatus}
                        className="h-8 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Reset all sent status flags back to pending/unsent"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        <span>Reset</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                {batchActionMessage && (
                  <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{batchActionMessage}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span>Step 2: Review Recipient List ({contacts.length} Total)</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                      💬 {contacts.filter((c) => !!c.phone).length} WhatsApp Ready
                    </Badge>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-800 border-indigo-300">
                      ✉️ {contacts.filter((c) => !!c.email).length} Email Ready
                    </Badge>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                      ✓ {selectedContacts.length} Selected to Send
                    </Badge>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                {contacts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, phone, email..."
                        className="h-8 pl-8 text-xs w-40 sm:w-48"
                      />
                    </div>

                    {/* Source Filter Dropdown */}
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value as any)}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 font-medium"
                      title="Filter by Contact Source"
                    >
                      <option value="all">All Sources ({contacts.length})</option>
                      <option value="customer_database">QuoteFlow Client ({clientCount})</option>
                      <option value="manual">Saved Leads ({savedLeadsCount})</option>
                      <option value="excel">Excel Import ({excelCount})</option>
                      <option value="demo">Demo ({demoCount})</option>
                    </select>

                    {/* Channel Filter Dropdown */}
                    <select
                      value={channelFilter}
                      onChange={(e) => setChannelFilter(e.target.value as any)}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 font-medium"
                      title="Filter by Channel"
                    >
                      <option value="all">All Channels</option>
                      <option value="whatsapp">WhatsApp Only</option>
                      <option value="email">Email Only</option>
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCleanDuplicates}
                      className="text-xs text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 h-8 px-2.5 gap-1.5 font-medium"
                      title="Scan and delete duplicate contacts with matching phone or email"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      <span>Clean Duplicates</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setContacts([])}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                      title="Clear list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Filter Pills (Delivery Status & Source) */}
              {contacts.length > 0 && (
                <div className="space-y-2 pt-1">
                  {/* Delivery Status Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
                      Delivery Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        deliveryFilter === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      All ({totalContactsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter('unsent')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        deliveryFilter === 'unsent'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      ⏳ Pending ({unsentCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter('delivered')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        deliveryFilter === 'delivered'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                      }`}
                    >
                      ✓✓ Delivered ({deliveredCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter('read')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        deliveryFilter === 'read'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800'
                      }`}
                    >
                      👁️ Read / Opened ({readOpenedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter('bounced')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        deliveryFilter === 'bounced'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                      }`}
                    >
                      🚫 Bounced / Failed ({bouncedFailedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryFilter('sent')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        deliveryFilter === 'sent'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      ✓ Already Sent ({sentCount})
                    </button>
                  </div>

                  {/* Source Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" /> Source Filter:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSourceFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        sourceFilter === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      All ({contacts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceFilter('customer_database')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        sourceFilter === 'customer_database'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                      }`}
                    >
                      QuoteFlow Client ({clientCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceFilter('manual')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        sourceFilter === 'manual'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      Saved Leads ({savedLeadsCount})
                    </button>
                    {excelCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setSourceFilter('excel')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          sourceFilter === 'excel'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                        }`}
                      >
                        Excel Import ({excelCount})
                      </button>
                    )}
                    {demoCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setSourceFilter('demo')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          sourceFilter === 'demo'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        Demo ({demoCount})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Table or Empty State */}
            {contacts.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="h-10 w-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No contacts loaded in recipient list yet.
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click below to load saved contacts from your database, manually add phone numbers, or upload a spreadsheet.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleLoadSavedContacts}
                    disabled={isLoadingContacts}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
                  >
                    {isLoadingContacts ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    <span>Load Saved Contacts {savedContactsList.length > 0 ? `(${savedContactsList.length})` : ''}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsManualAddOpen(true)}
                    className="text-xs gap-1 text-emerald-700 border-emerald-300"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+ Add Contact Manually</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddSampleData}
                    className="text-xs gap-1 text-slate-600 border-slate-200"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Load Demo Leads</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-850 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">WhatsApp / Phone</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Source</th>
                      <th className="p-2.5">Channels Ready</th>
                      <th className="p-2.5">Delivery Status</th>
                      <th className="p-2.5 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredContacts.map((c) => (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          c.whatsappSent || c.emailSent
                            ? 'bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-100/60'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-850/60'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td
                          className="p-2.5 font-semibold text-slate-900 dark:text-slate-100 cursor-pointer group"
                          onClick={() => handleOpenEditContact(c)}
                          title="Click to edit contact (Name, Phone, Email, Company)"
                        >
                          <div className="flex items-center gap-1.5 group-hover:text-indigo-600 transition-colors">
                            <span>{c.name}</span>
                            {(c.whatsappSent || c.emailSent) && (
                              <span title="Contact has received marketing">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          {c.company ? (
                            <div className="text-[10px] text-slate-400 group-hover:text-indigo-500 font-normal transition-colors">
                              {c.company}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-300 dark:text-slate-600 italic font-normal group-hover:text-indigo-400 transition-colors">
                              + Add Company
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                          {c.phone ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              +{c.phone}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No number</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {c.email || <span className="text-slate-400 italic">No email</span>}
                        </td>
                        <td className="p-2.5">
                          {c.source === 'customer_database' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              QuoteFlow Client
                            </span>
                          ) : c.source === 'manual' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Saved Lead
                            </span>
                          ) : c.source === 'excel' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Excel Import
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Demo
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            {c.phone && (
                              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                                WhatsApp
                              </span>
                            )}
                            {c.email && (
                              <span className="rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 text-[10px] font-bold">
                                Email
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-col gap-1">
                            {c.phone && (
                              <div>
                                {(() => {
                                  const waStatus = getWhatsAppStatus(c);
                                  if (waStatus === 'read') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold border border-sky-200 dark:border-sky-800" title={c.whatsappReadAt ? `Read on ${new Date(c.whatsappReadAt).toLocaleString()}` : 'WhatsApp Message Read'}>
                                        <CheckCheck className="h-3 w-3 text-sky-500" />
                                        <span>WA Read</span>
                                      </span>
                                    );
                                  }
                                  if (waStatus === 'delivered') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 text-[10px] font-bold border border-teal-200 dark:border-teal-800" title={c.whatsappDeliveredAt ? `Delivered on ${new Date(c.whatsappDeliveredAt).toLocaleString()}` : 'WhatsApp Message Delivered'}>
                                        <CheckCheck className="h-3 w-3 text-teal-600" />
                                        <span>WA Delivered</span>
                                      </span>
                                    );
                                  }
                                  if (waStatus === 'failed') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-bold border border-rose-200 dark:border-rose-800" title="WhatsApp Delivery Failed / Invalid Number">
                                        <AlertCircle className="h-3 w-3 text-rose-500" />
                                        <span>WA Failed</span>
                                      </span>
                                    );
                                  }
                                  if (waStatus === 'sent') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        <span>WA Sent</span>
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center rounded bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-medium border border-amber-200/80 dark:border-amber-900">
                                      WA Pending
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                            {c.email && (
                              <div>
                                {(() => {
                                  const emStatus = getEmailStatus(c);
                                  if (emStatus === 'opened') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-bold border border-violet-200 dark:border-violet-800" title={c.emailOpenedAt ? `Opened on ${new Date(c.emailOpenedAt).toLocaleString()}` : 'Email Opened by Recipient'}>
                                        <Eye className="h-3 w-3 text-violet-600" />
                                        <span>Email Opened</span>
                                      </span>
                                    );
                                  }
                                  if (emStatus === 'delivered') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold border border-sky-200 dark:border-sky-800" title={c.emailDeliveredAt ? `Delivered on ${new Date(c.emailDeliveredAt).toLocaleString()}` : 'Email Delivered to Inbox'}>
                                        <CheckCheck className="h-3 w-3 text-sky-600" />
                                        <span>Email Delivered</span>
                                      </span>
                                    );
                                  }
                                  if (emStatus === 'bounced') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-bold border border-rose-200 dark:border-rose-800" title={c.emailBounceReason || 'Email Bounced / Mailbox Unavailable'}>
                                        <XCircle className="h-3 w-3 text-rose-600" />
                                        <span>Email Bounced</span>
                                      </span>
                                    );
                                  }
                                  if (emStatus === 'sent') {
                                    return (
                                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800">
                                        <Check className="h-3 w-3 text-indigo-600" />
                                        <span>Email Sent</span>
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                                      Email Pending
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditContact(c)}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                              title="Edit contact details & delivery status"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(c.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                              title="Remove contact"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* STEP 3: CAMPAIGN DESIGNER, IMAGE ATTACHMENT & LIVE PREVIEWS */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <span>Step 3: Message Designer, Image Attachment &amp; Live Previews</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Insert dynamic variables like <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono font-bold text-indigo-600">{'{name}'}</code> to personalize every single message.
              </p>
            </div>

            {/* Campaign Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Campaign Title
                </label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. October Pro Promo"
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Promo / Coupon Code
                </label>
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="PROMO99"
                  className="text-xs h-9 uppercase font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Target Link (Landing / Signup)
                </label>
                <Input
                  value={promoLink}
                  onChange={(e) => setPromoLink(e.target.value)}
                  placeholder="https://blendandbold.com?ref=promo"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* ATTACH PROMOTIONAL IMAGE / FLYER SECTION */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Attach Promotional Image / Flyer (Optional)
                  </span>
                </div>
                {attachedImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedImageUrl('');
                      setAttachedImageName('');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove Flyer</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageFileChange}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="text-xs gap-1.5 h-8 bg-white dark:bg-slate-900 font-semibold"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-500" />
                  <span>{isUploadingImage ? 'Uploading Image...' : 'Upload Image File'}</span>
                </Button>

                <span className="text-[11px] text-slate-400">or enter image link:</span>

                <Input
                  value={attachedImageUrl}
                  onChange={(e) => {
                    setAttachedImageUrl(e.target.value);
                    setAttachedImageName('External Image URL');
                  }}
                  placeholder="https://blendandbold.com/banner.png"
                  className="text-xs h-8 max-w-sm font-mono bg-white dark:bg-slate-900"
                />
              </div>

              {attachedImageUrl && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="h-16 w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center p-0.5 shadow-2xs">
                    <img
                      src={attachedImageUrl}
                      alt="Campaign Banner Preview"
                      className="h-full w-full object-cover rounded"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{attachedImageName || 'Banner Image Attached'}</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeImageLinkInWhatsapp}
                        onChange={(e) => setIncludeImageLinkInWhatsapp(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Include flyer link in WhatsApp message for rich image thumbnail preview</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Channel Tabs */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Delivery Channel:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChannel('whatsapp')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedChannel === 'whatsapp'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp Queue (Free)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('email')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedChannel === 'email'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Email Broadcast (Resend)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedChannel('both')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedChannel === 'both'
                      ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 ring-2 ring-violet-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                  <span>Both Channels</span>
                </button>
              </div>
            </div>

            {/* Merge Tags Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-400 font-semibold mr-1">Insert Variable:</span>
              <button
                type="button"
                onClick={() => setWhatsappTemplate((prev) => prev + ' {name}')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                + {'{name}'}
              </button>
              <button
                type="button"
                onClick={() => setWhatsappTemplate((prev) => prev + ' *{offer_code}*')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                + {'{offer_code}'}
              </button>
              <button
                type="button"
                onClick={() => setWhatsappTemplate((prev) => prev + ' {link}')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                + {'{link}'}
              </button>
              <button
                type="button"
                onClick={() => setWhatsappTemplate((prev) => prev + ' {company}')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                + {'{company}'}
              </button>
            </div>

            {/* Side-by-Side: Inputs & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Text Inputs */}
              <div className="lg:col-span-7 space-y-4">
                {(selectedChannel === 'whatsapp' || selectedChannel === 'both') && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        WhatsApp Message Body
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Formatting: *bold*, _italic_, ~strike~
                      </span>
                    </label>
                    <Textarea
                      rows={6}
                      value={whatsappTemplate}
                      onChange={(e) => setWhatsappTemplate(e.target.value)}
                      className="text-xs leading-relaxed font-sans"
                    />
                  </div>
                )}

                {(selectedChannel === 'email' || selectedChannel === 'both') && (
                  <div className="space-y-3 pt-2">
                    {/* Sender Profile (From Address & Name) */}
                    <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-indigo-600" />
                          Sender Profile (From Address)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Resend Verified (@blendandbold.com)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Sender Name
                          </label>
                          <Input
                            value={emailFromName}
                            onChange={(e) => setEmailFromName(e.target.value)}
                            placeholder="QuoteFlow Marketing"
                            className="text-xs h-8 bg-white dark:bg-slate-900 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Sender Email Address
                          </label>
                          <Input
                            value={emailFromAddress}
                            onChange={(e) => setEmailFromAddress(e.target.value)}
                            placeholder="marketing@blendandbold.com"
                            className="text-xs h-8 font-mono bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      {/* Quick Address Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                        <span className="text-slate-400 font-semibold mr-1">Quick Select:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailFromAddress('marketing@blendandbold.com');
                            setEmailFromName('QuoteFlow Marketing');
                          }}
                          className={`px-2 py-0.5 rounded font-mono transition-colors ${
                            emailFromAddress === 'marketing@blendandbold.com'
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                          }`}
                        >
                          marketing@blendandbold.com
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailFromAddress('quotes@blendandbold.com');
                            setEmailFromName('QuoteFlow');
                          }}
                          className={`px-2 py-0.5 rounded font-mono transition-colors ${
                            emailFromAddress === 'quotes@blendandbold.com'
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                          }`}
                        >
                          quotes@blendandbold.com
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailFromAddress('hello@blendandbold.com');
                            setEmailFromName('QuoteFlow Team');
                          }}
                          className={`px-2 py-0.5 rounded font-mono transition-colors ${
                            emailFromAddress === 'hello@blendandbold.com'
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50'
                          }`}
                        >
                          hello@blendandbold.com
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        Email Subject Line
                      </label>
                      <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Subject..."
                        className="text-xs h-9 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Main Text
                      </label>
                      <Textarea
                        rows={4}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="text-xs leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        CTA Button Label
                      </label>
                      <Input
                        value={emailCtaText}
                        onChange={(e) => setEmailCtaText(e.target.value)}
                        className="text-xs h-8 max-w-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Live Mockup Previews */}
              <div className="lg:col-span-5 space-y-4">
                {(selectedChannel === 'whatsapp' || selectedChannel === 'both') && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                      Live WhatsApp Bubble Preview
                    </span>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#efeae2] dark:bg-slate-950 p-4 shadow-inner relative overflow-hidden">
                      <div className="max-w-[90%] ml-auto bg-[#d9fdd3] dark:bg-emerald-950 text-slate-900 dark:text-emerald-100 rounded-2xl rounded-tr-xs p-3 text-xs leading-relaxed shadow-xs relative space-y-2">
                        {attachedImageUrl && (
                          <div className="rounded-lg overflow-hidden border border-emerald-200/50 dark:border-emerald-800/60 max-h-36">
                            <img src={attachedImageUrl} alt="Preview flyer" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="whitespace-pre-wrap font-sans">
                          {formatWhatsappMessage(contacts[0]?.name || 'Rahul')}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[9px] text-slate-500 mt-1 font-mono">
                          <span>12:45 PM</span>
                          <span className="text-sky-600">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedChannel === 'email' || selectedChannel === 'both') && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-indigo-600" />
                      Live Email Card Preview
                    </span>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs text-xs space-y-2.5">
                      {/* Sender Info Badge */}
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="h-6 w-6 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <img
                            src="https://blendandbold.com/quoteflow-icon.png"
                            alt="QuoteFlow Logo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                            {emailFromName || 'QuoteFlow Marketing'}
                          </div>
                          <div className="text-slate-500 truncate font-mono text-[9px]">
                            &lt;{emailFromAddress || 'marketing@blendandbold.com'}&gt;
                          </div>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                          Verified
                        </span>
                      </div>

                      {/* Top Header with Transparent QuoteFlow Logo */}
                      <div className="text-center py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <img
                          src="https://www.blendandbold.com/quoteflow-logo-transparent.png"
                          alt="QuoteFlow by blendandbold"
                          className="h-7 mx-auto object-contain"
                        />
                      </div>

                      {/* Hero Section */}
                      <div className="p-4 rounded-xl text-white text-center space-y-2 shadow-xs bg-gradient-to-r from-[#a33cff] via-[#5a46f8] to-[#1ca7f7]">
                        <div className="text-[9px] font-bold tracking-wider uppercase text-white/90">
                          QUOTING &bull; INVOICING &bull; SIMPLIFIED
                        </div>
                        <div className="font-extrabold text-sm leading-tight text-white">
                          From Quote to Payment.<br />Beautifully Simple.
                        </div>
                        <p className="text-[10px] text-white/90 leading-relaxed max-w-xs mx-auto">
                          Create quotations, convert to invoices, get 1-tap customer approvals and manage client billing from one cloud workspace.
                        </p>
                        <div className="pt-1">
                          <span className="inline-block px-3 py-1.5 rounded-lg bg-white text-[#5638e8] font-extrabold text-[10px] shadow-sm">
                            {emailCtaText || 'Start Your 14-Day Free Trial →'}
                          </span>
                        </div>
                      </div>

                      {attachedImageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-32">
                          <img src={attachedImageUrl} alt="Email banner" className="w-full h-full object-cover" />
                        </div>
                      )}

                      {/* Intro & Personalized Greeting */}
                      <div className="space-y-1.5 pt-1">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          Hi {contacts[0]?.name || 'Rahul'},
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-3">
                          {emailBody}
                        </p>
                      </div>

                      {promoCode && (
                        <div className="p-2 rounded-lg bg-indigo-50 text-center font-mono font-bold text-indigo-700 text-xs border border-dashed border-indigo-300">
                          Code: {promoCode}
                        </div>
                      )}

                      {/* Mini Feature Highlights */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300">
                          <span className="text-indigo-600 font-bold">✦</span>
                          <span>Professional Quotes in Minutes</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>Easy Approvals via WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-700 dark:text-slate-300">
                          <span className="text-violet-600 font-bold">↗</span>
                          <span>Instant Quote &rarr; Sequential GST Invoice</span>
                        </div>
                      </div>

                      {/* Simple Workflow Bar */}
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-center text-[9px] font-bold text-slate-600 dark:text-slate-400">
                        Create <span className="text-indigo-500">&rarr;</span> Send <span className="text-indigo-500">&rarr;</span> Approve <span className="text-indigo-500">&rarr;</span> Invoice <span className="text-indigo-500">&rarr;</span> Paid
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 4: LAUNCH BAR */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {selectedContacts.length === 0 ? (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" /> Please select at least one contact above.
                  </span>
                ) : (
                  <span>
                    Ready to send to <strong className="text-slate-900 dark:text-slate-100 font-bold">{selectedContacts.length} contacts</strong> ({whatsappTargetContacts.length} via WhatsApp, {emailTargetContacts.length} via Email).
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {(selectedChannel === 'whatsapp' || selectedChannel === 'both') && (
                  <>
                    <Button
                      onClick={handleLaunchMetaWhatsAppBroadcast}
                      disabled={whatsappTargetContacts.length === 0 || isSendingMetaWhatsApp}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-700/20"
                    >
                      {isSendingMetaWhatsApp ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Sending via Meta API ({metaWhatsAppProgress?.sent || 0}/{whatsappTargetContacts.length})...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Meta Cloud API Broadcast ({whatsappTargetContacts.length})</span>
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={startWhatsappQueue}
                      disabled={whatsappTargetContacts.length === 0}
                      variant="outline"
                      className="border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold text-xs gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>1-Click Queue (wa.me)</span>
                    </Button>
                  </>
                )}

                {(selectedChannel === 'email' || selectedChannel === 'both') && (
                  <Button
                    onClick={handleLaunchEmailBroadcast}
                    disabled={emailTargetContacts.length === 0 || isSendingEmail}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Sending via Resend...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        <span>Launch Email Broadcast ({emailTargetContacts.length})</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PAST CAMPAIGNS */}
      {activeSubTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Campaign Dispatch History
              </h3>
              <p className="text-xs text-slate-500">
                Audit logs of promotional broadcasts and WhatsApp queues launched by developer admins.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchHistoryAndConfig} className="text-xs gap-1">
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </Button>
          </div>

          {campaignHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No marketing campaigns launched yet. Start your first campaign from the "New Campaign" tab!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {campaignHistory.map((camp: any) => (
                <div key={camp.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{camp.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {camp.channel === 'whatsapp_queue' ? '💬 WhatsApp Queue' : '✉️ Resend Email'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{camp.messagePreview}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {camp.totalRecipients} Recipients
                    </span>
                    <div className="text-[10px] text-slate-400">
                      {new Date(camp.createdAt).toLocaleDateString()} by {camp.createdBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: GATEWAY API CONFIGURATION */}
      {activeSubTab === 'gateway' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-5 max-w-3xl">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-600" />
              <span>WhatsApp Gateway &amp; API Settings</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose between the 100% Free 1-Click WhatsApp Queue (Zero API costs) or configure an automated Gateway (Meta Cloud API / UltraMsg) when you are ready to automate background dispatch.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dispatch Mode:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setGatewayConfig({ ...gatewayConfig, provider: 'queue' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    gatewayConfig.provider === 'queue'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      1-Click WhatsApp Queue (Active &amp; Free)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Recommended today. 100% free, zero Meta verification or monthly fees. Opens pre-filled chat in WhatsApp Web.
                  </p>
                </div>

                <div
                  onClick={() => setGatewayConfig({ ...gatewayConfig, provider: 'meta_cloud' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    gatewayConfig.provider === 'meta_cloud'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Meta WhatsApp Cloud API (Automated)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sends in background from your official business number. Requires Meta Business Account verification &amp; template message approval.
                  </p>
                </div>
              </div>
            </div>

            {gatewayConfig.provider === 'meta_cloud' && (
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Meta Phone Number ID
                  </label>
                  <Input
                    value={gatewayConfig.metaPhoneNumberId}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, metaPhoneNumberId: e.target.value })}
                    placeholder="e.g. 104928374829102"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Meta System User Permanent Token
                  </label>
                  <Input
                    type="password"
                    value={gatewayConfig.metaAccessToken}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, metaAccessToken: e.target.value })}
                    placeholder="EAA..."
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/50">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Webhook Callback URL:
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono flex items-center justify-between">
                    <span className="truncate">https://www.blendandbold.com/api/webhooks/meta/whatsapp</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://www.blendandbold.com/api/webhooks/meta/whatsapp');
                        alert('Copied Webhook URL!');
                      }}
                      className="text-indigo-600 font-bold hover:underline shrink-0 ml-2"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Test WhatsApp Message Panel */}
                <div className="pt-3 border-t border-indigo-200/50 dark:border-indigo-900/50 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Send Test WhatsApp Ping (Verify Credentials)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder="e.g. 919876543210 (with country code)"
                      className="text-xs h-8 font-mono max-w-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendTestWhatsApp}
                      disabled={isSendingTestMessage || !testPhoneNumber.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8"
                    >
                      {isSendingTestMessage ? 'Sending...' : 'Send Test Ping'}
                    </Button>
                  </div>
                  {testMessageResult && (
                    <div
                      className={`text-[11px] p-2 rounded-lg font-medium ${
                        testMessageResult.startsWith('✓')
                          ? 'bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100/70 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {testMessageResult}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleSaveGateway}
                disabled={isSavingGateway}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                {gatewaySaveSuccess ? '✓ Saved Successfully' : isSavingGateway ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: CUSTOM HTML/CSS EMAIL TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          {/* Header & Template Picker */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-indigo-600" />
                  <span>Custom HTML + CSS Email Template Designer</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Write raw HTML, inject scoped responsive CSS, preview live on desktop and mobile viewports, and send instant test deliveries.
                </p>
              </div>

              {/* Template Selector & Management Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Template:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const found = templates.find((t) => t.id === e.target.value);
                      if (found) selectTemplate(found);
                    }}
                    disabled={isLoadingTemplates}
                    aria-label="Select custom email template"
                    className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 max-w-[220px] truncate"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isDefault ? '★' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewTemplate}
                  className="text-xs gap-1.5 font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Template</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicateTemplate}
                  disabled={!selectedTemplateId || isSavingTemplate}
                  className="text-xs gap-1.5"
                  title="Duplicate current template"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicate</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteTemplate}
                  disabled={!selectedTemplateId || isSavingTemplate || templates.length <= 1}
                  className="text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  title="Delete template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>

            {/* Main Template Work Area (Grid: Left Editor, Right Live Preview) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* LEFT COLUMN: Template Metadata, Variable Chips & Code Editor */}
              <div className="lg:col-span-6 space-y-4">
                {/* Template Name & Subject */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Template Name
                    </label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. QuoteFlow Pro Launch Offer"
                      className="text-xs h-9 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Email Subject Line
                    </label>
                    <Input
                      value={templateSubject}
                      onChange={(e) => setTemplateSubject(e.target.value)}
                      placeholder="e.g. Special Offer: Accelerate your business with QuoteFlow Pro 🚀"
                      className="text-xs h-9 font-medium"
                    />
                  </div>
                </div>

                {/* Variable Replacement Chips */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Dynamic Variable Chips (Click to Insert)</span>
                    </span>
                    {copiedTag && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-fadeIn">
                        Inserted &amp; Copied: {copiedTag}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { tag: 'customer_name', desc: 'Recipient Name' },
                      { tag: 'business_name', desc: 'Business Name' },
                      { tag: 'quote_number', desc: 'Quote ID' },
                      { tag: 'quote_link', desc: 'Interactive Link' },
                      { tag: 'unsubscribe_link', desc: 'Opt-Out URL' },
                      { tag: 'offer_code', desc: 'Promo Code' },
                      { tag: 'offer_link', desc: 'Landing / Checkout URL' },
                    ].map((item) => (
                      <button
                        key={item.tag}
                        type="button"
                        onClick={() => insertVariableTag(item.tag)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs"
                        title={`Insert {{${item.tag}}} (${item.desc})`}
                      >
                        &#123;&#123;{item.tag}&#125;&#125;
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Editor Tabs (HTML / CSS / Plain Text) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setTemplateEditorTab('html')}
                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                          templateEditorTab === 'html'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        <span>HTML Content</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateEditorTab('css')}
                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                          templateEditorTab === 'css'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Palette className="h-3.5 w-3.5" />
                        <span>Custom CSS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateEditorTab('plainText')}
                        className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                          templateEditorTab === 'plainText'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Plain Text Fallback</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {templateEditorTab === 'html'
                        ? 'Raw HTML (scripts stripped safely)'
                        : templateEditorTab === 'css'
                        ? 'Inlined into email head stylesheet'
                        : 'Fallback for text-only email clients'}
                    </span>
                  </div>

                  {/* Active Tab Textarea */}
                  {templateEditorTab === 'html' && (
                    <Textarea
                      value={templateHtml}
                      onChange={(e) => setTemplateHtml(e.target.value)}
                      rows={18}
                      spellCheck={false}
                      className="font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 border-slate-800 rounded-xl p-3.5 resize-y focus:ring-indigo-500"
                      placeholder="<div><h1>Hello {{customer_name}}</h1>...</div>"
                    />
                  )}

                  {templateEditorTab === 'css' && (
                    <Textarea
                      value={templateCss}
                      onChange={(e) => setTemplateCss(e.target.value)}
                      rows={18}
                      spellCheck={false}
                      className="font-mono text-xs leading-relaxed bg-slate-950 text-indigo-300 border-slate-800 rounded-xl p-3.5 resize-y focus:ring-indigo-500"
                      placeholder="body { margin: 0; } .container { max-width: 580px; }"
                    />
                  )}

                  {templateEditorTab === 'plainText' && (
                    <Textarea
                      value={templatePlainText}
                      onChange={(e) => setTemplatePlainText(e.target.value)}
                      rows={18}
                      spellCheck={false}
                      className="font-mono text-xs leading-relaxed bg-slate-950 text-slate-200 border-slate-800 rounded-xl p-3.5 resize-y focus:ring-indigo-500"
                      placeholder="Plain text version of email for clients with HTML disabled..."
                    />
                  )}
                </div>

                {/* Editor Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      {templateSaveSuccess ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Saved!</span>
                        </>
                      ) : isSavingTemplate ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Save Template</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseTemplateInCampaign}
                      className="text-xs font-bold gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      title="Load this template into the active New Campaign broadcast"
                    >
                      <SendHorizontal className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Use in New Campaign</span>
                    </Button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Auto-sanitized &amp; script-stripped on render
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: Live Interactive Desktop/Mobile Preview & Test Email Box */}
              <div className="lg:col-span-6 space-y-4">
                {/* Preview Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Live Sandboxed Preview</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800">
                      Sample Data Compiled
                    </Badge>
                  </div>

                  {/* Device Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTemplatePreviewDevice('desktop')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                        templatePreviewDevice === 'desktop'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Desktop canvas (~600px)"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplatePreviewDevice('mobile')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${
                        templatePreviewDevice === 'mobile'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                      title="Mobile canvas (~375px)"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Preview Frame Container */}
                <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center items-start min-h-[560px] overflow-x-auto">
                  {templatePreviewDevice === 'desktop' ? (
                    <div className="w-full max-w-[600px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col transition-all">
                      {/* Email Header Chrome */}
                      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                        <span className="truncate">Subject: {templateSubject || 'No Subject'}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">600px</span>
                      </div>
                      <iframe
                        title="Desktop Email Preview"
                        srcDoc={
                          compileTemplateEmail({
                            html: templateHtml,
                            css: templateCss,
                            variables: {
                              customer_name: 'Subesh M',
                              business_name: 'Acme Solutions Pvt Ltd',
                              quote_number: 'QT-2026-0042',
                              quote_link: 'https://blendandbold.com/quote/demo-123',
                              unsubscribe_link: 'https://blendandbold.com/unsubscribe?token=demo',
                              offer_code: 'PROMO149',
                              offer_link: 'https://blendandbold.com/pricing',
                            },
                          }).html
                        }
                        sandbox="allow-same-origin"
                        className="w-full h-[520px] bg-white border-0"
                      />
                    </div>
                  ) : (
                    /* Smartphone Frame */
                    <div className="w-[375px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 transition-all flex flex-col">
                      {/* Smartphone Notch / Camera */}
                      <div className="flex justify-center mb-2">
                        <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-slate-950 mr-2" />
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                        </div>
                      </div>
                      <div className="bg-white rounded-[24px] overflow-hidden flex flex-col">
                        <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-[10px] font-mono text-slate-600 truncate">
                          {templateSubject || 'No Subject'}
                        </div>
                        <iframe
                          title="Mobile Email Preview"
                          srcDoc={
                            compileTemplateEmail({
                              html: templateHtml,
                              css: templateCss,
                              variables: {
                                customer_name: 'Subesh M',
                                business_name: 'Acme Solutions Pvt Ltd',
                                quote_number: 'QT-2026-0042',
                                quote_link: 'https://blendandbold.com/quote/demo-123',
                                unsubscribe_link: 'https://blendandbold.com/unsubscribe?token=demo',
                                offer_code: 'PROMO149',
                                offer_link: 'https://blendandbold.com/pricing',
                              },
                            }).html
                          }
                          sandbox="allow-same-origin"
                          className="w-full h-[500px] bg-white border-0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Instant Test Delivery Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Send Instant Test Delivery</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Delivered via Resend API
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      placeholder="Recipient email address (e.g. subeshtab@gmail.com)"
                      className="text-xs h-9 bg-white dark:bg-slate-900"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendTemplateTestEmail}
                      disabled={isSendingTemplateTest || !testRecipientEmail.includes('@')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 h-9 gap-1.5"
                    >
                      {isSendingTemplateTest ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Test</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {templateTestResult && (
                    <div
                      className={`text-xs p-2.5 rounded-lg font-medium flex items-center gap-2 ${
                        templateTestResult.success
                          ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                      }`}
                    >
                      {templateTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <span>{templateTestResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          THE 1-CLICK WHATSAPP QUEUE MODAL (THE HEART OF THE USER'S REQUEST)
      ========================================================================= */}
      {isQueueActive && currentQueueContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-5 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  💬
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    1-Click WhatsApp Marketing Queue
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Contact {queueIndex + 1} of {whatsappTargetContacts.length} ({Math.round(((queueIndex + 1) / whatsappTargetContacts.length) * 100)}% progress)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQueueActive(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${((queueIndex + 1) / whatsappTargetContacts.length) * 100}%` }}
              />
            </div>

            {/* Contact Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 tracking-wider">
                  Target Recipient
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {currentQueueContact.name}
                </div>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-300">
                  +{currentQueueContact.phone}
                </div>
              </div>

              <div className="text-right">
                <Badge
                  variant="outline"
                  className={
                    sentContactIds.has(currentQueueContact.id)
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-300'
                  }
                >
                  {sentContactIds.has(currentQueueContact.id) ? '✓ Message Opened' : 'Pending Send'}
                </Badge>
              </div>
            </div>

            {/* Attached Image Preview in Queue */}
            {attachedImageUrl && (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-12 w-12 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    <img src={attachedImageUrl} alt="Campaign flyer" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Promotional Flyer Attached
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {includeImageLinkInWhatsapp ? 'Flyer link included in chat text' : 'Image ready to share'}
                    </div>
                  </div>
                </div>

                <a
                  href={attachedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>View Flyer</span>
                </a>
              </div>
            )}

            {/* Personalized Message Preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Personalized Message to Send:
              </label>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#efeae2] dark:bg-slate-950 p-3.5 max-h-40 overflow-y-auto">
                <div className="bg-[#d9fdd3] dark:bg-emerald-950 text-slate-900 dark:text-emerald-100 rounded-xl p-3 text-xs whitespace-pre-wrap font-sans shadow-xs">
                  {formatWhatsappMessage(currentQueueContact.name)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <Button
                onClick={handleSendCurrentQueue}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>
                  Send to {currentQueueContact.name} on WhatsApp &amp; Next &rarr;
                </span>
              </Button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setQueueIndex(Math.max(0, queueIndex - 1))}
                  disabled={queueIndex === 0}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipCurrentQueue}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <span>Skip this contact</span>
                  <SkipForward className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const message = formatWhatsappMessage(currentQueueContact.name);
                    navigator.clipboard.writeText(`https://wa.me/${currentQueueContact.phone}?text=${encodeURIComponent(message)}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Copy wa.me Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL BROADCAST STATUS MODAL */}
      {emailBroadcastDone && emailProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Email Broadcast Dispatched!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Successfully delivered promotional emails to <strong>{emailProgress.sent}</strong> of {emailProgress.total} recipients via Resend.
            </p>
            {emailProgress.failed > 0 && (
              <p className="text-[11px] text-amber-600 font-semibold">
                Note: {emailProgress.failed} emails could not be sent (invalid format or bounce).
              </p>
            )}
            <Button
              onClick={() => setEmailBroadcastDone(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* META WHATSAPP BROADCAST STATUS MODAL */}
      {metaWhatsAppBroadcastDone && metaWhatsAppProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              WhatsApp Broadcast Dispatched!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Successfully queued and delivered messages to <strong>{metaWhatsAppProgress.sent}</strong> of {metaWhatsAppProgress.total} contacts via official Meta WhatsApp Cloud API.
            </p>
            {metaWhatsAppProgress.failed > 0 && (
              <p className="text-[11px] text-amber-600 font-semibold">
                Note: {metaWhatsAppProgress.failed} numbers could not be reached (invalid phone number format or opted-out).
              </p>
            )}
            <Button
              onClick={() => setMetaWhatsAppBroadcastDone(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* EDIT CONTACT MODAL */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Pencil className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Contact &amp; Delivery Status
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Update recipient contact info, company name, or delivery status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editSaveSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Contact updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveEditContact} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Full Name *
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="text-xs h-9 bg-white dark:bg-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Company / Business Name
                  </label>
                  <Input
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="e.g. Apex Traders"
                    className="text-xs h-9 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    WhatsApp Mobile Number
                  </label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 9876543210 or +91..."
                    className="text-xs h-9 font-mono bg-white dark:bg-slate-900"
                  />
                  {editPhone && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      Normalized: +{normalizePhoneNumber(editPhone) || 'invalid'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="text-xs h-9 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Delivery &amp; Read Status
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      WhatsApp Status
                    </label>
                    <select
                      value={editWhatsappStatus}
                      onChange={(e) => setEditWhatsappStatus(e.target.value as any)}
                      className="w-full text-xs h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium text-slate-900 dark:text-white"
                    >
                      <option value="pending">⏳ Pending (Unsent)</option>
                      <option value="sent">✓ Sent</option>
                      <option value="delivered">✓✓ Delivered</option>
                      <option value="read">✓✓ Read (Blue Ticks)</option>
                      <option value="failed">⚠️ Failed / Invalid Number</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Email Status
                    </label>
                    <select
                      value={editEmailStatus}
                      onChange={(e) => setEditEmailStatus(e.target.value as any)}
                      className="w-full text-xs h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium text-slate-900 dark:text-white"
                    >
                      <option value="pending">⏳ Pending (Unsent)</option>
                      <option value="sent">✓ Sent</option>
                      <option value="delivered">📥 Delivered to Inbox</option>
                      <option value="opened">👁️ Read / Opened</option>
                      <option value="bounced">🚫 Bounced / Rejected</option>
                    </select>
                  </div>
                </div>

                {editEmailStatus === 'bounced' && (
                  <div className="mt-2.5 animate-fadeIn">
                    <label className="block text-[10px] font-bold text-rose-600 mb-1">
                      Bounce / Rejection Reason
                    </label>
                    <Input
                      value={editEmailBounceReason}
                      onChange={(e) => setEditEmailBounceReason(e.target.value)}
                      placeholder="e.g. 550 5.1.1 Mailbox does not exist / unavailable"
                      className="text-xs h-8 bg-rose-50/50 border-rose-200 text-rose-800"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingContact(null)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
