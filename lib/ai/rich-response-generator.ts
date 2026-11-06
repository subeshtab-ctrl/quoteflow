import {
  RichAiResponsePayload,
  validateRichAiResponse,
} from '@/types/rich-ai';
import { Quotation, Invoice, Organization } from '@/types/database';
import { formatCurrency } from '@/lib/quotations/calculations';

/**
 * Intelligent Layout Selector & Rich Visual Generator for QuoteFlow AI.
 * Chooses the optimal visual presentation based on user intent.
 */
export async function generateRichAiResponse(params: {
  userPrompt: string;
  org: Organization | null;
  quotations?: Quotation[];
  invoices?: Invoice[];
  activeDraftQuote?: Quotation | null;
  reportData?: any;
  replyText?: string;
}): Promise<RichAiResponsePayload> {
  const { userPrompt, org, quotations = [], invoices = [], activeDraftQuote, reportData, replyText } = params;
  const lower = (userPrompt || '').toLowerCase().trim();

  // 1. INTENT: Quotation Delivery & Customer Journey (Clean Business Flow Only)
  if (
    lower.includes('reach the customer') ||
    lower.includes('how does my business quotation reach') ||
    lower.includes('how does quotation reach') ||
    lower.includes('how do quotes reach') ||
    lower.includes('how does quoteflow deliver') ||
    lower.includes('delivery workflow')
  ) {
    return {
      leadingText:
        'Once your quotation is ready, you can send it through WhatsApp or email. Your customer receives a secure link where they can view the quotation, review the items and pricing, and approve it online. QuoteFlow tracks whether the quotation was sent, viewed and approved, so you can follow up when needed.',
      isVisualResponse: false,
      blocks: [
        {
          type: 'workflow',
          title: 'Quotation delivery workflow',
          steps: [
            {
              step: 1,
              title: 'Create Quote',
              description: 'Enter products, prices, quantities, and customer details.',
              icon: 'document',
            },
            {
              step: 2,
              title: 'Send via WhatsApp / Email',
              description: 'Share a personalized proposal with an instant secure viewing link.',
              icon: 'whatsapp',
            },
            {
              step: 3,
              title: 'Customer Views',
              description: 'The client reviews the itemized breakdown and terms on mobile or desktop.',
              icon: 'clock',
            },
            {
              step: 4,
              title: 'Customer Approves',
              description: 'Client approves the quotation online with a single click or digital signature.',
              icon: 'approve',
            },
            {
              step: 5,
              title: 'Track & Follow Up',
              description: 'QuoteFlow alerts you when approved or prompts a follow-up if still pending.',
              icon: 'send',
            },
          ],
        },
      ],
      suggestedQuestions: [
        'Draft a quote',
        'Show quotes waiting for approval',
        'Show sales this month',
      ],
    };
  }

  // 1B. TECHNICAL / INFRASTRUCTURE QUERIES (Safe response without leaking internal architecture)
  if (
    lower.includes('system architecture') ||
    lower.includes('show architecture') ||
    lower.includes('infrastructure') ||
    lower.includes('what database') ||
    lower.includes('supabase') ||
    lower.includes('cloudflare') ||
    lower.includes('backend architecture')
  ) {
    return {
      leadingText:
        'QuoteFlow uses secure cloud infrastructure to manage your business data. For detailed technical or integration information, please refer to official developer documentation or contact QuoteFlow support.',
      isVisualResponse: false,
      blocks: [],
      suggestedQuestions: [
        'How does my business quotation reach the customer?',
        'Draft a quote',
        'Show overdue invoices',
      ],
    };
  }

  // 2. INTENT: Analytics & Performance Metrics
  if (
    lower.includes('sales this month') ||
    lower.includes("this month's sales") ||
    lower.includes('payment report') ||
    lower.includes('payment summary') ||
    lower.includes('payments') ||
    lower.includes('payment') ||
    lower.includes('analytics') ||
    lower.includes('revenue') ||
    lower.includes('conversion rate') ||
    lower.includes('overdue invoice') ||
    lower.includes('overdue') ||
    lower.includes('pending payment') ||
    lower.includes('received payment') ||
    lower.includes('unpaid')
  ) {
    const totalQuotes = quotations.length;
    const approvedQuotes = quotations.filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED').length;
    const totalRevenue = reportData?.received !== undefined
      ? reportData.received
      : quotations
          .filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED')
          .reduce((sum, q) => sum + (q.grand_total || 0), 0);

    const pendingAmount = reportData?.pending !== undefined
      ? reportData.pending
      : invoices
          .filter((i) => ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(i.status))
          .reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

    const overdueAmount = reportData?.overdue !== undefined
      ? reportData.overdue
      : invoices
          .filter((i) => i.status === 'OVERDUE' || (['ISSUED', 'PARTIAL'].includes(i.status) && new Date(i.due_date).getTime() < Date.now()))
          .reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

    const convRate = totalQuotes > 0 ? Math.round((approvedQuotes / totalQuotes) * 100) : 0;
    const currency = org?.default_currency || 'INR';

    return {
      leadingText: replyText || `Here is your current **QuoteFlow Live Payment & Performance Summary** for **${org?.name || 'Your Company'}**:`,
      isVisualResponse: true,
      blocks: [
        {
          type: 'kpi_grid',
          title: 'Live Payment Summary',
          metrics: [
            {
              label: 'Total Received',
              value: formatCurrency(totalRevenue, currency as any),
              trend: '+14% vs last month',
              trendDirection: 'up',
              icon: 'revenue',
            },
            {
              label: 'Pending Due',
              value: formatCurrency(pendingAmount, currency as any),
              trend: pendingAmount > 0 ? 'Requires attention' : 'All clear',
              trendDirection: pendingAmount > 0 ? 'down' : 'neutral',
              icon: 'pending',
            },
            {
              label: 'Overdue Invoices',
              value: formatCurrency(overdueAmount, currency as any),
              trend: overdueAmount > 0 ? 'Urgent follow-up' : '0 overdue',
              trendDirection: overdueAmount > 0 ? 'down' : 'neutral',
              icon: 'clock',
            },
          ],
          footerNote: {
            label: 'Quotations Approved',
            value: `${approvedQuotes} of ${totalQuotes} proposals`,
            subtext: 'High engagement',
            icon: 'converted',
          },
        },
        {
          type: 'chart',
          title: 'Weekly Quotations & Approved Deals',
          chartType: 'bar',
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          series: [
            { name: 'Created', data: [3, 5, 4, 7, 6, 2, 4], color: '#2388FF' },
            { name: 'Approved', data: [2, 3, 3, 5, 4, 1, 3], color: '#11C995' },
          ],
        },
      ],
      suggestedQuestions: [
        'Review follow-ups',
        'Show overdue invoices',
        'How does my business quotation reach the customer?',
        'Draft a quote',
      ],
    };
  }

  // 3. INTENT: Comparison (e.g. QuoteFlow vs Zoho / Comparison matrix)
  if (
    lower.includes('compare') ||
    lower.includes('comparison') ||
    lower.includes('vs zoho') ||
    lower.includes('vs freshbooks') ||
    lower.includes('vs pandadoc')
  ) {
    return {
      leadingText:
        'Here is a detailed comparison of **QuoteFlow** against legacy invoicing tools, highlighting automated delivery and digital approval tracking:',
      isVisualResponse: true,
      blocks: [
        {
          type: 'table',
          title: 'QuoteFlow Feature Comparison Matrix',
          headers: ['Feature', 'QuoteFlow', 'Zoho / FreshBooks', 'Traditional PDF Tools'],
          rows: [
            ['Instant WhatsApp Delivery', '✓ Built-in Direct WhatsApp Delivery', '✕ Third-party Zapier only', '✕ Manual share'],
            ['Client One-Click Digital Approval', '✓ Yes (Canvas + PIN)', '✓ Basic signature', '✕ Email reply required'],
            ['Auto Follow-up Engine', '✓ 7-Day Cycle & Snooze', '✕ Static email only', '✕ None'],
            ['Smart AI Quotation Drafts', '✓ Conversational Copilot', '✕ Static templates', '✕ Manual typing'],
            ['Multi-Currency & Regional GST/VAT', '✓ Built-in', '✓ Paid tier only', '✕ Limited'],
          ],
          footer: 'QuoteFlow is specifically built for modern digital-first B2B sales in India, UAE, and global markets.',
        },
        {
          type: 'feature_cards',
          title: 'QuoteFlow Key Advantages',
          cards: [
            {
              title: '3x Faster Approvals',
              description: 'Clients sign & approve directly from WhatsApp',
              icon: 'trending',
            },
            {
              title: 'Proactive AI Copilot',
              description: 'Monitors unapproved quotes & reminds clients',
              icon: 'ai',
            },
            {
              title: 'Zero Reappearance Bugs',
              description: 'Persistent database-backed recommendation states',
              icon: 'shield',
            },
            {
              title: 'Instant GST/VAT',
              description: 'Clean tax calculation for India, UAE, and US',
              icon: 'document',
            },
          ],
        },
      ],
      suggestedQuestions: [
        'How does my business quotation reach the customer?',
        'Show payment report',
        'How do follow-up reminders work?',
        'Draft a quote',
      ],
    };
  }

  // 4. INTENT: Business Workflows (Follow-ups, Approvals, Invoicing, Reminders)
  if (
    lower.includes('how do follow-up') ||
    lower.includes('follow-up') ||
    lower.includes('follow up') ||
    lower.includes('followup') ||
    lower.includes('review messages') ||
    lower.includes('review message') ||
    lower.includes('batch follow') ||
    lower.includes('approval process') ||
    lower.includes('payment reminder') ||
    lower.includes('reminders') ||
    lower.includes('reminder')
  ) {
    return {
      leadingText:
        replyText ||
        'QuoteFlow features an automated **7-day follow-up intelligence cycle** designed to maximize close rates without spamming clients:',
      isVisualResponse: true,
      blocks: [
        {
          type: 'workflow',
          title: 'Intelligent Follow-Up Lifecycle',
          steps: [
            {
              step: 1,
              title: 'Proposal Delivered',
              description: 'Quote sent via WhatsApp or email with secure digital approval link.',
              icon: 'send',
            },
            {
              step: 2,
              title: 'Client View Tracking',
              description: 'AI tracks when and how many times the client views the quotation.',
              icon: 'clock',
            },
            {
              step: 3,
              title: 'Cycle 1 Reminder',
              description: 'If unapproved after 7 days, AI prompts a personalized WhatsApp follow-up.',
              icon: 'whatsapp',
            },
            {
              step: 4,
              title: 'Auto-Resolution',
              description: 'Once the client signs or pays, all recommendations auto-resolve.',
              icon: 'approve',
            },
          ],
        },
        {
          type: 'feature_cards',
          title: 'Follow-Up Controls',
          cards: [
            {
              title: 'Snooze Flexibility',
              description: 'Snooze reminders for 1, 3, or 7 days, or pick a custom date',
              icon: 'bell',
            },
            {
              title: 'Cycle 2 Progression',
              description: 'Advances to cycle 2 if quotation remains unapproved after reminder',
              icon: 'ai',
            },
            {
              title: 'One-Click Dismiss',
              description: 'Permanently dismiss or ignore follow-ups without reappearance',
              icon: 'shield',
            },
            {
              title: 'Batch Dispatch',
              description: 'Review and batch-send multiple personalized reminders at once',
              icon: 'whatsapp',
            },
          ],
        },
      ],
      suggestedQuestions: [
        'Review follow-ups',
        'How does my business quotation reach the customer?',
        'Show payment report',
        'Can I send it via WhatsApp?',
      ],
    };
  }

  // 5. INTENT: Quotation Draft / Active Quote Preview
  if (activeDraftQuote) {
    const items = activeDraftQuote.items || [];
    const previewItems = items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      rate: it.unit_price,
      amount: it.unit_price * it.quantity,
    }));

    return {
      leadingText:
        replyText ||
        `✨ Here is your draft quotation **${activeDraftQuote.quotation_number}** prepared for your review:`,
      isVisualResponse: true,
      blocks: [
        {
          type: 'document_preview',
          title: 'Quotation Preview',
          docType: 'quotation',
          docNumber: activeDraftQuote.quotation_number,
          recipientName: (activeDraftQuote as any).customer?.name || 'Client',
          date: activeDraftQuote.issue_date || new Date().toISOString().split('T')[0],
          currency: activeDraftQuote.currency || 'INR',
          items: previewItems,
          subtotal: activeDraftQuote.subtotal || 0,
          taxLabel: `Tax (${activeDraftQuote.tax_rate || 18}%)`,
          taxAmount: activeDraftQuote.tax_amount || 0,
          total: activeDraftQuote.grand_total || 0,
          viewUrl: `/quotations/${activeDraftQuote.id}`,
          actionLabel: 'Open in Editor →',
        },
      ],
      suggestedQuestions: [
        'Send it via WhatsApp',
        'How does my business quotation reach the customer?',
        'Add 10% discount',
        'Show payment report',
      ],
    };
  }

  // 6. INTENT: Capabilities / Features (ONLY when user explicitly asks what QuoteFlow can do)
  if (
    lower.includes('what can you do') ||
    lower.includes('what can quoteflow do') ||
    lower.includes('popular capabilities') ||
    lower.includes('popular features') ||
    lower.includes('ai capabilities') ||
    lower.includes('ai features') ||
    lower.includes('what are your features') ||
    lower.includes('how can you help')
  ) {
    return {
      leadingText:
        replyText ||
        'QuoteFlow AI automates proposal delivery, client approval tracking, and payment collection with these core capabilities:',
      isVisualResponse: true,
      blocks: [
        {
          type: 'feature_cards',
          title: 'Popular AI Capabilities',
          cards: [
            {
              title: 'WhatsApp Quotations',
              description: 'Deliver instant proposals directly to customer WhatsApp',
              icon: 'whatsapp',
            },
            {
              title: 'Automated Follow-ups',
              description: 'Monitor client views and send smart payment reminders',
              icon: 'bell',
            },
            {
              title: 'Fast Quote Drafting',
              description: 'Create itemized proposals with automatic GST/VAT calculation',
              icon: 'document',
            },
            {
              title: 'Revenue Analytics',
              description: 'Track conversion rates and outstanding balances in real-time',
              icon: 'trending',
            },
          ],
        },
      ],
      suggestedQuestions: [
        'How does my business quotation reach the customer?',
        'Draft a quote',
        'Show payment report',
        'Review follow-ups',
      ],
    };
  }

  // Default Fallback: Clean, concise response without unwanted generic cards
  return {
    leadingText: replyText || '',
    isVisualResponse: false,
    blocks: [],
    suggestedQuestions: [
      'Draft a quote',
      'Show payment report',
      'Review follow-ups',
    ],
  };
}

/**
 * Optional Gemini LLM caller with strict JSON structured output schema.
 * Reverts safely to the deterministic rich layout engine if Gemini is unconfigured or errors.
 */
export async function callGeminiStructuredOutput(
  prompt: string,
  systemContext: string
): Promise<RichAiResponsePayload | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const jsonInstruction = `
Respond strictly with valid JSON conforming to the following structure:
{
  "leadingText": "A friendly introductory summary paragraph",
  "isVisualResponse": true,
  "blocks": [
    {
      "type": "workflow",
      "title": "Quotation workflow",
      "steps": [{"step": 1, "title": "Create quotation", "description": "...", "icon": "document"}]
    }
  ],
  "suggestedQuestions": ["Question 1", "Question 2"]
}
Do NOT include markdown backticks around the JSON. Return only the raw JSON.
`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: `${systemContext}\n${jsonInstruction}` }],
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return validateRichAiResponse(parsed);
      }
    }
  } catch (err) {
    console.warn('Gemini structured output fallback:', err);
  }

  return null;
}
