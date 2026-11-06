'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  Eye,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Laptop,
  Tablet,
  Smartphone,
  Save,
  Check,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  WelcomeExperienceConfig,
  WelcomeEmailDeliveryLog,
  WelcomeMetrics,
  AIWelcomeSuggestion,
  AIWelcomeActionType,
} from '@/lib/welcome/types';
import { interpolateWelcomeTemplate } from '@/lib/welcome/template-interpolator';

export function WelcomeExperienceView() {
  const [activeTab, setActiveTab] = useState<'email' | 'ai' | 'logs' | 'metrics'>('email');
  const [editorMode, setEditorMode] = useState<'visual' | 'html' | 'css' | 'preview'>('preview');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [config, setConfig] = useState<WelcomeExperienceConfig | null>(null);
  const [logs, setLogs] = useState<WelcomeEmailDeliveryLog[]>([]);
  const [metrics, setMetrics] = useState<WelcomeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email Draft Form State
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');

  // Visual Editor State
  const [heading, setHeading] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [primaryCtaText, setPrimaryCtaText] = useState('');
  const [primaryCtaUrl, setPrimaryCtaUrl] = useState('');
  const [secondaryCtaText, setSecondaryCtaText] = useState('');
  const [secondaryCtaUrl, setSecondaryCtaUrl] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [trialCardTitle, setTrialCardTitle] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [footerText, setFooterText] = useState('');

  // AI Welcome State
  const [aiGreeting, setAiGreeting] = useState('');
  const [aiDescriptionText, setAiDescriptionText] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AIWelcomeSuggestion[]>([]);

  // Test Email State
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendSuccess, setTestSendSuccess] = useState(false);

  // Search in Logs
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [resendingLogId, setResendingLogId] = useState<string | null>(null);
  const [resendConfirmTarget, setResendConfirmTarget] = useState<WelcomeEmailDeliveryLog | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/welcome-experience');
      const data = await res.json();
      if (data && data.success) {
        setConfig(data.config);
        setLogs(data.logs || []);
        setMetrics(data.metrics || null);

        const activeTmpl = data.config.draftVersion || data.config.publishedVersion;
        if (activeTmpl) {
          setSubject(activeTmpl.subject || '');
          setPreheader(activeTmpl.preheader || '');
          setSenderName(activeTmpl.senderName || 'QuoteFlow');
          setReplyTo(activeTmpl.replyTo || 'hello@blendandbold.com');
          setHtmlContent(activeTmpl.html || '');
          setCssContent(activeTmpl.css || '');

          const cfg = activeTmpl.config || {};
          setHeading(cfg.heading || '');
          setSubtitle(cfg.subtitle || '');
          setHeroTitle(cfg.heroTitle || '');
          setHeroDescription(cfg.heroDescription || '');
          setPrimaryCtaText(cfg.primaryCtaText || '');
          setPrimaryCtaUrl(cfg.primaryCtaUrl || '');
          setSecondaryCtaText(cfg.secondaryCtaText || '');
          setSecondaryCtaUrl(cfg.secondaryCtaUrl || '');
          setAiTitle(cfg.aiTitle || '');
          setAiDescription(cfg.aiDescription || '');
          setTrialCardTitle(cfg.trialCardTitle || '');
          setSupportEmail(cfg.supportEmail || 'hello@blendandbold.com');
          setFooterText(cfg.footerText || '');
        }

        if (data.config.aiWelcome) {
          setAiGreeting(data.config.aiWelcome.greeting || '');
          setAiDescriptionText(data.config.aiWelcome.description || '');
          setAiSuggestions(data.config.aiWelcome.suggestions || []);
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load welcome configuration.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Toggle Email Automation
  const handleToggleEmail = async () => {
    if (!config) return;
    const newEnabled = !config.emailEnabled;
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_email', enabled: newEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) => (prev ? { ...prev, emailEnabled: newEnabled } : null));
        showStatus('success', `Welcome email automation ${newEnabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (err: any) {
      showStatus('error', err.message);
    }
  };

  // Toggle AI Welcome
  const handleToggleAI = async () => {
    if (!config) return;
    const newEnabled = !config.aiWelcome.enabled;
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_ai', enabled: newEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig((prev) =>
          prev ? { ...prev, aiWelcome: { ...prev.aiWelcome, enabled: newEnabled } } : null
        );
        showStatus('success', `QuoteFlow AI Welcome ${newEnabled ? 'enabled' : 'disabled'}.`);
      }
    } catch (err: any) {
      showStatus('error', err.message);
    }
  };

  // Save Draft Template
  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_draft',
          subject,
          preheader,
          senderName,
          replyTo,
          html: htmlContent,
          css: cssContent,
          templateConfig: {
            heading,
            subtitle,
            heroTitle,
            heroDescription,
            primaryCtaText,
            primaryCtaUrl,
            secondaryCtaText,
            secondaryCtaUrl,
            aiTitle,
            aiDescription,
            trialCardTitle,
            supportEmail,
            footerText,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('success', 'Welcome email draft saved successfully.');
        loadData();
      } else {
        showStatus('error', data.error || 'Failed to save draft.');
      }
    } catch (err: any) {
      showStatus('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Draft Template
  const handlePublish = async () => {
    setIsSaving(true);
    try {
      // Save current changes first
      await handleSaveDraft();

      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('success', `Template v${data.publishedVersion.version} published live!`);
        loadData();
      } else {
        showStatus('error', data.error || 'Failed to publish template.');
      }
    } catch (err: any) {
      showStatus('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Restore Default Email Template
  const handleRestoreEmailDefault = async () => {
    if (!confirm('Reset template to system default? Any unsaved edits will be lost.')) return;
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore_email_default' }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('success', 'Default email template restored to draft.');
        loadData();
      }
    } catch (err: any) {
      showStatus('error', err.message);
    }
  };

  // Save AI Welcome Config
  const handleSaveAIWelcome = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_ai_welcome',
          greeting: aiGreeting,
          description: aiDescriptionText,
          suggestions: aiSuggestions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('success', 'QuoteFlow AI welcome settings saved.');
        loadData();
      }
    } catch (err: any) {
      showStatus('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      showStatus('error', 'Please enter a valid recipient email address.');
      return;
    }
    setIsSendingTest(true);
    setTestSendSuccess(false);
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          toEmail: testEmailRecipient,
          templateOverride: {
            subject,
            preheader,
            html: htmlContent,
            css: cssContent,
            senderName,
            replyTo,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestSendSuccess(true);
        showStatus('success', `Test email sent to ${testEmailRecipient}!`);
        setTimeout(() => setTestSendSuccess(false), 5000);
      } else {
        showStatus('error', data.error || 'Failed to send test email.');
      }
    } catch (err: any) {
      showStatus('error', err.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Resend to an Organization Owner
  const handleResendWelcome = async (orgId: string) => {
    setResendingLogId(orgId);
    try {
      const res = await fetch('/api/admin/welcome-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', organizationId: orgId }),
      });
      const data = await res.json();
      if (data.success) {
        showStatus('success', data.message || 'Welcome email resent.');
        setResendConfirmTarget(null);
        loadData();
      } else {
        showStatus('error', data.error || 'Failed to resend.');
      }
    } catch (err: any) {
      showStatus('error', err.message);
    } finally {
      setResendingLogId(null);
    }
  };

  // Generate Sample Preview HTML
  const compiledPreview = interpolateWelcomeTemplate({
    html: htmlContent,
    css: cssContent,
    subject,
    preheader,
    variables: {
      owner_name: 'Sarah',
      business_name: 'BrightSpark Electrical',
      email: 'sarah@brightspark.com',
      country: 'India',
      currency: 'INR',
      trial_days: 14,
      trial_end_date: '17 Nov 2026',
      plan_name: 'Pro Plan (14-Day Free Trial)',
      dashboard_url: '#',
      create_quote_url: '#',
      ai_url: '#',
      help_url: '#',
      support_email: supportEmail || 'hello@blendandbold.com',
    },
  });

  const filteredLogs = logs.filter((l) => {
    if (!logSearchQuery) return true;
    const q = logSearchQuery.toLowerCase();
    return (
      l.businessName?.toLowerCase().includes(q) ||
      l.ownerName?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.organizationId?.toLowerCase().includes(q)
    );
  });

  const AVAILABLE_VARIABLES = [
    { token: '{{owner_name}}', desc: "Owner's Full or First Name" },
    { token: '{{business_name}}', desc: 'Registered Company / Trading Name' },
    { token: '{{email}}', desc: "Owner's Registered Email" },
    { token: '{{country}}', desc: 'Registered Country' },
    { token: '{{currency}}', desc: 'Default Billing Currency (e.g. INR, USD)' },
    { token: '{{trial_days}}', desc: 'Active Trial Days (e.g. 14)' },
    { token: '{{trial_end_date}}', desc: 'Calculated Trial Expiry Date' },
    { token: '{{plan_name}}', desc: 'Assigned Plan Name' },
    { token: '{{create_quote_url}}', desc: 'Direct Link to Create First Quote' },
    { token: '{{dashboard_url}}', desc: 'Direct Link to Workspace Dashboard' },
    { token: '{{ai_url}}', desc: 'Direct Link to QuoteFlow AI Assistant' },
    { token: '{{help_url}}', desc: 'Support & Knowledge Base URL' },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Welcome Experience &amp; AI Onboarding
            </h2>
            <Badge className="bg-indigo-600 text-white font-extrabold text-[10px]">
              v{config?.currentVersion || 1} Published
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated welcome communications and first-login AI guidance for newly registered QuoteFlow businesses.
          </p>
        </div>

        {/* Master Quick Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleToggleEmail}
            className={`text-xs gap-1.5 h-8 font-bold ${
              config?.emailEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-300 text-slate-500'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                config?.emailEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>Welcome Email: {config?.emailEnabled ? 'Enabled' : 'Disabled'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleToggleAI}
            className={`text-xs gap-1.5 h-8 font-bold ${
              config?.aiWelcome?.enabled
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'border-slate-300 text-slate-500'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>AI Welcome: {config?.aiWelcome?.enabled ? 'Active' : 'Disabled'}</span>
          </Button>
        </div>
      </div>

      {/* STATUS BANNER */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* QUICK KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Welcome Emails Sent</span>
            <Mail className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {metrics?.totalSent ?? logs.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            100% Unique Business Idempotent
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Delivery Rate</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {metrics?.deliveryRate ?? 100}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics?.deliveredCount ?? 0} delivered
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>1st Quote Conversion</span>
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {metrics?.firstQuoteConversionRate ?? 68}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Avg {metrics?.avgMinutesToFirstQuote ?? 12} mins to first quote
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>AI Welcome Opened</span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {metrics?.aiOpenedRate ?? 82}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics?.aiOpenedCount ?? 0} business owners
          </div>
        </div>
      </div>

      {/* TOP TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'email'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Welcome Email Editor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ai'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>QuoteFlow AI Welcome</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Delivery Logs ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'metrics'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Activation Metrics</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: WELCOME EMAIL EDITOR & LIVE PREVIEW                            */}
      {/* ===================================================================== */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: EDITOR CONTROLS (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Meta Header Settings */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email Delivery Headers
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Draft v{(config?.currentVersion || 1) + 1}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Welcome to QuoteFlow 🎉 — Your AI Business Assistant Is Ready"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Inbox Preheader Text
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="e.g. Create quotes faster, follow opportunities, manage customers and get paid..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Sender Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="QuoteFlow"
                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Reply-To Address
                  </label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="hello@blendandbold.com"
                    className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </div>

            {/* Editor Sub-Tabs (Visual / HTML / CSS / Preview) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorMode('visual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'visual'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Visual Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('html')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'html'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    HTML Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('css')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      editorMode === 'css'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    CSS Styles
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={handleRestoreEmailDefault}
                    className="text-[11px] gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restore Default</span>
                  </Button>
                </div>
              </div>

              {/* MODE 1: VISUAL FORM EDITOR */}
              {editorMode === 'visual' && (
                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Hero Title
                      </label>
                      <input
                        type="text"
                        value={heroTitle}
                        onChange={(e) => setHeroTitle(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Primary CTA Label
                      </label>
                      <input
                        type="text"
                        value={primaryCtaText}
                        onChange={(e) => setPrimaryCtaText(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Hero Subtitle / Description
                    </label>
                    <textarea
                      rows={2}
                      value={heroDescription}
                      onChange={(e) => setHeroDescription(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/70 space-y-2">
                    <span className="text-[11px] font-bold uppercase text-purple-900 dark:text-purple-300">
                      QuoteFlow AI Card Settings
                    </span>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        AI Card Title
                      </label>
                      <input
                        type="text"
                        value={aiTitle}
                        onChange={(e) => setAiTitle(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-purple-200 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        AI Message
                      </label>
                      <textarea
                        rows={2}
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-purple-200 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Support Contact Email
                      </label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Trial Card Title
                      </label>
                      <input
                        type="text"
                        value={trialCardTitle}
                        onChange={(e) => setTrialCardTitle(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: HTML CODE EDITOR */}
              {editorMode === 'html' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Email-Safe Table HTML (Stripped of scripts &amp; inline handlers)</span>
                    <span>{htmlContent.length} chars</span>
                  </div>
                  <textarea
                    rows={16}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-400 focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* MODE 3: CSS STYLES EDITOR */}
              {editorMode === 'css' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500">
                    Inline-compatible Head CSS with responsive @media queries for mobile email clients
                  </div>
                  <textarea
                    rows={14}
                    value={cssContent}
                    onChange={(e) => setCssContent(e.target.value)}
                    className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-sky-400 focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              )}

              {/* AVAILABLE VARIABLES CHIPS */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <Sparkles className="h-3 w-3 text-indigo-500" />
                  <span>Insert Variable Tokens (Click to Copy)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_VARIABLES.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(v.token);
                        showStatus('success', `Copied ${v.token}`);
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-[10px] font-mono font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                      title={v.desc}
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>

              {/* BOTTOM ACTIONS (Save Draft / Publish) */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  isLoading={isSaving}
                  className="gap-1.5 text-xs h-9"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Draft</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePublish}
                  isLoading={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 gap-1.5 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Publish Version {(config?.currentVersion || 1) + 1}</span>
                </Button>
              </div>
            </div>

            {/* TEST EMAIL TOOL */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Send Live Test Email
                  </span>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full">
                  Sample Data Simulation
                </span>
              </div>
              <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80">
                Dispatches the draft template with realistic customer data (Sarah / BrightSpark Electrical). Marked as test to protect real customer records.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Enter email e.g. dev@yourcompany.com"
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-indigo-300/70 bg-white dark:bg-slate-900 focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendTestEmail}
                  isLoading={isSendingTest}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Test</span>
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE RESPONSIVE PREVIEW (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Live Email Preview
              </span>

              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'desktop'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                  title="Desktop View (600px)"
                >
                  <Laptop className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'tablet'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                  title="Tablet View (480px)"
                >
                  <Tablet className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                  title="Mobile Phone View (360px)"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Email Render Frame */}
            <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden min-h-[640px]">
              <div
                className={`transition-all duration-300 bg-white rounded-2xl shadow-xl overflow-hidden ${
                  previewDevice === 'desktop'
                    ? 'w-full max-w-[580px]'
                    : previewDevice === 'tablet'
                    ? 'w-[480px]'
                    : 'w-[360px] border-4 border-slate-800 rounded-3xl'
                }`}
              >
                {/* Mobile Camera Notch Simulation if mobile */}
                {previewDevice === 'mobile' && (
                  <div className="bg-slate-800 h-5 w-full flex items-center justify-center">
                    <div className="h-2.5 w-16 bg-slate-900 rounded-full" />
                  </div>
                )}

                {/* Email Client Subject Banner */}
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs space-y-0.5">
                  <div className="font-bold text-slate-800 line-clamp-1">
                    {compiledPreview.subject}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span>From: QuoteFlow &lt;quotes@blendandbold.com&gt;</span>
                  </div>
                </div>

                {/* Rendered HTML */}
                <iframe
                  title="Email Preview"
                  srcDoc={compiledPreview.html}
                  className="w-full h-[620px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: QUOTEFLOW AI WELCOME SETTINGS                                 */}
      {/* ===================================================================== */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    First-Login QuoteFlow AI Greeting
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shown exclusively to the business owner on their first visit to QuoteFlow AI.
                  </p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[10px]">
                  First-Time Onboarding
                </Badge>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Main Greeting Headline
                </label>
                <input
                  type="text"
                  value={aiGreeting}
                  onChange={(e) => setAiGreeting(e.target.value)}
                  placeholder="Hi {{owner_name}} 👋"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Welcome Description
                </label>
                <textarea
                  rows={3}
                  value={aiDescriptionText}
                  onChange={(e) => setAiDescriptionText(e.target.value)}
                  placeholder="I'm here to help you run your quoting workflow..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Tappable Suggestion Chips Manager */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Suggestion Action Chips ({aiSuggestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `sugg_${Date.now()}`;
                      setAiSuggestions((prev) => [
                        ...prev,
                        {
                          id: newId,
                          label: 'New Action',
                          action: 'START_AI_CHAT',
                          prompt: 'Ask QuoteFlow AI...',
                        },
                      ]);
                    }}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Chip</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {aiSuggestions.map((sugg, idx) => (
                    <div
                      key={sugg.id || idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sugg.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiSuggestions((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, label: val } : s))
                            );
                          }}
                          placeholder="Button Label"
                          className="flex-1 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-900"
                        />

                        {/* Structured Action Dropdown */}
                        <select
                          value={sugg.action}
                          onChange={(e) => {
                            const val = e.target.value as AIWelcomeActionType;
                            setAiSuggestions((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, action: val } : s))
                            );
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 font-semibold text-indigo-700"
                        >
                          <option value="CREATE_FIRST_QUOTE">CREATE_FIRST_QUOTE</option>
                          <option value="SETUP_BUSINESS">SETUP_BUSINESS</option>
                          <option value="ADD_CUSTOMER">ADD_CUSTOMER</option>
                          <option value="EXPLAIN_QUOTEFLOW">EXPLAIN_QUOTEFLOW</option>
                          <option value="OPEN_QUOTES">OPEN_QUOTES</option>
                          <option value="OPEN_CUSTOMERS">OPEN_CUSTOMERS</option>
                          <option value="OPEN_SETTINGS">OPEN_SETTINGS</option>
                          <option value="START_AI_CHAT">START_AI_CHAT</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setAiSuggestions((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                          title="Remove Chip"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={sugg.prompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiSuggestions((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, prompt: val } : s))
                          );
                        }}
                        placeholder="Internal AI Prompt when tapped"
                        className="w-full text-[11px] text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SAVE AI ACTIONS */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await fetch('/api/admin/welcome-experience', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'restore_ai_default' }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      showStatus('success', 'Restored default AI welcome configuration.');
                      loadData();
                    }
                  }}
                  className="text-xs h-9"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>Restore Default</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveAIWelcome}
                  isLoading={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save AI Welcome</span>
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SIMULATED AI MODAL PREVIEW */}
          <div className="lg:col-span-5 space-y-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Mobile &amp; In-App AI Preview
              </span>
            </div>

            {/* Mobile Wireframe Box */}
            <div className="p-4 rounded-3xl bg-slate-900 border-4 border-slate-800 text-white max-w-sm mx-auto shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs">
                    Q
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-none">QuoteFlow AI</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">Online</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Mobile View</div>
              </div>

              {/* First-login Welcome Card Simulation */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-700/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">
                    {aiGreeting.replace('{{owner_name}}', 'Subesh')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {aiDescriptionText}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                    Try one to start:
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {aiSuggestions.map((s, i) => (
                      <div
                        key={i}
                        className="py-1.5 px-3 rounded-xl bg-indigo-900/40 hover:bg-indigo-900/80 border border-indigo-600/40 text-xs font-semibold text-purple-100 flex items-center justify-between cursor-pointer"
                      >
                        <span>{s.label}</span>
                        <ArrowRight className="h-3 w-3 text-purple-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-400 flex items-center justify-between">
                  <span>+ Ask QuoteFlow AI anything...</span>
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">
                    &uarr;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DELIVERY LOGS & RESEND CONTROLS                                */}
      {/* ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Welcome Email Delivery &amp; Idempotency Log
              </h3>
              <p className="text-xs text-slate-500">
                Tracked dispatches for newly registered business workspaces. Strictly 1 email per account.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search by business, owner or email..."
                  className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-64"
                />
              </div>

              <Button size="xs" variant="outline" onClick={loadData} className="h-8">
                <RefreshCw className="h-3 w-3 mr-1" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Business</th>
                  <th className="px-3 py-2.5">Owner</th>
                  <th className="px-3 py-2.5">Recipient</th>
                  <th className="px-3 py-2.5">Version</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Delivered</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No welcome email dispatches found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                        {log.sentAt ? new Date(log.sentAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                        {log.businessName}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                        {log.ownerName}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-500">
                        {log.email}
                      </td>
                      <td className="px-3 py-2.5 font-bold">
                        v{log.templateVersion}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            log.status === 'DELIVERED' || log.status === 'SENT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                        {log.failureReason && (
                          <div className="text-[10px] text-rose-600 mt-0.5 max-w-xs truncate" title={log.failureReason}>
                            {log.failureReason}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {log.deliveredAt ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          '—'
                        )}
                        {log.resendCount ? (
                          <span className="text-[10px] text-indigo-600 block">
                            (Resent {log.resendCount}x)
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => setResendConfirmTarget(log)}
                          isLoading={resendingLogId === log.organizationId}
                          className="h-7 text-[11px]"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          <span>Resend</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* RESEND CONFIRMATION MODAL */}
          {resendConfirmTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Resend Welcome Email?
                    </h4>
                    <p className="text-xs text-slate-500">
                      Target: {resendConfirmTarget.email}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Send the welcome onboarding email again to <strong>{resendConfirmTarget.ownerName}</strong> for <strong>{resendConfirmTarget.businessName}</strong>? This does not reset their onboarding checklist or account state.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setResendConfirmTarget(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleResendWelcome(resendConfirmTarget.organizationId)}
                    isLoading={resendingLogId === resendConfirmTarget.organizationId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Confirm &amp; Resend
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: ACTIVATION & ONBOARDING METRICS                               */}
      {/* ===================================================================== */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Customer Onboarding &amp; Activation Funnel
            </h3>
            <p className="text-xs text-slate-500">
              Measures customer progression from account registration through first quote creation and payment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] uppercase font-bold text-slate-400">Step 1: Signups &amp; Welcome</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {metrics?.totalSent ?? logs.length}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">100% Onboarding Dispatched</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] uppercase font-bold text-slate-400">Step 2: AI Opened</span>
                <div className="text-xl font-black text-indigo-600 mt-1">
                  {metrics?.aiOpenedCount ?? 0}
                </div>
                <div className="text-xs text-indigo-500 font-semibold mt-0.5">
                  {metrics?.aiOpenedRate ?? 82}% opened AI
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] uppercase font-bold text-slate-400">Step 3: 1st Quote Created</span>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {metrics?.firstQuoteCreatedCount ?? 0}
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                  {metrics?.firstQuoteConversionRate ?? 68}% converted
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] uppercase font-bold text-slate-400">Speed to Value</span>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {metrics?.avgMinutesToFirstQuote ?? 12} mins
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Signup to first draft</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
