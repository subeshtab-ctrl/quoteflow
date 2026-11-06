import { formatDate } from '@/lib/utils';
import { escapeHtml, sanitizeUrl } from '@/lib/utils/html-escape';

/**
 * Strips dangerous script tags and inline JS event handlers from email HTML
 */
export function sanitizeEmailHtml(html: string): string {
  return (html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '#');
}

/**
 * Safe variable resolution for welcome email templates
 * Client-safe (no Node.js fs/path dependencies)
 */
export function interpolateWelcomeTemplate(params: {
  html: string;
  css: string;
  subject?: string;
  preheader?: string;
  variables: {
    owner_name?: string;
    business_name?: string;
    email?: string;
    country?: string;
    currency?: string;
    trial_days?: string | number;
    trial_end_date?: string;
    plan_name?: string;
    dashboard_url?: string;
    create_quote_url?: string;
    ai_url?: string;
    help_url?: string;
    support_email?: string;
  };
}): { html: string; subject: string; preheader: string } {
  const baseUrl = (
    typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'https://www.blendandbold.com'
  ).replace(/\/+$/, '');

  const rawOwnerName = (params.variables.owner_name || '').trim() || 'Workspace Owner';
  const rawBusinessName = (params.variables.business_name || '').trim() || 'Your Business';
  const rawEmail = (params.variables.email || '').trim() || 'your email';
  const rawCountry = (params.variables.country || '').trim() || 'your region';
  const rawCurrency = (params.variables.currency || 'USD').trim();
  const rawTrialDays = String(params.variables.trial_days || 14);
  const rawTrialEndDate =
    params.variables.trial_end_date ||
    formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());
  const rawPlanName = params.variables.plan_name || 'Pro Plan (14-Day Free Trial)';
  const rawDashboardUrl = params.variables.dashboard_url || `${baseUrl}/dashboard`;
  const rawCreateQuoteUrl = params.variables.create_quote_url || `${baseUrl}/quotations/new`;
  const rawAiUrl = params.variables.ai_url || `${baseUrl}/dashboard?openAI=true`;
  const rawHelpUrl = params.variables.help_url || `${baseUrl}/support`;
  const rawSupportEmail = params.variables.support_email || 'hello@blendandbold.com';

  const varMap: Record<string, string> = {
    owner_name: escapeHtml(rawOwnerName),
    business_name: escapeHtml(rawBusinessName),
    email: escapeHtml(rawEmail),
    country: escapeHtml(rawCountry),
    currency: escapeHtml(rawCurrency),
    trial_days: escapeHtml(rawTrialDays),
    trial_end_date: escapeHtml(rawTrialEndDate),
    plan_name: escapeHtml(rawPlanName),
    dashboard_url: sanitizeUrl(rawDashboardUrl),
    create_quote_url: sanitizeUrl(rawCreateQuoteUrl),
    ai_url: sanitizeUrl(rawAiUrl),
    help_url: sanitizeUrl(rawHelpUrl),
    support_email: escapeHtml(rawSupportEmail),
  };

  let renderedHtml = sanitizeEmailHtml(params.html);
  let renderedSubject =
    params.subject || 'Welcome to QuoteFlow 🎉 — Your AI Business Assistant Is Ready';
  let renderedPreheader =
    params.preheader ||
    'Create quotes faster, follow opportunities, manage customers and get paid with QuoteFlow.';

  // Interpolate into HTML, Subject & Preheader
  Object.entries(varMap).forEach(([key, val]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    renderedHtml = renderedHtml.replace(regex, val);
    renderedSubject = renderedSubject.replace(regex, val);
    renderedPreheader = renderedPreheader.replace(regex, val);
  });

  // Never show raw leftover {{variable_name}} to recipients
  renderedHtml = renderedHtml.replace(/{{\s*[\w_]+\s*}}/g, '');
  renderedSubject = renderedSubject.replace(/{{\s*[\w_]+\s*}}/g, '');
  renderedPreheader = renderedPreheader.replace(/{{\s*[\w_]+\s*}}/g, '');

  const safeCss = (params.css || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/expression\([^)]*\)/gi, '');

  const document = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${renderedSubject}</title>
  <style type="text/css">
${safeCss}
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;

  return {
    html: document,
    subject: renderedSubject,
    preheader: renderedPreheader,
  };
}
