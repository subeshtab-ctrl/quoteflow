'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Send,
  Clock,
  Check,
  CheckCheck,
  FileText,
  Receipt,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Info,
  Smartphone,
  Building,
  Key,
  Copy,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Organization, WhatsAppConnection, WhatsAppTemplate, WhatsAppMessage } from '@/types/database';
import { formatDate } from '@/lib/utils';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

interface WhatsAppIntegrationViewProps {
  organization: Organization;
  userRole?: string;
}

export function WhatsAppIntegrationView({ organization, userRole = 'OWNER' }: WhatsAppIntegrationViewProps) {
  const isOwnerOrAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [config, setConfig] = useState<{ appId: string; configId: string; isConfigured: boolean }>({
    appId: '',
    configId: '',
    isConfigured: false,
  });

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'templates' | 'history' | 'settings'>('overview');
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSyncingTemplates, setIsSyncingTemplates] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  // Manual / Sandbox Connection State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualWabaId, setManualWabaId] = useState('');
  const [manualPhoneId, setManualPhoneId] = useState('');
  const [manualPhoneNum, setManualPhoneNum] = useState('');
  const [isConnectingManual, setIsConnectingManual] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Automation rule toggles
  const [autoQuoteCreated, setAutoQuoteCreated] = useState(true);
  const [autoQuoteReminder, setAutoQuoteReminder] = useState(true);
  const [autoInvoiceCreated, setAutoInvoiceCreated] = useState(true);
  const [autoPaymentReceived, setAutoPaymentReceived] = useState(true);

  // Load connection status
  const fetchConnection = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/integrations/whatsapp/connection');
      const data = await res.json();
      if (res.ok) {
        setConnection(data.connection);
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (err: any) {
      console.error('Failed to load WhatsApp connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnection();
  }, []);

  // Load Meta SDK for Embedded Signup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.FB) {
      window.fbAsyncInit = function () {
        if (window.FB && config.appId) {
          window.FB.init({
            appId: config.appId,
            autoLogAppEvents: true,
            xfbml: true,
            version: 'v21.0',
          });
        }
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Listen for Meta Embedded Signup message events
    const handleMetaMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          // Event contains waba_id, phone_number_id
          if (data.event === 'FINISH' && data.data) {
            handleCompleteSignup({
              waba_id: data.data.waba_id,
              phone_number_id: data.data.phone_number_id,
            });
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMetaMessage);
    return () => window.removeEventListener('message', handleMetaMessage);
  }, [config.appId]);

  // Load templates when tab is active
  useEffect(() => {
    if (activeSubTab === 'templates') {
      setIsLoadingTemplates(true);
      fetch('/api/integrations/whatsapp/templates')
        .then((r) => r.json())
        .then((data) => {
          if (data.templates) setTemplates(data.templates);
        })
        .finally(() => setIsLoadingTemplates(false));
    } else if (activeSubTab === 'history') {
      setIsLoadingMessages(true);
      fetch('/api/integrations/whatsapp/messages')
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        })
        .finally(() => setIsLoadingMessages(false));
    }
  }, [activeSubTab]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 6000);
  };

  // Launch Meta Embedded Signup
  const handleLaunchEmbeddedSignup = () => {
    if (!config.appId || !config.configId) {
      // If Meta credentials are not configured in environment, prompt sandbox manual setup
      setIsManualModalOpen(true);
      return;
    }

    if (!window.FB) {
      showFeedback('error', 'Facebook SDK is loading. Please retry in a few seconds or use Sandbox Setup.');
      return;
    }

    window.FB.login(
      function (response: any) {
        if (response.authResponse && response.authResponse.code) {
          handleCompleteSignup({ code: response.authResponse.code });
        } else {
          showFeedback('error', 'Embedded Signup was cancelled or did not return an authorization code.');
        }
      },
      {
        config_id: config.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '2',
        },
      }
    );
  };

  const handleCompleteSignup = async (payload: { code?: string; waba_id?: string; phone_number_id?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect WhatsApp Business');

      setConnection(data.connection);
      showFeedback('success', '✓ WhatsApp Business connected successfully!');
      fetchConnection();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to complete connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectManual = async () => {
    if (!manualToken.trim() || !manualPhoneId.trim()) {
      showFeedback('error', 'Access Token and Phone Number ID are required.');
      return;
    }

    setIsConnectingManual(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual_token: manualToken.trim(),
          waba_id: manualWabaId.trim() || `waba_${Date.now()}`,
          phone_number_id: manualPhoneId.trim(),
          display_phone_number: manualPhoneNum.trim() || '+91 98765 43210',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect WhatsApp Business');

      setConnection(data.connection);
      setIsManualModalOpen(false);
      showFeedback('success', '✓ WhatsApp Business connected successfully via Sandbox credentials!');
      fetchConnection();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to connect');
    } finally {
      setIsConnectingManual(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect');

      setConnection(null);
      setIsDisconnectModalOpen(false);
      showFeedback('success', 'WhatsApp Business account has been disconnected.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSyncTemplates = async () => {
    setIsSyncingTemplates(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync templates');
      if (data.templates) setTemplates(data.templates);
      showFeedback('success', '✓ Templates synchronized with Meta successfully.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to sync templates');
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const handleSetupStandardTemplates = async () => {
    setIsSyncingTemplates(true);
    try {
      const res = await fetch('/api/integrations/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup_standard' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit standard templates');
      if (data.templates) setTemplates(data.templates);
      showFeedback('success', '✓ Standard QuoteFlow templates submitted to Meta.');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to setup standard templates');
    } finally {
      setIsSyncingTemplates(false);
    }
  };

  const isConnected =
    Boolean(connection) &&
    connection?.connection_status === 'connected' &&
    Boolean(connection?.phone_number_id);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/meta/whatsapp`
      : 'https://www.blendandbold.com/api/webhooks/meta/whatsapp';

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <MessageSquare className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  WhatsApp Business
                </h2>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Not Connected
                  </span>
                )}
                {connection?.quality_rating && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      connection.quality_rating === 'GREEN'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : connection.quality_rating === 'YELLOW'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Quality: {connection.quality_rating}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Send quotations, invoices, payment reminders and customer notifications directly through your business WhatsApp number.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {!isConnected ? (
              <Button
                onClick={handleLaunchEmbeddedSignup}
                disabled={isLoading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm rounded-xl"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Connect WhatsApp Business</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsDisconnectModalOpen(true)}
                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40 text-xs font-bold gap-1.5 rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mandatory Charges Disclaimer */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <strong className="font-semibold text-slate-700 dark:text-slate-300">Important: </strong>
            Meta messaging charges may apply and are separate from your QuoteFlow subscription. Each business connects its own Meta Business Portfolio and WhatsApp Business Account (WABA). QuoteFlow provides the software integration only.
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation (When Connected) */}
      {isConnected && (
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building className="h-3.5 w-3.5" />
            <span>Connection Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'templates'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Templates</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Message History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Automation & Rules</span>
          </button>
        </div>
      )}

      {/* VIEW: Unconnected State Guide */}
      {!isConnected && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              How Meta Embedded Signup Works
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When you click <strong className="text-slate-800 dark:text-slate-200">Connect WhatsApp Business</strong>, Meta opens an official popup window. In 3 simple steps, your account will be linked:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Log into Meta
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Log in with your existing Facebook account that owns or manages your business page.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Select Business & Number
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Select your Meta Business Portfolio and verify the official WhatsApp phone number for your company.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 font-black text-sm flex items-center justify-center">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Grant Permissions
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Approve WhatsApp management permissions to enable QuoteFlow to send automated quotes and invoices.
              </p>
            </div>
          </div>

          {/* Developer / Sandbox Mode Trigger */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Need to test in a development or sandbox environment without live Meta review?
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold gap-1 p-0 h-auto"
            >
              <span>Sandbox Developer Setup</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* VIEW: Overview (When Connected) */}
      {isConnected && activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Connected Business
              </span>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                {connection?.verified_name || organization.name}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 pt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Meta Verified Identity</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                WhatsApp Phone Number
              </span>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100">
                {connection?.display_phone_number || 'Registered'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                <Smartphone className="h-3.5 w-3.5" />
                <span>Cloud API Cloud Routed</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Account Status
              </span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                Active
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Connected on {formatDate(connection?.connected_at || '')}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setActiveSubTab('templates')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                      WhatsApp Templates
                    </h4>
                    <p className="text-xs text-slate-500">
                      Manage approved Meta message templates for quotes & invoices
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            <div
              onClick={() => setActiveSubTab('history')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                      Delivery & Audit History
                    </h4>
                    <p className="text-xs text-slate-500">
                      Track message sent, delivered, and read statuses
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Collapsible Advanced Technical Details */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Technical Details & Webhook Configuration
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showAdvanced && (
              <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-semibold text-slate-500">WhatsApp Business Account ID (WABA):</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {connection?.waba_id || 'Not available'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Phone Number ID:</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {connection?.phone_number_id || 'Not available'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Meta Graph API Version:</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      v21.0 (Official Cloud API)
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Security & Encryption:</span>
                    <p className="font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      AES-256-GCM Encrypted at rest
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-semibold text-slate-500 block mb-1">
                    Meta Webhook Callback URL:
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="font-mono text-xs bg-white dark:bg-slate-800"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhookUrl}
                      className="shrink-0 text-xs font-semibold gap-1"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Verify Token:{' '}
                    <code className="text-slate-600 dark:text-slate-300">
                      {process.env.NEXT_PUBLIC_META_WEBHOOK_VERIFY_TOKEN || 'quoteflow_meta_webhook_verify_token'}
                    </code>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: Templates */}
      {isConnected && activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                WhatsApp Message Templates
              </h3>
              <p className="text-xs text-slate-500">
                Only Meta-approved templates can be sent to customers outside 24-hour service windows.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncTemplates}
                disabled={isSyncingTemplates}
                className="text-xs font-bold gap-1.5 rounded-xl"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingTemplates ? 'animate-spin' : ''}`} />
                <span>Sync with Meta</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSetupStandardTemplates}
                disabled={isSyncingTemplates}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Submit Standard Templates</span>
              </Button>
            </div>
          </div>

          {isLoadingTemplates ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <FileText className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                No Templates Found
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click &quot;Submit Standard Templates&quot; to initialize QuoteFlow&apos;s pre-configured quotation, reminder, and invoice templates with Meta.
              </p>
              <Button
                size="sm"
                onClick={handleSetupStandardTemplates}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Submit Standard Templates
              </Button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                        {tmpl.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {tmpl.category}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {tmpl.language}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          tmpl.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : tmpl.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {tmpl.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                        {tmpl.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl font-mono leading-relaxed">
                      {tmpl.body_text}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">
                    <span>Synced {formatDate(tmpl.updated_at || tmpl.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Message History */}
      {isConnected && activeSubTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Message History & Delivery Audit
              </h3>
              <p className="text-xs text-slate-500">
                Live delivery status updates received from Meta Cloud API webhooks.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoadingMessages(true);
                fetch('/api/integrations/whatsapp/messages')
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.messages) setMessages(data.messages);
                  })
                  .finally(() => setIsLoadingMessages(false));
              }}
              className="text-xs font-bold gap-1 rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
          </div>

          {isLoadingMessages ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading message history...</div>
          ) : messages.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2">
              <Clock className="h-8 w-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                No Messages Sent Yet
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Messages sent to customers from Quotations or Invoices will appear here along with live delivery receipts.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {msg.document_number || msg.document_type || 'Notification'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {msg.recipient_phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Template: {msg.template_name}</span>
                      <span>•</span>
                      <span>{formatDate(msg.created_at)}</span>
                    </div>
                    {msg.error_message && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                        Error: {msg.error_message}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        msg.status === 'READ'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : msg.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : msg.status === 'SENT'
                          ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {msg.status === 'READ' && <CheckCheck className="h-3 w-3 text-blue-600" />}
                      {msg.status === 'DELIVERED' && <CheckCheck className="h-3 w-3 text-emerald-600" />}
                      {msg.status === 'SENT' && <Check className="h-3 w-3" />}
                      {msg.status === 'FAILED' && <AlertCircle className="h-3 w-3" />}
                      <span>{msg.status}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Automation Settings */}
      {isConnected && activeSubTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Automated WhatsApp Triggers
            </h3>
            <p className="text-xs text-slate-500">
              Configure event triggers to automatically notify customers via WhatsApp.
            </p>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pt-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Quotation Created
                </span>
                <p className="text-xs text-slate-500">
                  Prompt to send WhatsApp message immediately upon finalizing a quotation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoQuoteCreated}
                onChange={(e) => setAutoQuoteCreated(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
            </div>

            <div className="pt-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Follow-up Reminders
                </span>
                <p className="text-xs text-slate-500">
                  Offer 1-tap WhatsApp reminder action when quotation remains pending review.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoQuoteReminder}
                onChange={(e) => setAutoQuoteReminder(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
            </div>

            <div className="pt-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Invoice Issued
                </span>
                <p className="text-xs text-slate-500">
                  Enable 1-tap WhatsApp dispatch when issuing a new tax or commercial invoice.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoInvoiceCreated}
                onChange={(e) => setAutoInvoiceCreated(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
            </div>

            <div className="pt-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Payment Confirmation Receipt
                </span>
                <p className="text-xs text-slate-500">
                  Send instant WhatsApp payment receipt when invoice payment is confirmed.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoPaymentReceived}
                onChange={(e) => setAutoPaymentReceived(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => setIsDisconnectModalOpen(false)}
        title="Disconnect WhatsApp Business"
      >
        <div className="space-y-4 p-1">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to disconnect WhatsApp Business for{' '}
            <strong className="text-slate-900 dark:text-slate-100">{organization.name}</strong>?
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            Automated WhatsApp notifications and quotation dispatches will be paused until you reconnect.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDisconnectModalOpen(false)}
              disabled={isDisconnecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Developer Sandbox Setup Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="WhatsApp Developer / Sandbox Setup"
      >
        <div className="space-y-4 p-1">
          <p className="text-xs text-slate-500 leading-relaxed">
            Configure test credentials from your Meta for Developers App (WhatsApp → API Setup) to test the full Cloud API workflow locally.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Temporary / System User Access Token *
              </label>
              <Input
                type="password"
                placeholder="EAA..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Phone Number ID *
              </label>
              <Input
                placeholder="100609..."
                value={manualPhoneId}
                onChange={(e) => setManualPhoneId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                WhatsApp Business Account ID (WABA)
              </label>
              <Input
                placeholder="105432..."
                value={manualWabaId}
                onChange={(e) => setManualWabaId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Display Phone Number
              </label>
              <Input
                placeholder="+91 98765 43210"
                value={manualPhoneNum}
                onChange={(e) => setManualPhoneNum(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => setIsManualModalOpen(false)}
              disabled={isConnectingManual}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectManual}
              disabled={isConnectingManual}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isConnectingManual ? 'Connecting...' : 'Save & Connect'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
