import { WhatsAppTemplateComponent } from '@/types/database';

export interface StandardTemplateDefinition {
  name: string;
  category: 'UTILITY' | 'MARKETING';
  language: string;
  headerType: 'NONE' | 'TEXT' | 'DOCUMENT';
  bodyText: string;
  description: string;
  components: WhatsAppTemplateComponent[];
  variableNames: string[];
}

export const QUOTEFLOW_STANDARD_TEMPLATES: Record<string, StandardTemplateDefinition> = {
  quotation_created: {
    name: 'quotation_created',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Send quotation to customer with review and digital approval link',
    bodyText: 'Hello {{1}}, you have received quotation {{2}} from {{3}} for {{4}}. Review and approve online: {{5}}',
    variableNames: ['customer_name', 'quotation_number', 'business_name', 'amount', 'quote_link'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, you have received quotation {{2}} from {{3}} for {{4}}. Review and approve online: {{5}}',
        example: {
          body_text: [['John Doe', 'QT-1001', 'BlendAndBold', '₹15,000', 'https://www.blendandbold.com/q/sec_demo']],
        },
      },
    ],
  },
  quotation_reminder: {
    name: 'quotation_reminder',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Follow-up reminder for pending quotations awaiting review',
    bodyText: 'Hello {{1}}, gentle follow-up regarding quotation {{2}} for {{3}} from {{4}}. You can review and approve it here: {{5}}',
    variableNames: ['customer_name', 'quotation_number', 'amount', 'business_name', 'quote_link'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, gentle follow-up regarding quotation {{2}} for {{3}} from {{4}}. You can review and approve it here: {{5}}',
        example: {
          body_text: [['John Doe', 'QT-1001', '₹15,000', 'BlendAndBold', 'https://www.blendandbold.com/q/sec_demo']],
        },
      },
    ],
  },
  invoice_created: {
    name: 'invoice_created',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Send newly issued invoice to customer with payment link',
    bodyText: 'Hello {{1}}, invoice {{2}} from {{3}} for {{4}} is now issued and ready for payment. View details and pay online: {{5}}',
    variableNames: ['customer_name', 'invoice_number', 'business_name', 'amount', 'invoice_link'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, invoice {{2}} from {{3}} for {{4}} is now issued and ready for payment. View details and pay online: {{5}}',
        example: {
          body_text: [['John Doe', 'INV-2026-001', 'BlendAndBold', '₹15,000', 'https://www.blendandbold.com/q/sec_demo']],
        },
      },
    ],
  },
  payment_reminder: {
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Friendly reminder for due or overdue invoice payments',
    bodyText: 'Hello {{1}}, reminder that payment for invoice {{2}} (amount {{3}}) from {{4}} is due on {{5}}. Review details: {{6}}',
    variableNames: ['customer_name', 'invoice_number', 'amount', 'business_name', 'due_date', 'payment_link'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, reminder that payment for invoice {{2}} (amount {{3}}) from {{4}} is due on {{5}}. Review details: {{6}}',
        example: {
          body_text: [['John Doe', 'INV-2026-001', '₹15,000', 'BlendAndBold', '2026-11-01', 'https://www.blendandbold.com/q/sec_demo']],
        },
      },
    ],
  },
  payment_received: {
    name: 'payment_received',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Confirmation receipt for customer payments',
    bodyText: 'Thank you {{1}}! We have confirmed payment of {{2}} for invoice {{3}} from {{4}}. Receipt & statement: {{5}}',
    variableNames: ['customer_name', 'amount', 'invoice_number', 'business_name', 'receipt_link'],
    components: [
      {
        type: 'BODY',
        text: 'Thank you {{1}}! We have confirmed payment of {{2}} for invoice {{3}} from {{4}}. Receipt & statement: {{5}}',
        example: {
          body_text: [['John Doe', '₹15,000', 'INV-2026-001', 'BlendAndBold', 'https://www.blendandbold.com/q/sec_demo']],
        },
      },
    ],
  },
  admin_marketing_broadcast: {
    name: 'admin_marketing_broadcast',
    category: 'MARKETING',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Promotional announcement and special offers sent by QuoteFlow Admin',
    bodyText: 'Hello {{1}}, special update from {{2}}: {{3}}. Claim offer or learn more: {{4}}',
    variableNames: ['recipient_name', 'business_name', 'offer_details', 'promo_link'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, special update from {{2}}: {{3}}. Claim offer or learn more: {{4}}',
        example: {
          body_text: [['Partner', 'QuoteFlow', 'Get 50% off QuoteFlow Pro this month with promo code PROMO50', 'https://www.blendandbold.com/pricing']],
        },
      },
    ],
  },
  admin_support_reply: {
    name: 'admin_support_reply',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Support engineer response notification to ticket creator',
    bodyText: 'Hello {{1}}, QuoteFlow Support has responded to your ticket {{2}}: "{{3}}". View reply: {{4}}',
    variableNames: ['recipient_name', 'ticket_number', 'reply_summary', 'ticket_url'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, QuoteFlow Support has responded to your ticket {{2}}: "{{3}}". View reply: {{4}}',
        example: {
          body_text: [['Acme Corp', 'QF-1002', 'We have resolved the invoice sync issue you reported.', 'https://www.blendandbold.com/support']],
        },
      },
    ],
  },
  admin_business_outreach: {
    name: 'admin_business_outreach',
    category: 'UTILITY',
    language: 'en_US',
    headerType: 'NONE',
    description: 'Direct business account update, onboarding or trial notification',
    bodyText: 'Hello {{1}}, this is QuoteFlow Support regarding your account: {{2}}. Access your portal: {{3}}',
    variableNames: ['business_name', 'message_content', 'portal_link'],
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, this is QuoteFlow Support regarding your account: {{2}}. Access your portal: {{3}}',
        example: {
          body_text: [['Acme Corp', 'Your 30-day Pro trial has been extended by 7 days.', 'https://www.blendandbold.com/billing']],
        },
      },
    ],
  },
};

/**
 * Safely resolves parameter values in order for a template
 */
export function buildTemplateParameters(
  templateName: string,
  variables: Record<string, string>
): Array<{ type: 'text'; text: string }> {
  const def = QUOTEFLOW_STANDARD_TEMPLATES[templateName];
  if (!def) {
    // Fallback: return array of values provided in numerical or positional order
    return Object.values(variables).map((val) => ({
      type: 'text',
      text: String(val || ''),
    }));
  }

  return def.variableNames.map((varName) => ({
    type: 'text',
    text: String(variables[varName] || ''),
  }));
}
