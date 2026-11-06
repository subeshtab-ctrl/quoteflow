import fs from 'fs';
import path from 'path';
import {
  WelcomeExperienceConfig,
  WelcomeTemplateVersion,
  WelcomeEmailDeliveryLog,
  WelcomeMetrics,
  BusinessSetupStatus,
  AIWelcomeConfig,
} from './types';
import {
  createDefaultWelcomeTemplateVersion,
  DEFAULT_AI_WELCOME_CONFIG,
} from './default-template';
import { sendEmail } from '@/lib/email/service';
import { store, isCloudflareWorker } from '@/lib/supabase/data-store';
import { formatDate } from '@/lib/utils';

const getCwd = () => (typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '.');
const DATA_DIR = path && path.join ? path.join(getCwd(), 'data') : './data';
const CONFIG_FILE = path && path.join ? path.join(DATA_DIR, 'welcome-experience-config.json') : './data/welcome-experience-config.json';
const LOGS_FILE = path && path.join ? path.join(DATA_DIR, 'welcome-email-logs.json') : './data/welcome-email-logs.json';

// Feature activation timestamp - only new organizations created on/after this get automatic welcome
export const FEATURE_ACTIVATION_DATE = '2026-11-03T00:00:00.000Z';

// In-memory caches for Cloudflare Worker & high-speed access
let cachedConfig: WelcomeExperienceConfig | null = null;
let cachedLogs: WelcomeEmailDeliveryLog[] = [];

function ensureDataDir() {
  if (isCloudflareWorker) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

/**
 * Loads the active Welcome Experience configuration
 */
export function getWelcomeConfig(): WelcomeExperienceConfig {
  if (cachedConfig) return cachedConfig;

  if (!isCloudflareWorker) {
    try {
      ensureDataDir();
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        cachedConfig = JSON.parse(raw);
        if (cachedConfig) return cachedConfig;
      }
    } catch (err) {
      console.warn('Could not read welcome config file:', err);
    }
  }

  // Seed default configuration
  const defaultVersion = createDefaultWelcomeTemplateVersion();
  const initialConfig: WelcomeExperienceConfig = {
    emailEnabled: true,
    featureActivatedAt: FEATURE_ACTIVATION_DATE,
    currentVersion: 1,
    publishedVersion: defaultVersion,
    draftVersion: { ...defaultVersion, id: 'tmpl_welcome_v1_draft', status: 'DRAFT' },
    history: [defaultVersion],
    aiWelcome: DEFAULT_AI_WELCOME_CONFIG,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  };

  saveWelcomeConfig(initialConfig);
  return initialConfig;
}

/**
 * Persists the Welcome Experience configuration
 */
export function saveWelcomeConfig(config: WelcomeExperienceConfig): void {
  config.updatedAt = new Date().toISOString();
  cachedConfig = config;

  if (isCloudflareWorker) return;
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving welcome config:', err);
  }
}

/**
 * Loads welcome email delivery logs
 */
export function getWelcomeLogs(): WelcomeEmailDeliveryLog[] {
  if (cachedLogs.length > 0) return cachedLogs;

  if (!isCloudflareWorker) {
    try {
      ensureDataDir();
      if (fs.existsSync(LOGS_FILE)) {
        const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
        cachedLogs = JSON.parse(raw) || [];
        return cachedLogs;
      }
    } catch (err) {
      console.warn('Could not read welcome logs file:', err);
    }
  }

  return cachedLogs;
}

/**
 * Saves welcome email delivery logs
 */
export function saveWelcomeLogs(logs: WelcomeEmailDeliveryLog[]): void {
  cachedLogs = logs;
  if (isCloudflareWorker) return;
  try {
    ensureDataDir();
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving welcome logs:', err);
  }
}

/**
 * Checks if a welcome email has already been dispatched for an organization
 */
export function isWelcomeEmailSent(organizationId: string): boolean {
  const logs = getWelcomeLogs();
  return logs.some(
    (l) =>
      l.organizationId === organizationId &&
      !l.isTest &&
      (l.status === 'SENT' || l.status === 'DELIVERED')
  );
}

import {
  sanitizeEmailHtml,
  interpolateWelcomeTemplate,
} from './template-interpolator';

export {
  sanitizeEmailHtml,
  interpolateWelcomeTemplate,
};

/**
 * AUTOMATIC WELCOME EMAIL DISPATCH
 * Rule: ONE BUSINESS SIGNUP = ONE WELCOME EMAIL
 * Protects against duplicate sending (refreshes, staff accounts, retries, existing accounts)
 */
export async function sendWelcomeEmailIfEligible(params: {
  organizationId: string;
  userId?: string;
  ownerName?: string;
  email: string;
  businessName?: string;
  country?: string;
  currency?: string;
  userRole?: string;
  isStaff?: boolean;
}): Promise<{ sent: boolean; reason?: string; logId?: string }> {
  const config = getWelcomeConfig();

  // 1. Check if welcome email is globally enabled
  if (!config.emailEnabled) {
    return { sent: false, reason: 'Welcome email automation is disabled in Developer Admin.' };
  }

  const { organizationId, email } = params;
  if (!organizationId || !email || !email.includes('@')) {
    return { sent: false, reason: 'Invalid organization or email address.' };
  }

  // 2. Reject staff accounts (only organization owners receive the business welcome email)
  if (params.isStaff || (params.userRole && params.userRole !== 'OWNER')) {
    return {
      sent: false,
      reason: 'Staff accounts do not receive separate organization welcome emails.',
    };
  }

  // 3. IDEMPOTENCY CHECK: Ensure welcome email was not already sent for this business
  if (isWelcomeEmailSent(organizationId)) {
    return {
      sent: false,
      reason: `Welcome email has already been sent to organization ${organizationId}. Duplicate prevented.`,
    };
  }

  // 4. Retrieve organization details & check creation date
  const org = await store.getOrganization(organizationId);
  if (!org) {
    return { sent: false, reason: 'Organization not found.' };
  }

  // Existing customer safety: Only businesses created on/after activation date get auto-sent
  if (org.created_at) {
    const orgCreatedMs = new Date(org.created_at).getTime();
    const activationMs = new Date(config.featureActivatedAt || FEATURE_ACTIVATION_DATE).getTime();
    if (orgCreatedMs < activationMs) {
      return {
        sent: false,
        reason:
          'Existing business created prior to welcome experience activation. Auto-send prevented.',
      };
    }
  }

  // 5. Gather subscription trial information
  const sub = await store.getBusinessSubscription(organizationId);
  let trialDays = 14;
  let trialEndDate = formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
  let planName = 'Pro Plan (14-Day Free Trial)';

  if (sub) {
    if (sub.trial_expires_at) {
      trialEndDate = formatDate(sub.trial_expires_at);
      const diffMs = new Date(sub.trial_expires_at).getTime() - Date.now();
      trialDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    if (sub.plan_id) {
      planName = sub.plan_id.toUpperCase().replace(/_/g, ' ') + ' Trial';
    }
  }

  // 6. Resolve template
  const template = config.publishedVersion || createDefaultWelcomeTemplateVersion();
  const ownerName =
    params.ownerName ||
    (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)) ||
    'Business Owner';
  const businessName = params.businessName || org.name || 'Your Business';
  const country = params.country || org.country || org.business_country || 'your country';
  const currency = params.currency || org.default_currency || 'USD';

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com').replace(
    /\/+$/,
    ''
  );

  const compiled = interpolateWelcomeTemplate({
    html: template.html,
    css: template.css,
    subject: template.subject,
    preheader: template.preheader,
    variables: {
      owner_name: ownerName,
      business_name: businessName,
      email,
      country,
      currency,
      trial_days: trialDays,
      trial_end_date: trialEndDate,
      plan_name: planName,
      dashboard_url: `${baseUrl}/dashboard`,
      create_quote_url: `${baseUrl}/quotations/new`,
      ai_url: `${baseUrl}/dashboard?openAI=true`,
      help_url: `${baseUrl}/support`,
      support_email: template.config?.supportEmail || 'hello@blendandbold.com',
    },
  });

  // 7. Dispatch email via Resend / email service
  const logId = `wel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logs = getWelcomeLogs();

  try {
    const result = await sendEmail({
      to: email,
      subject: compiled.subject,
      html: compiled.html,
      fromName: template.senderName || 'QuoteFlow',
      replyTo: template.replyTo || 'hello@blendandbold.com',
    });

    const newLog: WelcomeEmailDeliveryLog = {
      id: logId,
      organizationId,
      businessName,
      ownerName,
      email,
      templateVersion: template.version,
      status: result.success ? 'SENT' : 'FAILED',
      sentAt: new Date().toISOString(),
      deliveredAt: result.success ? new Date().toISOString() : undefined,
      failureReason: result.error,
      isTest: false,
    };

    logs.unshift(newLog);
    saveWelcomeLogs(logs);

    return {
      sent: result.success,
      reason: result.error,
      logId,
    };
  } catch (sendErr: any) {
    const failedLog: WelcomeEmailDeliveryLog = {
      id: logId,
      organizationId,
      businessName,
      ownerName,
      email,
      templateVersion: template.version,
      status: 'FAILED',
      sentAt: new Date().toISOString(),
      failureReason: sendErr.message || 'Send exception',
      isTest: false,
    };

    logs.unshift(failedLog);
    saveWelcomeLogs(logs);

    return {
      sent: false,
      reason: sendErr.message,
      logId,
    };
  }
}

/**
 * Sends a live test email with realistic sample data
 * Clearly marked as test, does NOT affect real customer logs or counts
 */
export async function sendTestWelcomeEmail(params: {
  toEmail: string;
  templateOverride?: {
    subject?: string;
    preheader?: string;
    html?: string;
    css?: string;
    senderName?: string;
    replyTo?: string;
  };
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const config = getWelcomeConfig();
  const template = config.draftVersion || config.publishedVersion || createDefaultWelcomeTemplateVersion();

  const html = params.templateOverride?.html || template.html;
  const css = params.templateOverride?.css || template.css;
  const subject = params.templateOverride?.subject || template.subject;
  const preheader = params.templateOverride?.preheader || template.preheader;
  const senderName = params.templateOverride?.senderName || template.senderName;
  const replyTo = params.templateOverride?.replyTo || template.replyTo;

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com').replace(
    /\/+$/,
    ''
  );

  const compiled = interpolateWelcomeTemplate({
    html,
    css,
    subject: `[TEST WELCOME EMAIL] ${subject}`,
    preheader,
    variables: {
      owner_name: 'Sarah',
      business_name: 'BrightSpark Electrical',
      email: params.toEmail,
      country: 'India',
      currency: 'INR',
      trial_days: 14,
      trial_end_date: formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()),
      plan_name: 'Pro Plan (14-Day Free Trial)',
      dashboard_url: `${baseUrl}/dashboard`,
      create_quote_url: `${baseUrl}/quotations/new`,
      ai_url: `${baseUrl}/dashboard?openAI=true`,
      help_url: `${baseUrl}/support`,
      support_email: 'hello@blendandbold.com',
    },
  });

  const result = await sendEmail({
    to: params.toEmail,
    subject: compiled.subject,
    html: compiled.html,
    fromName: senderName || 'QuoteFlow [Test]',
    replyTo,
  });

  return result;
}

/**
 * Resends the welcome email manually to an existing organization owner
 */
export async function resendWelcomeEmail(
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  const org = await store.getOrganization(organizationId);
  if (!org || !org.email) {
    return { success: false, message: 'Organization or contact email not found.' };
  }

  const config = getWelcomeConfig();
  const template = config.publishedVersion || createDefaultWelcomeTemplateVersion();
  const sub = await store.getBusinessSubscription(organizationId);

  let trialDays = 14;
  let trialEndDate = formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
  let planName = 'Pro Plan';

  if (sub) {
    if (sub.trial_expires_at) {
      trialEndDate = formatDate(sub.trial_expires_at);
      const diffMs = new Date(sub.trial_expires_at).getTime() - Date.now();
      trialDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    if (sub.plan_id) {
      planName = sub.plan_id.toUpperCase().replace(/_/g, ' ');
    }
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com').replace(
    /\/+$/,
    ''
  );

  const compiled = interpolateWelcomeTemplate({
    html: template.html,
    css: template.css,
    subject: template.subject,
    preheader: template.preheader,
    variables: {
      owner_name: org.email.split('@')[0],
      business_name: org.name,
      email: org.email,
      country: org.country || org.business_country || 'your country',
      currency: org.default_currency || 'USD',
      trial_days: trialDays,
      trial_end_date: trialEndDate,
      plan_name: planName,
      dashboard_url: `${baseUrl}/dashboard`,
      create_quote_url: `${baseUrl}/quotations/new`,
      ai_url: `${baseUrl}/dashboard?openAI=true`,
      help_url: `${baseUrl}/support`,
    },
  });

  const res = await sendEmail({
    to: org.email,
    subject: compiled.subject,
    html: compiled.html,
    fromName: template.senderName,
    replyTo: template.replyTo,
  });

  if (res.success) {
    const logs = getWelcomeLogs();
    const existing = logs.find((l) => l.organizationId === organizationId);
    if (existing) {
      existing.resendCount = (existing.resendCount || 0) + 1;
      existing.lastResentAt = new Date().toISOString();
      existing.status = 'DELIVERED';
    } else {
      logs.unshift({
        id: `wel_resend_${Date.now()}`,
        organizationId,
        businessName: org.name,
        ownerName: org.email.split('@')[0],
        email: org.email,
        templateVersion: template.version,
        status: 'DELIVERED',
        sentAt: new Date().toISOString(),
        deliveredAt: new Date().toISOString(),
        resendCount: 1,
        lastResentAt: new Date().toISOString(),
      });
    }
    saveWelcomeLogs(logs);
    return { success: true, message: `Welcome email successfully resent to ${org.email}.` };
  }

  return { success: false, message: res.error || 'Failed to resend welcome email.' };
}

/**
 * Calculates delivery, activity and onboarding conversion metrics
 */
export async function getWelcomeMetrics(): Promise<WelcomeMetrics> {
  const logs = getWelcomeLogs().filter((l) => !l.isTest);
  const totalSent = logs.length;
  const deliveredCount = logs.filter((l) => l.status === 'DELIVERED' || l.status === 'SENT').length;
  const failedCount = logs.filter((l) => l.status === 'FAILED' || l.status === 'BOUNCED').length;
  const openedCount = logs.filter((l) => Boolean(l.openedAt)).length;
  const clickedCount = logs.filter((l) => Boolean(l.clickedAt)).length;

  const deliveryRate = totalSent > 0 ? Math.round((deliveredCount / totalSent) * 100) : 100;
  const openRate = totalSent > 0 ? Math.round((openedCount / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((clickedCount / totalSent) * 100) : 0;

  // Real conversion metrics across organizations that received welcome email
  let firstQuoteCreatedCount = 0;
  let aiOpenedCount = 0;
  let totalTimeMs = 0;
  let timeCount = 0;

  for (const log of logs) {
    try {
      const quotes = await store.getQuotations(log.organizationId);
      if (quotes && quotes.length > 0) {
        firstQuoteCreatedCount++;
        const earliest = quotes.reduce((min, q) => {
          const t = new Date(q.created_at).getTime();
          return t < min ? t : min;
        }, Infinity);

        const sentMs = new Date(log.sentAt).getTime();
        if (earliest > sentMs) {
          totalTimeMs += earliest - sentMs;
          timeCount++;
        }
      }

      // Check organization AI welcome onboarding flag
      const orgSettings = await store.getOrganizationSettings(log.organizationId);
      if (orgSettings?.ai_welcome_seen) {
        aiOpenedCount++;
      }
    } catch {}
  }

  const firstQuoteConversionRate =
    totalSent > 0 ? Math.round((firstQuoteCreatedCount / totalSent) * 100) : 0;
  const aiOpenedRate = totalSent > 0 ? Math.round((aiOpenedCount / totalSent) * 100) : 0;
  const avgMinutesToFirstQuote =
    timeCount > 0 ? Math.round(totalTimeMs / (timeCount * 1000 * 60)) : 12;

  return {
    totalSent,
    deliveredCount,
    deliveryRate,
    openedCount,
    openRate,
    clickedCount,
    clickRate,
    failedCount,
    firstQuoteCreatedCount,
    firstQuoteConversionRate,
    aiOpenedCount,
    aiOpenedRate,
    avgMinutesToFirstQuote,
  };
}

/**
 * Analyzes business profile to see what setup steps are completed vs missing
 * Powers the step-by-step QuoteFlow AI "Help set up my business" flow without redundant questions!
 */
export async function getBusinessSetupStatus(organizationId: string): Promise<BusinessSetupStatus> {
  const org = await store.getOrganization(organizationId);

  const businessNameSet = Boolean(org?.name && org.name !== 'My Company' && org.name.trim().length > 1);
  const countrySet = Boolean(org?.country || org?.business_country);
  const currencySet = Boolean(org?.default_currency);
  const logoSet = Boolean(org?.logo_url);
  const taxConfigured = Boolean(
    typeof org?.default_tax_rate === 'number' || (org as any)?.tax_rates?.length > 0
  );
  const validityConfigured = Boolean(org?.default_validity_days);
  const termsConfigured = Boolean(org?.default_terms && org.default_terms.length > 10);
  const contactSet = Boolean(org?.email && org?.phone);

  const steps = [
    businessNameSet,
    countrySet,
    currencySet,
    logoSet,
    taxConfigured,
    validityConfigured,
    termsConfigured,
    contactSet,
  ];

  const completed = steps.filter(Boolean).length;
  const overallPercent = Math.round((completed / steps.length) * 100);

  let nextRecommendedStep = 'All core business details configured! You are ready to create your first quote.';
  let nextRecommendedPrompt = 'Help me create my first quote';

  if (!businessNameSet) {
    nextRecommendedStep = 'Set your official Business or Trading Name';
    nextRecommendedPrompt = 'I want to set my company name';
  } else if (!logoSet) {
    nextRecommendedStep = 'Upload your Business Logo for quotations & invoices';
    nextRecommendedPrompt = 'How do I upload my business logo?';
  } else if (!taxConfigured) {
    nextRecommendedStep = 'Configure your default Tax or GST rate';
    nextRecommendedPrompt = 'Set my default tax rate to 18%';
  } else if (!termsConfigured) {
    nextRecommendedStep = 'Review default Quotation Terms & Payment Policy';
    nextRecommendedPrompt = 'Show my payment terms and quote validity';
  } else if (!contactSet) {
    nextRecommendedStep = 'Add customer support phone & billing address';
    nextRecommendedPrompt = 'Add my business contact phone';
  }

  return {
    businessNameSet,
    countrySet,
    currencySet,
    logoSet,
    taxConfigured,
    validityConfigured,
    termsConfigured,
    contactSet,
    overallPercent,
    nextRecommendedStep,
    nextRecommendedPrompt,
  };
}
