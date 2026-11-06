import { CurrencyCode } from '@/types/database';

export type CopilotIntent =
  | 'create_quote'
  | 'draft_quote'
  | 'edit_quote'
  | 'customer_lookup'
  | 'change_customer'
  | 'create_customer'
  | 'quote_followup'
  | 'quotes_waiting_approval'
  | 'overdue_invoices'
  | 'payment_report'
  | 'sales_report'
  | 'invoice_lookup'
  | 'quote_lookup'
  | 'import_products'
  | 'attachment_analysis'
  | 'send_whatsapp'
  | 'send_email'
  | 'general_quoteflow_question'
  | 'general_business_question'
  | 'technical_security_question'
  | 'proactive_briefing'
  | 'operator_daily_plan'
  | 'pipeline_health'
  | 'lead_recovery'
  | 'win_loss_insights'
  | 'action_history'
  | 'unknown';

export interface ExtractedQuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
}

export interface ExtractedSlots {
  customerName?: string;
  currency?: CurrencyCode;
  items: ExtractedQuoteItem[];
  taxRate?: number;
  taxMode?: 'inclusive' | 'exclusive';
  discountValue?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  validityDays?: number;
  notes?: string;
  priceChanges?: Array<{ item: string; price: number }>;
  quantityChanges?: Array<{ item: string; quantity: number }>;
  itemsToAdd?: ExtractedQuoteItem[];
  itemsToRemove?: string[];
}

export interface ClassificationResult {
  intent: CopilotIntent;
  confidence: number;
  slots: ExtractedSlots;
  isDeterministic: boolean;
}

/**
 * Intelligent parser that extracts line items, quantities, prices, currency,
 * customer names, taxes, and discounts from natural language input.
 */
export function extractQuoteSlots(text: string, defaultTaxRate = 18): ExtractedSlots {
  let cleaned = text.trim();
  // Standardize thousand separators so e.g. 4,000 does not break on comma splitting
  cleaned = cleaned.replace(/(\d+),(\d{3})/g, '$1$2');

  // 1. Detect Currency
  let currency: CurrencyCode | undefined = undefined;
  if (/\$|usd/i.test(cleaned)) currency = 'USD';
  else if (/₹|rs\.?|inr/i.test(cleaned)) currency = 'INR';
  else if (/€|eur/i.test(cleaned)) currency = 'EUR';
  else if (/£|gbp/i.test(cleaned)) currency = 'GBP';

  // 2. Extract Discount
  let discountValue = 0;
  let discountType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
  const discMatch =
    cleaned.match(/(?:discount|disc|off)\s*(?:of|at)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
    cleaned.match(/(\d+(?:\.\d+)?)\s*%\s*(?:discount|off)/i);
  if (discMatch) {
    discountValue = parseFloat(discMatch[1]);
    cleaned = cleaned.replace(discMatch[0], ' ');
  }

  // 3. Extract Tax Rate & Tax Mode
  let taxRate: number = defaultTaxRate;
  let taxMode: 'inclusive' | 'exclusive' | undefined = undefined;
  if (/tax\s+inclusive|inclusive\s+tax/i.test(cleaned)) {
    taxMode = 'inclusive';
    cleaned = cleaned.replace(/tax\s+inclusive|inclusive\s+tax/i, ' ');
  } else if (/tax\s+exclusive|exclusive\s+tax/i.test(cleaned)) {
    taxMode = 'exclusive';
    cleaned = cleaned.replace(/tax\s+exclusive|exclusive\s+tax/i, ' ');
  }

  const taxMatch =
    cleaned.match(/(?:tax|gst|vat)\s*(?:of|at)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
    cleaned.match(/(\d+(?:\.\d+)?)\s*%\s*(?:tax|gst|vat)/i);
  if (taxMatch) {
    taxRate = parseFloat(taxMatch[1]);
    cleaned = cleaned.replace(taxMatch[0], ' ');
  } else if (/no\s+tax|0%\s+tax|zero\s+tax|tax\s+free/i.test(cleaned)) {
    taxRate = 0;
    cleaned = cleaned.replace(/no\s+tax|0%\s+tax|zero\s+tax|tax\s+free/i, ' ');
  }

  // 4. Extract Validity
  let validityDays: number | undefined = undefined;
  const valMatch =
    cleaned.match(/validity\s*(?:of|is|to|=)?\s*(\d+)\s*days?/i) ||
    cleaned.match(/(\d+)\s*days?\s*validity/i) ||
    cleaned.match(/valid\s+for\s+(\d+)\s*days?/i);
  if (valMatch) {
    validityDays = parseInt(valMatch[1], 10);
    cleaned = cleaned.replace(valMatch[0], ' ');
  }

  // 5. Strip leading request boilerplate without destroying product words starting with A (e.g. AC repair service)
  cleaned = cleaned
    .replace(/^(?:please\s+)?(?:draft|create|make|generate|build)?\s+\b(?:a|an)\b\s+(?:quote|quotation|proposal|estimate|invoice)\s*(?:for|with)?\s*/i, '')
    .replace(/^(?:please\s+)?(?:draft|create|make|generate|build)\s+(?:quote|quotation|proposal|estimate|invoice)?\s*(?:for|with)?\s*/i, '')
    .replace(/^(?:please\s+)?(?:quote|quotation|proposal)\s*(?:for|with)?\s*/i, '');

  // 6. Extract Customer Name (e.g. "for Subesh", "for Acme Corp", "to Rahul Sharma", "client Apex Tech")
  let customerName: string | undefined = undefined;
  const custMatch =
    cleaned.match(/(?:customer|client)\s+([A-Za-z0-9\s&]{2,30}?)(?:\s+with|\s+having|,|$)/i) ||
    cleaned.match(/(?:to|for)\s+([A-Za-z][A-Za-z0-9\s&]{1,30}?)(?:\s+with|\s+having|,|$)/i);

  if (custMatch) {
    const candidate = custMatch[1].trim();
    // Ensure the candidate is not an item with a price
    const isItemWord = /^(hashboard|control|board|controal|laptop|service|product|glass|battery|screen|wire|cable|repair|fan|ram|drive|ssd|cpu|chair|table)/i.test(
      candidate
    );
    if (!/\d+/.test(candidate) && !isItemWord && candidate.length >= 2) {
      customerName = candidate;
      cleaned = cleaned.replace(custMatch[0], ' ');
    }
  }

  const items: ExtractedQuoteItem[] = [];

  // Try splitting by 'and', '+', ',', ';', or newline first
  const clauses = cleaned.split(/\b(?:and|\+)\b|[,;\n]/i).map((c) => c.trim()).filter(Boolean);
  for (const clause of clauses) {
    const match = clause.match(
      /^(?:(\d+)\s*(?:x|\*|units|nos|pcs|pieces)?\s+)?([A-Za-z0-9\s\-\.\/]+?)\s*(?:at|for|@|costing|price|of|:)?\s*(?:\$|₹|rs\.?|€|£)?\s*(\d+(?:\.\d+)?)(?:\s*(?:\$|usd|inr|eur|gbp|each|per unit|\/unit))?$/i
    );
    if (match) {
      const qty = parseInt(match[1] || '1', 10);
      let desc = match[2].trim();
      const price = parseFloat(match[3]);
      if (desc && !isNaN(price) && price > 0 && !/^(tax|gst|vat|discount|and|with)$/i.test(desc)) {
        const formattedDesc = desc
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        items.push({ description: formattedDesc, quantity: qty, unit_price: price });
      }
    }
  }

  // Fallback: If clause splitting didn't catch multiple items (e.g. 'hashboard $100 controal board $99')
  if (items.length === 0) {
    const multiRegex =
      /(?:(\d+)\s*(?:x|\*|units|nos|pcs|pieces)?\s+)?([A-Za-z][A-Za-z0-9\s\-\.\/]{1,40}?)\s*(?:at|for|@|costing|price|of|:)?\s*(?:\$|₹|rs\.?|€|£)?\s*(\d+(?:\.\d+)?)(?:\s*(?:\$|usd|inr|eur|gbp|each|per unit|\/unit))?/gi;
    const matches = [...cleaned.matchAll(multiRegex)];
    for (const m of matches) {
      const qty = parseInt(m[1] || '1', 10);
      let desc = m[2].trim();
      desc = desc
        .replace(/^(?:and|\+|for|with)\s+/i, '')
        .replace(/\s+(?:and|\+|for|with)$/i, '')
        .trim();
      const price = parseFloat(m[3]);
      if (desc && !isNaN(price) && price > 0 && !/^(tax|gst|vat|discount|and|with|for)$/i.test(desc)) {
        const formattedDesc = desc
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        items.push({ description: formattedDesc, quantity: qty, unit_price: price });
      }
    }
  }

  return {
    items,
    customerName,
    currency,
    taxRate,
    taxMode,
    discountValue,
    discountType,
    validityDays,
  };
}

/**
 * Classifies the user's intent BEFORE performing any entity lookups.
 * The customer database is a tool, NEVER the default destination for unknown messages.
 */
export function classifyCopilotIntent(
  text: string,
  context?: {
    action?: string;
    hasPendingQuote?: boolean;
    pendingQuoteStep?: string;
    hasActiveDraftQuote?: boolean;
    hasConfirmedCustomer?: boolean;
  }
): ClassificationResult {
  const raw = (text || '').trim();
  const lower = raw.toLowerCase();
  const action = context?.action;
  const hasPending = Boolean(context?.hasPendingQuote);
  const pendingStep = context?.pendingQuoteStep;
  const hasActiveDraft = Boolean(context?.hasActiveDraftQuote);
  const extractedSlots = extractQuoteSlots(raw);

  // 1. Explicit Structured Actions from Frontend
  if (action === 'start_quote_workflow' || action === 'create_quote') {
    return {
      intent: 'draft_quote',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }
  if (action === 'quotes_waiting_approval' || action === 'quote_followup') {
    return {
      intent: 'quotes_waiting_approval',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }
  if (action === 'overdue_invoices') {
    return {
      intent: 'overdue_invoices',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }
  if (action === 'sales_report') {
    return {
      intent: 'sales_report',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }
  if (action === 'payment_report') {
    return {
      intent: 'payment_report',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }
  if (action === 'import_products') {
    return {
      intent: 'import_products',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 2. Technical / Security / Internal Architecture Questions from Normal Users
  if (
    lower.includes('what database') ||
    lower.includes('are you using supabase') ||
    lower.includes('which database') ||
    lower.includes('supabase database') ||
    lower.includes('cloudflare workers') ||
    lower.includes('api keys') ||
    lower.includes('env variables') ||
    lower.includes('system architecture') ||
    lower.includes('backend architecture') ||
    lower.includes('database schema')
  ) {
    return {
      intent: 'technical_security_question',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 3. Business Operator: "What Should I Do Today?" / Daily Action Plan (Highest Priority for Actionable Operator Routines)
  if (
    lower.includes('what should i do today') ||
    lower.includes('what do i do today') ||
    lower.includes('what to do today') ||
    lower.includes('what should we do today') ||
    lower.includes('what should i do') ||
    lower.includes('daily action plan') ||
    lower.includes('daily plan') ||
    lower.includes('action plan for today') ||
    lower.includes('actions for today') ||
    lower.includes('operator plan') ||
    lower.includes('business operator') ||
    lower.includes('where are opportunities being lost') ||
    lower.includes('who should i follow up with today') ||
    lower.includes('who to follow up today') ||
    lower.includes('ready to invoice') ||
    lower.includes('unconverted approved quotes') ||
    lower.includes('repeat order opportunities')
  ) {
    return {
      intent: 'operator_daily_plan',
      confidence: 0.98,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 3b. Pipeline Health & Hot Leads (Phase 3 Business Operator)
  if (
    lower.includes('hot lead') ||
    lower.includes('hot leads') ||
    lower.includes('hot deals') ||
    lower.includes('deal temperature') ||
    lower.includes('pipeline temperature') ||
    lower.includes('pipeline status') ||
    lower.includes('pipeline health') ||
    lower.includes('sales pipeline') ||
    lower.includes('which deals are hot') ||
    lower.includes('which quotes are hot')
  ) {
    return {
      intent: 'pipeline_health',
      confidence: 0.96,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 3c. Lead Recovery & Expired/Dropped Quotes (Phase 3 Business Operator)
  if (
    lower.includes('recover lost quote') ||
    lower.includes('recover lost quotes') ||
    lower.includes('recover leads') ||
    lower.includes('lead recovery') ||
    lower.includes('lost quote recovery') ||
    lower.includes('unanswered quotes') ||
    lower.includes('recover expired') ||
    lower.includes('revive expired') ||
    lower.includes('quotes to recover')
  ) {
    return {
      intent: 'lead_recovery',
      confidence: 0.96,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 3d. Win/Loss & Conversion Insights (Phase 3 Business Operator)
  if (
    lower.includes('why are quotes not converting') ||
    lower.includes('win loss') ||
    lower.includes('win/loss') ||
    lower.includes('conversion insights') ||
    lower.includes('quote conversion rate') ||
    lower.includes('approval rate analysis') ||
    lower.includes('disparity report') ||
    lower.includes('discount impact on conversion')
  ) {
    return {
      intent: 'win_loss_insights',
      confidence: 0.96,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 4. Follow-Ups & Quotes Waiting Approval
  // e.g. "Show quotes waiting for approval", "Follow up with customers", "Who hasn't approved?"
  if (
    lower === 'follow up with customers' ||
    lower.includes('quotes waiting for approval') ||
    lower.includes('quote waiting for approval') ||
    lower.includes('quotes awaiting approval') ||
    lower.includes('unapproved quote') ||
    lower.includes('unapproved quotes') ||
    lower.includes('waiting for approval') ||
    lower.includes('who has not approved') ||
    lower.includes("who hasn't approved") ||
    lower.includes('customers have not approved') ||
    lower.includes("customers haven't approved") ||
    lower.includes('need follow up') ||
    lower.includes('needs follow up') ||
    lower.includes('follow up with') ||
    lower === 'follow up' ||
    lower === 'follow-up' ||
    lower === 'followups'
  ) {
    return {
      intent: 'quotes_waiting_approval',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 4. Overdue Invoices
  // e.g. "Show overdue invoices", "List pending and overdue payments"
  if (
    lower === 'show overdue invoices' ||
    lower.includes('overdue invoice') ||
    lower.includes('overdue invoices') ||
    lower.includes('overdue payment') ||
    lower.includes('overdue payments') ||
    lower.includes('pending and overdue') ||
    lower.includes('overdue bills') ||
    lower.includes('who has overdue')
  ) {
    return {
      intent: 'overdue_invoices',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 5. Sales This Month
  // e.g. "Show sales this month", "Show this month's sales", "Sales this month"
  if (
    lower === 'show sales this month' ||
    lower.includes('sales this month') ||
    lower.includes("this month's sales") ||
    lower.includes('monthly sales') ||
    lower.includes('sales for this month') ||
    lower.includes('how much did i sell this month')
  ) {
    return {
      intent: 'sales_report',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 6. Payment & Pending Reports
  // e.g. "How much payment is pending?", "Show payment report", "Pending payment"
  if (
    lower.includes('payment is pending') ||
    lower.includes('payment pending') ||
    lower.includes('pending payment') ||
    lower.includes('pending payments') ||
    lower.includes('payment report') ||
    lower.includes('payments report') ||
    lower.includes('payment due') ||
    lower.includes('payments due') ||
    lower.includes('how much did i receive') ||
    lower.includes('received this month') ||
    lower.includes('received payment') ||
    lower.includes("haven't paid") ||
    lower.includes('havent paid') ||
    lower.includes('who has not paid')
  ) {
    return {
      intent: 'payment_report',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 7. Product Import
  // e.g. "Help me import products for a quote", "Import products", "Upload product list"
  if (
    lower.includes('import product') ||
    lower.includes('import products') ||
    lower.includes('import item') ||
    lower.includes('import items') ||
    lower.includes('upload product list') ||
    lower.includes('upload products') ||
    lower.includes('upload items') ||
    lower.includes('bulk import') ||
    lower.includes('import from excel') ||
    lower.includes('import from csv')
  ) {
    return {
      intent: 'import_products',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 8. General Product / Business Flow Explanation
  // e.g. "How does my business quotation reach the customer?", "How does quotation delivery work?"
  if (
    lower.includes('reach the customer') ||
    lower.includes('quotation reach') ||
    lower.includes('how does my quotation reach') ||
    lower.includes('how does my business quotation reach') ||
    lower.includes('how do quotes reach') ||
    lower.includes('how does quotation delivery work') ||
    lower.includes('how does quoteflow deliver')
  ) {
    return {
      intent: 'general_quoteflow_question',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 9. Send Quote / Email / WhatsApp
  if (
    lower === 'send it' ||
    lower === 'send' ||
    lower.startsWith('send ') ||
    lower.includes('confirm & send') ||
    lower.includes('confirm and send') ||
    lower.includes('send quote') ||
    lower.includes('email it') ||
    lower.includes('email quote') ||
    lower.includes('send through whatsapp') ||
    lower.includes('send via whatsapp')
  ) {
    const isWhatsApp = lower.includes('whatsapp');
    return {
      intent: isWhatsApp ? 'send_whatsapp' : 'send_email',
      confidence: 0.95,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // Change customer in active draft
  if (
    hasPending &&
    (lower === 'change customer' ||
      lower === 'switch customer' ||
      lower === 'change the customer' ||
      lower === 'different customer')
  ) {
    return {
      intent: 'change_customer',
      confidence: 1.0,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // Same quote for XYZ
  if (
    hasPending &&
    (lower.includes('same quote for') || lower.includes('same for'))
  ) {
    const custName = raw.replace(/.*(?:same quote for|same for)\s+/i, '').trim();
    return {
      intent: 'customer_lookup',
      confidence: 0.95,
      slots: {
        ...extractedSlots,
        customerName: custName,
      },
      isDeterministic: true,
    };
  }

  // 10. Natural Language Editing of Existing / Pending Quote Draft
  // e.g. "Make Battery $350", "Change Battery to $350", "Add installation $50", "Remove Gas", "Give 10% discount"
  const isEditingCommand =
    (hasPending || hasActiveDraft) &&
    (lower.startsWith('change ') ||
      lower.startsWith('update ') ||
      lower.startsWith('set ') ||
      lower.startsWith('make ') ||
      lower.startsWith('add ') ||
      lower.startsWith('remove ') ||
      lower.startsWith('delete ') ||
      lower.includes('quantity ') ||
      lower.includes('qty ') ||
      lower.includes('discount') ||
      lower.includes('validity') ||
      lower.includes('tax to ') ||
      lower.includes('tax inclusive') ||
      lower.includes('tax exclusive'));

  if (isEditingCommand) {
    return {
      intent: 'edit_quote',
      confidence: 0.95,
      slots: extractQuoteSlots(raw),
      isDeterministic: true,
    };
  }

  // 11. "Draft a quote" / "Create a quote" with NO items yet (Guided flow start)
  const isCleanDraftRequest =
    lower === 'draft a quote' ||
    lower === 'draft quote' ||
    lower === 'create a quote' ||
    lower === 'create quote' ||
    lower === 'new quote' ||
    lower === 'start quote' ||
    lower === 'build a quote' ||
    lower === 'make a quote' ||
    lower === 'make quote' ||
    lower === 'draft';

  if (isCleanDraftRequest && extractedSlots.items.length === 0) {
    return {
      intent: 'draft_quote',
      confidence: 1.0,
      slots: extractedSlots,
      isDeterministic: true,
    };
  }

  // 12. Complete or Partial Quote Creation Request with Items
  // e.g. "Battery $400 and Gas $100" or "Create quote Battery $400 and Gas $100 for Subesh"
  if (extractedSlots.items.length > 0) {
    return {
      intent: 'create_quote',
      confidence: 0.9,
      slots: extractedSlots,
      isDeterministic: true,
    };
  }

  // 13. Customer Resolution Step in Active Quote Workflow
  // If we are specifically in 'awaiting_customer' or 'waiting_for_customer_selection'
  if (hasPending && (pendingStep === 'awaiting_customer' || pendingStep === 'waiting_for_customer_selection')) {
    const custClean = raw
      .replace(/^(?:for|to|customer|client|assign to)\s+/i, '')
      .replace(/^select customer\s+/i, '')
      .trim();

    return {
      intent: 'customer_lookup',
      confidence: 0.85,
      slots: {
        ...extractedSlots,
        customerName: custClean,
      },
      isDeterministic: true,
    };
  }

  // 14. Action History
  if (
    lower.includes('did i follow up') ||
    lower.includes('did i send a reminder') ||
    lower.includes('follow up history') ||
    lower.includes('recent actions') ||
    lower.includes('who did i remind')
  ) {
    return {
      intent: 'action_history',
      confidence: 0.9,
      slots: { items: [] },
      isDeterministic: true,
    };
  }


  // 16. Proactive Briefing
  if (
    lower === "today's briefing" ||
    lower === 'todays briefing' ||
    lower === 'daily briefing' ||
    lower.includes('what happened') ||
    lower.includes('what needs my attention') ||
    lower.includes('what should i do next')
  ) {
    return {
      intent: 'proactive_briefing',
      confidence: 0.9,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 16. In-Process Quotations Query
  if (
    lower.includes('in process') ||
    lower.includes('in-process') ||
    lower.includes('in progress') ||
    lower.includes('in-progress')
  ) {
    return {
      intent: 'quote_lookup',
      confidence: 0.85,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // 17. General Quotation Performance Questions
  if (
    lower.includes('how many quotes') ||
    lower.includes('quotes report') ||
    lower.includes('quotation report') ||
    lower.includes('biggest quote') ||
    lower.includes('most customer views')
  ) {
    return {
      intent: 'general_business_question',
      confidence: 0.8,
      slots: { items: [] },
      isDeterministic: true,
    };
  }

  // Default Fallback: Unknown / General Help
  return {
    intent: 'unknown',
    confidence: 0.5,
    slots: extractedSlots,
    isDeterministic: false,
  };
}
