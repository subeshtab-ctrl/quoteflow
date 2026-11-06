import fs from 'fs';
import path from 'path';
import { type CustomEmailTemplate, compileTemplateEmail } from './template-compiler';

export type { CustomEmailTemplate };
export { compileTemplateEmail };

const DEFAULT_TEMPLATES: CustomEmailTemplate[] = [
  {
    id: 'tmpl_quote_launch',
    name: 'QuoteFlow Pro Launch & Offer',
    subject: 'Special Offer: Accelerate your quotes & get paid 3x faster with QuoteFlow Pro 🚀',
    css: `
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
.badge {
  display: inline-block;
  background: #4f46e5;
  color: #ffffff;
  padding: 5px 14px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
h1 {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 16px 0 12px 0;
  line-height: 1.25;
}
p {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
  margin: 0 0 16px 0;
}
.highlight-box {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 20px;
  margin: 24px 0;
  border-left: 4px solid #4f46e5;
}
.btn {
  display: inline-block;
  background: #4f46e5;
  color: #ffffff !important;
  padding: 13px 26px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  margin: 12px 0;
}
.footer {
  font-size: 12px;
  color: #94a3b8;
  border-top: 1px solid #f1f5f9;
  padding-top: 18px;
  margin-top: 28px;
  text-align: center;
}
.footer a {
  color: #64748b;
  text-decoration: underline;
}
    `.trim(),
    html: `
<div class="container">
  <div class="badge">QuoteFlow Pro Special</div>
  <h1>Hello {{customer_name}},</h1>
  <p>We are excited to introduce <strong>QuoteFlow Pro</strong> for <strong>{{business_name}}</strong>!</p>
  <p>QuoteFlow lets you generate professional proposals in seconds using conversational AI, send instant WhatsApp approvals with digital finger e-signatures, and convert approved quotes to tax invoices in 1 click.</p>
  
  <div class="highlight-box">
    <p style="margin: 0; font-weight: 700; color: #1e1b4b; font-size: 15px;">Quote #{{quote_number}} is ready for review.</p>
    <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;">Enjoy a 14-day full access free trial with zero setup fees.</p>
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="{{quote_link}}" class="btn">View & Approve Quote Online &rarr;</a>
  </div>

  <p>Have questions? Reply directly to this email and our team will be delighted to assist.</p>

  <div class="footer">
    Sent with QuoteFlow by Blend &amp; Bold.<br>
    <a href="{{unsubscribe_link}}">Unsubscribe</a> from marketing notifications.
  </div>
</div>
    `.trim(),
    plainText: 'Hello {{customer_name}}, Quote #{{quote_number}} is ready for {{business_name}}. View your quote: {{quote_link}} | Unsubscribe: {{unsubscribe_link}}',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'tmpl_quote_presentation',
    name: 'Modern Quotation Delivery',
    subject: 'Quotation #{{quote_number}} from {{business_name}} is ready for review',
    css: `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f4f6f8;
  color: #1e293b;
  margin: 0;
  padding: 24px;
}
.card {
  max-width: 560px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 14px;
  padding: 32px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.header {
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}
.btn-primary {
  display: inline-block;
  background: #2563eb;
  color: #ffffff !important;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
}
    `.trim(),
    html: `
<div class="card">
  <div class="header">
    <div class="title">{{business_name}}</div>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Official Quotation Notification</div>
  </div>

  <p>Dear <strong>{{customer_name}}</strong>,</p>
  <p>Please find attached your formal quotation <strong>#{{quote_number}}</strong>. You can review the line items, chat with us directly on the proposal page, and digitally approve it in seconds.</p>

  <div style="margin: 24px 0; text-align: center;">
    <a href="{{quote_link}}" class="btn-primary">Review &amp; Sign Quotation</a>
  </div>

  <p style="font-size: 12px; color: #64748b;">No account or app download required. Open on desktop or smartphone to sign.</p>

  <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
    Powered by QuoteFlow &bull; <a href="{{unsubscribe_link}}" style="color: #94a3b8;">Unsubscribe</a>
  </div>
</div>
    `.trim(),
    plainText: 'Dear {{customer_name}}, quotation {{quote_number}} from {{business_name}} is ready: {{quote_link}}',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
  },
];

function getTemplateStorePath(): string {
  return path.join(process.cwd(), 'data', 'email-templates.json');
}

export function getAllTemplates(): CustomEmailTemplate[] {
  const filePath = getTemplateStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read email templates file:', err);
  }

  // Seed default templates
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_TEMPLATES, null, 2), 'utf-8');
  } catch {}

  return DEFAULT_TEMPLATES;
}

export function saveTemplate(data: {
  id?: string;
  name: string;
  subject: string;
  html: string;
  css: string;
  plainText?: string;
}): CustomEmailTemplate {
  const templates = getAllTemplates();
  const now = new Date().toISOString();

  let target: CustomEmailTemplate;
  if (data.id) {
    const existingIndex = templates.findIndex((t) => t.id === data.id);
    if (existingIndex >= 0) {
      target = {
        ...templates[existingIndex],
        name: data.name.trim(),
        subject: data.subject.trim(),
        html: data.html,
        css: data.css,
        plainText: data.plainText,
        updatedAt: now,
      };
      templates[existingIndex] = target;
    } else {
      target = {
        id: data.id,
        name: data.name.trim(),
        subject: data.subject.trim(),
        html: data.html,
        css: data.css,
        plainText: data.plainText,
        createdAt: now,
        updatedAt: now,
      };
      templates.unshift(target);
    }
  } else {
    target = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: data.name.trim(),
      subject: data.subject.trim(),
      html: data.html,
      css: data.css,
      plainText: data.plainText,
      createdAt: now,
      updatedAt: now,
    };
    templates.unshift(target);
  }

  const filePath = getTemplateStorePath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save email templates:', err);
  }

  return target;
}

export function duplicateTemplate(id: string): CustomEmailTemplate | null {
  const templates = getAllTemplates();
  const existing = templates.find((t) => t.id === id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const duplicated: CustomEmailTemplate = {
    ...existing,
    id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: `Copy of ${existing.name}`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  templates.unshift(duplicated);
  const filePath = getTemplateStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
  } catch {}

  return duplicated;
}

export function deleteTemplate(id: string): boolean {
  let templates = getAllTemplates();
  const prevCount = templates.length;
  templates = templates.filter((t) => t.id !== id);
  if (templates.length === prevCount) return false;

  const filePath = getTemplateStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
}


