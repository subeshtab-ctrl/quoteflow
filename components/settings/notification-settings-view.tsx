'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  FileCheck,
  Clock,
  CreditCard,
  Receipt,
  Users,
  Flame,
  MessageSquare,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { IOSSwitch } from '@/components/ui/ios-switch';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  dispatchBrowserNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/lib/notifications/browser-notification-service';
import { NotificationPreferences } from '@/types/database';

export function NotificationSettingsView() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
    setPrefs(getNotificationPreferences());
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, val: boolean) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
  };

  const handleSendTest = () => {
    const success = dispatchBrowserNotification({
      title: 'QuoteFlow Test Notification',
      body: 'Real-time proactive notifications are functioning perfectly!',
      type: 'customer_activity',
      tag: 'test_notification',
    });
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  const notificationItems: Array<{
    key: keyof NotificationPreferences;
    label: string;
    description: string;
    icon: any;
    priority: 'Urgent' | 'Action' | 'Opportunity' | 'Normal';
  }> = [
    {
      key: 'quoteViewed',
      label: 'Quote viewed by customer',
      description: 'Notify immediately when a client opens your quotation link.',
      icon: Eye,
      priority: 'Action',
    },
    {
      key: 'quoteApprovedRejected',
      label: 'Quote approved or rejected',
      description: 'Get notified instantly when a proposal is signed, approved, or rejected.',
      icon: FileCheck,
      priority: 'Urgent',
    },
    {
      key: 'quoteWaitingApproval',
      label: 'Quote waiting for approval',
      description: 'Receive proactive alerts for quotes pending decision for 5+ days.',
      icon: Clock,
      priority: 'Action',
    },
    {
      key: 'paymentDueOverdue',
      label: 'Payment due or overdue',
      description: 'Critical alerts when scheduled payment milestones or installments are due.',
      icon: AlertTriangle,
      priority: 'Urgent',
    },
    {
      key: 'paymentReceived',
      label: 'Payment received',
      description: 'Celebration alert when an invoice or quotation payment is settled.',
      icon: CreditCard,
      priority: 'Urgent',
    },
    {
      key: 'invoiceOverdue',
      label: 'Invoice overdue',
      description: 'Alert when tax invoices pass their net terms without payment.',
      icon: Receipt,
      priority: 'Urgent',
    },
    {
      key: 'customerActivity',
      label: 'Customer activity requiring attention',
      description: 'Alert when clients view quotes multiple times or request revisions.',
      icon: Users,
      priority: 'Opportunity',
    },
    {
      key: 'quoteExpiringSoon',
      label: 'Quote expiring soon',
      description: 'Reminders when valid_until dates are within 48 hours of expiration.',
      icon: Flame,
      priority: 'Urgent',
    },
    {
      key: 'aiRecommendedFollowup',
      label: 'AI-recommended follow-up',
      description: 'Proactive suggestions from QuoteFlow AI to re-engage warm deals.',
      icon: Sparkles,
      priority: 'Action',
    },
    {
      key: 'deliveryFailures',
      label: 'Important WhatsApp / email delivery failures',
      description: 'Immediate notification if automated email or WhatsApp reminders bounce.',
      icon: AlertCircle,
      priority: 'Urgent',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Bell className="h-7 w-7 text-indigo-600" />
          <span>Browser Notifications &amp; Smart Alerts</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Control real-time browser alerts and automated AI follow-up notifications. Prioritized based on urgency so you never get spammed.
        </p>
      </div>

      {/* Permission Status Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                permission === 'granted'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : permission === 'denied'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Browser Permission Status:
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    permission === 'granted'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : permission === 'denied'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {permission}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {permission === 'granted'
                  ? 'Your browser is configured to receive immediate QuoteFlow alerts.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in your browser settings. Please click the padlock in your URL bar to allow notifications.'
                  : 'Browser permission has not yet been requested.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {permission !== 'granted' && permission !== 'unsupported' && (
              <button
                onClick={handleRequestPermission}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                Enable Notifications
              </button>
            )}
            {permission === 'granted' && (
              <button
                onClick={handleSendTest}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 transition-colors shadow-2xs"
              >
                {testSent ? 'Notification Sent!' : 'Send Test Alert'}
              </button>
            )}
          </div>
        </div>

        {/* Global Master Switch */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Master Notification Switch
            </h4>
            <p className="text-[11px] text-slate-400">
              Quickly enable or silence all desktop notifications
            </p>
          </div>
          <IOSSwitch
            checked={prefs.browserNotificationsEnabled}
            onChange={(checked) => handleToggle('browserNotificationsEnabled', checked)}
          />
        </div>
      </div>

      {/* Granular Notification Event Categories */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            Notification Event Preferences
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize which business triggers send notifications. Priority events (overdue invoices, payment receipts) are recommended.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {notificationItems.map((item) => {
            const Icon = item.icon;
            const isChecked = Boolean(prefs[item.key]);

            return (
              <div key={item.key} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        {item.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          item.priority === 'Urgent'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                            : item.priority === 'Action'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                <IOSSwitch
                  checked={isChecked}
                  onChange={(checked) => handleToggle(item.key, checked)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
