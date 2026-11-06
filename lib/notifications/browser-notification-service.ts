import { NotificationPreferences } from '@/types/database';
import { playNotificationChime, isSoundNotificationsEnabled } from '@/lib/utils/sound';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  browserNotificationsEnabled: true,
  quoteViewed: true,
  quoteApprovedRejected: true,
  quoteWaitingApproval: true,
  paymentDueOverdue: true,
  paymentReceived: true,
  invoiceOverdue: true,
  customerActivity: true,
  quoteExpiringSoon: true,
  aiRecommendedFollowup: true,
  deliveryFailures: true,
};

export type NotificationEventType =
  | 'quote_viewed'
  | 'quote_approved_rejected'
  | 'quote_waiting_approval'
  | 'payment_due_overdue'
  | 'payment_received'
  | 'invoice_overdue'
  | 'customer_activity'
  | 'quote_expiring_soon'
  | 'ai_recommended_followup'
  | 'delivery_failures';

const STORAGE_KEY = 'quoteflow_notification_preferences';
const DISMISSED_KEY = 'quoteflow_notification_prompt_dismissed';

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Asynchronously sync to backend settings
    fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_preferences: prefs }),
    }).catch(() => {});
  } catch {}
}

export function isNotificationPromptDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(DISMISSED_KEY) === 'true';
}

export function dismissNotificationPrompt(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DISMISSED_KEY, 'true');
}

export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const prefs = getNotificationPreferences();
      saveNotificationPreferences({ ...prefs, browserNotificationsEnabled: true });
      dispatchBrowserNotification({
        title: '🔔 QuoteFlow Smart Notifications Active',
        body: 'You will receive real-time alerts for customer views, approvals, and received payments.',
        type: 'customer_activity',
        tag: 'welcome_notification',
      });
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function dispatchBrowserNotification(params: {
  title: string;
  body: string;
  type: NotificationEventType;
  url?: string;
  tag?: string;
}): boolean {
  if (!isBrowserNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const prefs = getNotificationPreferences();
  if (!prefs.browserNotificationsEnabled) return false;

  const eventKeyMap: Record<NotificationEventType, keyof NotificationPreferences> = {
    quote_viewed: 'quoteViewed',
    quote_approved_rejected: 'quoteApprovedRejected',
    quote_waiting_approval: 'quoteWaitingApproval',
    payment_due_overdue: 'paymentDueOverdue',
    payment_received: 'paymentReceived',
    invoice_overdue: 'invoiceOverdue',
    customer_activity: 'customerActivity',
    quote_expiring_soon: 'quoteExpiringSoon',
    ai_recommended_followup: 'aiRecommendedFollowup',
    delivery_failures: 'deliveryFailures',
  };

  const prefKey = eventKeyMap[params.type];
  if (prefKey && prefs[prefKey] === false) {
    return false; // User opted out of this specific notification type
  }

  try {
    const notif = new Notification(params.title, {
      body: params.body,
      icon: '/quoteflow-icon.png',
      badge: '/quoteflow-icon.png',
      tag: params.tag || `qf_${params.type}_${Date.now()}`,
    });

    notif.onclick = () => {
      window.focus();
      if (params.url) {
        window.location.href = params.url;
      }
      notif.close();
    };

    if (isSoundNotificationsEnabled()) {
      playNotificationChime();
    }
    return true;
  } catch (err) {
    console.warn('Browser notification error:', err);
    return false;
  }
}
