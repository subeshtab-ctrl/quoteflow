import { escapeHtml, sanitizeUrl } from '@/lib/utils/html-escape';

export interface CustomEmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  css: string;
  plainText?: string;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

/**
 * Strips script tags, javascript: urls, and inline event handlers for safe email rendering.
 * Inlines CSS into a head style block for broad email client compatibility.
 * Replaces placeholders: {{customer_name}}, {{business_name}}, {{quote_number}}, {{quote_link}}, {{unsubscribe_link}}
 */
export function compileTemplateEmail(params: {
  html: string;
  css: string;
  variables?: Record<string, string>;
}): { html: string; subject?: string } {
  const vars: Record<string, string> = {
    customer_name: 'John Doe',
    business_name: 'Acme Corporation',
    quote_number: 'QF-2026-0042',
    quote_link: 'https://blendandbold.com/q/demo-quote',
    unsubscribe_link: 'https://blendandbold.com/unsubscribe?token=sample',
    ...(params.variables || {}),
  };

  // 1. Sanitize HTML - remove script tags and on* attributes
  let safeHtml = (params.html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '#');

  // 2. Interpolate variables (e.g. {{customer_name}}) with safe escaping
  Object.entries(vars).forEach(([key, val]) => {
    const isUrl = key.endsWith('_link') || key.endsWith('_url');
    const safeVal = isUrl ? sanitizeUrl(val) : escapeHtml(val);
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    safeHtml = safeHtml.replace(regex, safeVal);
  });

  // 3. Clean CSS
  const safeCss = (params.css || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/expression\([^)]*\)/gi, '');

  // 4. Wrap with proper email document structure
  const document = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style type="text/css">
${safeCss}
  </style>
</head>
<body>
${safeHtml}
</body>
</html>`;

  return { html: document };
}
