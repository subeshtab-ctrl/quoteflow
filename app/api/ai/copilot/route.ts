import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { calculateQuotationTotals, formatCurrency } from '@/lib/quotations/calculations';
import { generateQuotationSentEmail, sendEmail } from '@/lib/email/service';
import { CurrencyCode, Quotation, Customer } from '@/types/database';
import { matchCustomerIntelligently, generateAiBusinessBriefing } from '@/lib/ai/proactive-engine';
import { generateRichAiResponse, callGeminiStructuredOutput } from '@/lib/ai/rich-response-generator';
import { RichAiResponsePayload } from '@/types/rich-ai';
import { classifyCopilotIntent, extractQuoteSlots, CopilotIntent } from '@/lib/ai/intent-classifier';
import { growthEngine } from '@/lib/ai/growth-engine';
import { businessOperatorEngine } from '@/lib/ai/business-operator/operator-engine';
import { controlledActionRegistry } from '@/lib/ai/business-operator/action-registry';
import { operatorRecommendationManager } from '@/lib/ai/business-operator/recommendation-manager';

export const dynamic = 'force-dynamic';

/**
 * Optional Gemini API caller for open-domain assistant intelligence
 */
async function callGeminiIfAvailable(prompt: string, systemContext: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemContext }],
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 300,
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply.trim();
    }
  } catch {
    // Graceful fallback to built-in reasoning engine
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to continue.' }, { status: 401 });
    }

    const orgId = auth.orgId;

    const { subscriptionService } = await import('@/lib/billing/subscription-service');
    const entitlement = await subscriptionService.getOrganizationEntitlement(orgId);
    if (!entitlement.hasAccess) {
      return NextResponse.json(
        {
          error:
            auth.role === 'STAFF'
              ? "Your organization's QuoteFlow subscription has expired. Please contact your administrator."
              : 'Your QuoteFlow Pro subscription has expired. Please renew your subscription to use QuoteFlow AI.',
        },
        { status: 402 }
      );
    }

    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const orgCurrency = (org?.default_currency || 'INR') as CurrencyCode;
    const defaultTax = org?.default_tax_rate ?? 0;

    const body = await req.json().catch(() => ({}));
    const {
      message,
      activeDraftId,
      confirmedCustomerId,
      customerId,
      customer,
      pendingQuotePayload,
      clientHour,
      action,
    } = body;
    const text = (message || '').trim();

    const targetCustId =
      confirmedCustomerId ||
      customerId ||
      body.customer_id ||
      body.customer?.id ||
      pendingQuotePayload?.customerId ||
      pendingQuotePayload?.customer?.id;

    if (
      !text &&
      !targetCustId &&
      action !== 'commit_quote' &&
      action !== 'select_customer' &&
      action !== 'start_quote_workflow' &&
      action !== 'daily_plan' &&
      action !== 'execute_operator_action'
    ) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    // Direct Execution for Controlled Operator Actions
    if (action === 'execute_operator_action') {
      const { operatorActionId, actionKey, resourceId, resourceType, draftPayload, confirmed } = body;
      const result = await controlledActionRegistry.executeAction(
        actionKey,
        draftPayload || { resourceId, resourceType },
        {
          organizationId: orgId,
          userId: auth.userId,
          userEmail: auth.email,
          userRole: auth.role as any,
        },
        confirmed
      );

      // Auto-reconcile recommendation if successful
      if (result.success && operatorActionId) {
        await operatorRecommendationManager.updateRecommendationStatus(
          orgId,
          operatorActionId,
          'COMPLETED',
          'CONTACTED',
          draftPayload?.value
        );
      }

      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        requiresConfirmation: result.requiresConfirmation,
        confirmationMessage: result.confirmationMessage,
        draftPayload: result.draftPayload,
      });
    }

    const lower = text.toLowerCase();

    // Helper to send copilot response cleanly
    const sendResponse = async (payload: any) => {
      try {
        const isFocusedAction = [
          'guided_quote_ask_items',
          'guided_quote_ask_customer',
          'quote_draft_preview',
          'customer_multi_match',
          'customer_exact_match',
          'customer_not_found',
          'quote_created',
          'quote_draft',
          'quote_sent',
          'import_products',
          'operator_daily_plan',
          'pipeline_analysis',
          'lead_recovery',
          'win_loss_insights',
        ].includes(payload.actionType);

        if (!payload.richPayload && !isFocusedAction) {
          const [allQuotes, allInvoices] = await Promise.all([
            store.getQuotations(orgId, { environment: env }),
            store.getInvoices(orgId, { environment: env }),
          ]);
          payload.richPayload = await generateRichAiResponse({
            userPrompt: text || payload.replyText || '',
            org,
            quotations: allQuotes,
            invoices: allInvoices,
            activeDraftQuote: payload.quotation || (activeDraftId ? await store.getQuotationById(activeDraftId, orgId) : null),
            reportData: payload.reportData,
            replyText: payload.replyText,
          });
        }
      } catch (e) {
        console.warn('generateRichAiResponse helper note:', e);
      }
      return NextResponse.json(payload);
    };

    // =========================================================================
    // INTENT CLASSIFICATION FIRST (Deterministic Intent Router)
    // =========================================================================
    const classification = classifyCopilotIntent(text, {
      action,
      hasPendingQuote: Boolean(pendingQuotePayload?.items?.length),
      pendingQuoteStep: pendingQuotePayload?.step,
      hasActiveDraftQuote: Boolean(activeDraftId),
      hasConfirmedCustomer: Boolean(targetCustId),
    });

    const { intent, slots } = classification;

    // =========================================================================
    // 1. STRUCTURED ACTION: CUSTOMER SELECTION BY UNIQUE ID
    // Critical: When user clicks "Select -> [Customer]" from multiple matches,
    // do NOT perform fuzzy name search again. Resolve directly by database ID.
    // =========================================================================
    if (action === 'select_customer' || (Boolean(targetCustId) && pendingQuotePayload?.items?.length > 0 && action !== 'commit_quote' && pendingQuotePayload?.step !== 'draft_ready' && pendingQuotePayload?.step !== 'draft_preview')) {
      const existingCustomers = await store.getCustomers(orgId, { environment: env });
      let resolvedCustomer: Customer | null = null;

      if (targetCustId) {
        resolvedCustomer =
          existingCustomers.find((c) => c.id === targetCustId) ||
          (await store.getCustomer(targetCustId, orgId)) ||
          null;
      }

      if (!resolvedCustomer && body.customer && body.customer.id) {
        resolvedCustomer =
          existingCustomers.find((c) => c.id === body.customer.id) || body.customer;
      }

      if (resolvedCustomer && pendingQuotePayload?.items?.length > 0) {
        const subtotal = pendingQuotePayload.items.reduce(
          (s: number, it: any) => s + it.unit_price * it.quantity,
          0
        );
        const taxRate = pendingQuotePayload.taxRate !== undefined ? pendingQuotePayload.taxRate : defaultTax;
        const discountVal = pendingQuotePayload.discountValue || 0;
        const discountAmount = pendingQuotePayload.discountType === 'PERCENTAGE'
          ? (subtotal * discountVal) / 100
          : discountVal;
        const taxable = Math.max(0, subtotal - discountAmount);
        const taxAmount = (taxable * taxRate) / 100;
        const grandTotal = Math.round(taxable + taxAmount);
        const activeCurrency = pendingQuotePayload.currency || orgCurrency;

        const updatedPayload = {
          ...pendingQuotePayload,
          customer: resolvedCustomer,
          customerId: resolvedCustomer.id,
          customerName: resolvedCustomer.name,
          currency: activeCurrency,
          subtotal,
          taxRate,
          grandTotal,
          step: 'draft_preview',
          workflowStatus: 'draft_ready',
          customerResolved: true,
        };

        const loc = [resolvedCustomer.city, resolvedCustomer.state, resolvedCustomer.country]
          .filter(Boolean)
          .join(', ');

        return sendResponse({
          replyText: `Customer found\n\n👤 **${resolvedCustomer.name}**${
            resolvedCustomer.company_name && resolvedCustomer.company_name !== resolvedCustomer.name
              ? ` (${resolvedCustomer.company_name})`
              : ''
          }\n📧 ${resolvedCustomer.email || 'No email'}\n📞 ${
            resolvedCustomer.phone || 'No phone'
          }\n📍 ${loc || 'India'}`,
          actionType: 'quote_draft_preview',
          customer: resolvedCustomer,
          pendingQuotePayload: updatedPayload,
        });
      }
    }

    // =========================================================================
    // 2. STRUCTURED ACTION: COMMIT QUOTE (Saves quote to database)
    // =========================================================================
    const isCommitAction =
      action === 'commit_quote' ||
      ((lower === 'create quote' || lower === 'create the quote' || lower === 'confirm quote') &&
        pendingQuotePayload?.items?.length > 0 &&
        pendingQuotePayload?.customer);

    if (isCommitAction && pendingQuotePayload?.items?.length > 0) {
      const existingCustomers = await store.getCustomers(orgId, { environment: env });
      let targetCustomer = targetCustId
        ? existingCustomers.find((c) => c.id === targetCustId) || (await store.getCustomer(targetCustId, orgId))
        : pendingQuotePayload.customer;

      if (!targetCustomer && (pendingQuotePayload.customerName || pendingQuotePayload.customer?.name)) {
        const cName = pendingQuotePayload.customerName || pendingQuotePayload.customer?.name;
        const matchResult = matchCustomerIntelligently(existingCustomers, cName);
        if (matchResult.customer) targetCustomer = matchResult.customer;
      }

      if (!targetCustomer) {
        return sendResponse({
          replyText: 'Got it. Who is this quote for?',
          actionType: 'guided_quote_ask_customer',
          pendingQuotePayload,
        });
      }

      const activeCurrency = pendingQuotePayload.currency || orgCurrency;
      const resolvedTaxRate = pendingQuotePayload.taxRate !== undefined ? pendingQuotePayload.taxRate : defaultTax;
      const resolvedTaxMode = pendingQuotePayload.taxMode || org?.default_tax_mode || 'exclusive';
      const issueDate = new Date().toISOString().slice(0, 10);
      const validityDays = pendingQuotePayload.validityDays || org?.default_validity_days || 30;
      const validUntil = new Date(Date.now() + validityDays * 86400000).toISOString().slice(0, 10);

      const quotation = await store.createQuotation({
        organization_id: orgId,
        customer_id: targetCustomer.id,
        title: `Proposal for ${targetCustomer.name}`,
        status: 'DRAFT',
        issue_date: issueDate,
        valid_until: validUntil,
        items: pendingQuotePayload.items.map((it: any) => ({
          description: it.description,
          quantity: it.quantity,
          unit: 'unit',
          unit_price: it.unit_price,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: resolvedTaxRate,
        })),
        tax_rate: resolvedTaxRate,
        tax_mode: resolvedTaxMode,
        country: org?.country || 'India',
        supplier_state: org?.business_state || org?.state,
        place_of_supply: targetCustomer.place_of_supply || targetCustomer.state || org?.business_state || org?.state,
        discount_value: pendingQuotePayload.discountValue || 0,
        discount_type: pendingQuotePayload.discountType || 'PERCENTAGE',
        currency: activeCurrency,
        notes: pendingQuotePayload.notes || org?.default_terms || 'Payment due within 30 days of completion.',
      });

      return sendResponse({
        replyText: `✓ Quotation **${quotation.quotation_number}** created for **${targetCustomer.name}**!\nTotal: **${formatCurrency(
          quotation.grand_total,
          quotation.currency
        )}**.\n\nWhat would you like to do next?\n• **Send via WhatsApp**\n• **Send via Email**\n• **View Quote**\n• **Download PDF**`,
        actionType: 'quote_created',
        quotation,
        sentDetails: {
          quoteId: quotation.id,
          quoteNumber: quotation.quotation_number,
          customerName: targetCustomer.name,
          amount: quotation.grand_total,
          currency: quotation.currency,
          status: 'Draft',
          publicToken: quotation.public_token,
          viewUrl: `/quotations/${quotation.id}`,
          pdfUrl: `/api/public/pdf?token=${quotation.public_token}`,
          phone: targetCustomer.phone,
          email: targetCustomer.email,
        },
      });
    }

    // =========================================================================
    // 2A. BUSINESS GROWTH & LEARNING INQUIRIES (Organization-Isolated Insights)
    // =========================================================================
    const isGrowthInquiry =
      lower.includes('sales down') ||
      lower.includes('drop in sales') ||
      lower.includes('why are my sales') ||
      lower.includes('services make') ||
      lower.includes('most money') ||
      (lower.includes('service') && (lower.includes('profitable') || lower.includes('top earning') || lower.includes('best earning'))) ||
      lower.includes('similar to my best') ||
      lower.includes('similar customers') ||
      (lower.includes('follow up') && (lower.includes('quote') || lower.includes('today') || lower.includes('priority'))) ||
      lower.includes("haven't paid") ||
      lower.includes('have not paid') ||
      lower.includes('not paid') ||
      lower.includes('reorder') ||
      (lower.includes('rejected') && lower.includes('quote')) ||
      lower.includes('salesperson') ||
      lower.includes('sales person') ||
      lower.includes('sales staff') ||
      (lower.includes('potential customer') || (lower.includes('find') && lower.includes('customer') && (lower.includes('in ') || lower.includes('prospect')))) ||
      lower.includes('health score') ||
      lower.includes('business health') ||
      lower.includes('mistake') ||
      lower.includes('growth opportunities');

    if (
      isGrowthInquiry &&
      !isCommitAction &&
      action !== 'select_customer' &&
      !pendingQuotePayload?.items?.length
    ) {
      const growthAnswer = await growthEngine.answerNaturalBusinessQuestion(orgId, text, auth.role);
      return sendResponse({
        replyText: growthAnswer.answerMarkdown,
        actionType: 'business_growth_insight',
        growthAnswer,
        suggestedFollowUps: growthAnswer.suggestedFollowUps,
        actionLink: growthAnswer.actionLink,
      });
    }

    // =========================================================================
    // 2B. INTENT: CHANGE CUSTOMER
    // =========================================================================
    if (intent === 'change_customer') {
      return sendResponse({
        replyText: 'Got it. Who would you like to assign this quote to?',
        actionType: 'guided_quote_ask_customer',
        pendingQuotePayload: {
          ...pendingQuotePayload,
          customer: null,
          customerId: null,
          customerName: null,
          step: 'awaiting_customer',
          workflowStatus: 'waiting_for_customer',
        },
      });
    }

    // =========================================================================
    // 3. INTENT: DRAFT QUOTE (Guided Workflow Start — No Items Yet)
    // Test 1: Click "Create a quote" or type "Draft a quote" -> asks for items.
    // =========================================================================
    if (intent === 'draft_quote') {
      return sendResponse({
        replyText: 'Sure. What products or services would you like to include? Send me the item names, prices and quantities if applicable.',
        actionType: 'guided_quote_ask_items',
        pendingQuotePayload: {
          step: 'awaiting_items',
          items: [],
          currency: orgCurrency,
        },
      });
    }

    // =========================================================================
    // 4. INTENT: CREATE QUOTE (Items Provided in Input)
    // Test 2: "Battery $400 and Gas $100" -> understands total $500, asks who for.
    // Test 4: "Create quote Battery $400 and Gas $100 for Subesh" -> parses both, resolves customer, prepares draft.
    // =========================================================================
    if (intent === 'create_quote') {
      const parsedItems = slots.items;
      const subtotal = parsedItems.reduce((s, it) => s + it.unit_price * it.quantity, 0);
      const taxRate = slots.taxRate !== undefined ? slots.taxRate : defaultTax;
      const discountVal = slots.discountValue || 0;
      const discountAmount = slots.discountType === 'PERCENTAGE'
        ? (subtotal * discountVal) / 100
        : discountVal;
      const taxable = Math.max(0, subtotal - discountAmount);
      const taxAmount = (taxable * taxRate) / 100;
      const grandTotal = Math.round(taxable + taxAmount);
      const activeCurrency = slots.currency || orgCurrency;

      // Case A: Customer was already supplied in this message (e.g. "for Subesh")
      if (slots.customerName) {
        const existingCustomers = await store.getCustomers(orgId, { environment: env });
        const matchResult = matchCustomerIntelligently(existingCustomers, slots.customerName);

        if (matchResult.type === 'exact' && matchResult.customer) {
          const cust = matchResult.customer;
          const loc = [cust.city, cust.state, cust.country].filter(Boolean).join(', ');
          return sendResponse({
            replyText: `Customer found\n\n👤 **${cust.name}**${
              cust.company_name && cust.company_name !== cust.name ? ` (${cust.company_name})` : ''
            }\n📧 ${cust.email || 'No email'}\n📞 ${cust.phone || 'No phone'}\n📍 ${loc || 'India'}`,
            actionType: 'quote_draft_preview',
            customer: cust,
            pendingQuotePayload: {
              items: parsedItems,
              customer: cust,
              customerId: cust.id,
              customerName: cust.name,
              currency: activeCurrency,
              subtotal,
              taxRate,
              grandTotal,
              discountValue: discountVal,
              discountType: slots.discountType || 'PERCENTAGE',
              validityDays: slots.validityDays || 15,
              step: 'draft_preview',
              workflowStatus: 'draft_ready',
              customerResolved: true,
            },
          });
        }

        if (matchResult.type === 'multiple') {
          return sendResponse({
            replyText: `I found ${matchResult.matches.length} customers matching "${slots.customerName}". Select the correct customer:`,
            actionType: 'customer_multi_match',
            candidateMatches: matchResult.matches.map((m) => ({
              customer: m.customer,
              score: m.score,
              reason: m.reason,
            })),
            searchedTerm: slots.customerName,
            pendingQuotePayload: {
              items: parsedItems,
              currency: activeCurrency,
              subtotal,
              taxRate,
              grandTotal,
              discountValue: discountVal,
              discountType: slots.discountType || 'PERCENTAGE',
              validityDays: slots.validityDays || 15,
              step: 'waiting_for_customer_selection',
              workflowStatus: 'waiting_for_customer_selection',
            },
          });
        }

        if (matchResult.type === 'none') {
          return sendResponse({
            replyText: `I couldn't find "${slots.customerName}" in your saved customers. Would you like to add ${slots.customerName}?`,
            actionType: 'customer_not_found',
            searchedTerm: slots.customerName,
            pendingQuotePayload: {
              items: parsedItems,
              currency: activeCurrency,
              subtotal,
              taxRate,
              grandTotal,
              discountValue: discountVal,
              discountType: slots.discountType || 'PERCENTAGE',
              validityDays: slots.validityDays || 15,
              step: 'awaiting_customer',
              workflowStatus: 'waiting_for_customer',
            },
          });
        }
      }

      // Case B: Customer NOT supplied yet -> ask: "Got it. Who is this quote for?"
      return sendResponse({
        replyText: 'Got it. Who is this quote for?',
        actionType: 'guided_quote_ask_customer',
        pendingQuotePayload: {
          items: parsedItems,
          currency: activeCurrency,
          subtotal,
          taxRate,
          grandTotal,
          discountValue: discountVal,
          discountType: slots.discountType || 'PERCENTAGE',
          validityDays: slots.validityDays || 15,
          step: 'awaiting_customer',
          workflowStatus: 'waiting_for_customer',
        },
      });
    }

    // =========================================================================
    // 5. INTENT: CUSTOMER LOOKUP (Answering "Who is this quote for?")
    // Test 3: User enters "Subesh" -> if multiple, shows selectable cards.
    // =========================================================================
    if (intent === 'customer_lookup' && pendingQuotePayload?.items?.length > 0) {
      const custQuery = slots.customerName || text;
      const existingCustomers = await store.getCustomers(orgId, { environment: env });
      const matchResult = matchCustomerIntelligently(existingCustomers, custQuery);

      if (matchResult.type === 'exact' && matchResult.customer) {
        const cust = matchResult.customer;
        const subtotal = pendingQuotePayload.items.reduce((s: number, it: any) => s + it.unit_price * it.quantity, 0);
        const taxRate = pendingQuotePayload.taxRate !== undefined ? pendingQuotePayload.taxRate : defaultTax;
        const discountVal = pendingQuotePayload.discountValue || 0;
        const discountAmount = pendingQuotePayload.discountType === 'PERCENTAGE'
          ? (subtotal * discountVal) / 100
          : discountVal;
        const taxable = Math.max(0, subtotal - discountAmount);
        const taxAmount = (taxable * taxRate) / 100;
        const grandTotal = Math.round(taxable + taxAmount);
        const activeCurrency = pendingQuotePayload.currency || orgCurrency;
        const loc = [cust.city, cust.state, cust.country].filter(Boolean).join(', ');

        return sendResponse({
          replyText: `Customer found\n\n👤 **${cust.name}**${
            cust.company_name && cust.company_name !== cust.name ? ` (${cust.company_name})` : ''
          }\n📧 ${cust.email || 'No email'}\n📞 ${cust.phone || 'No phone'}\n📍 ${loc || 'India'}`,
          actionType: 'quote_draft_preview',
          customer: cust,
          pendingQuotePayload: {
            ...pendingQuotePayload,
            customer: cust,
            customerId: cust.id,
            customerName: cust.name,
            currency: activeCurrency,
            subtotal,
            taxRate,
            grandTotal,
            step: 'draft_preview',
            workflowStatus: 'draft_ready',
            customerResolved: true,
          },
        });
      }

      if (matchResult.type === 'multiple') {
        return sendResponse({
          replyText: `I found ${matchResult.matches.length} customers matching "${custQuery}". Select the correct customer:`,
          actionType: 'customer_multi_match',
          candidateMatches: matchResult.matches.map((m) => ({
            customer: m.customer,
            score: m.score,
            reason: m.reason,
          })),
          searchedTerm: custQuery,
          pendingQuotePayload: {
            ...pendingQuotePayload,
            step: 'waiting_for_customer_selection',
            workflowStatus: 'waiting_for_customer_selection',
          },
        });
      }

      if (matchResult.type === 'none') {
        return sendResponse({
          replyText: `I couldn't find "${custQuery}" in your saved customers. Would you like to add ${custQuery}?`,
          actionType: 'customer_not_found',
          searchedTerm: custQuery,
          pendingQuotePayload: {
            ...pendingQuotePayload,
            step: 'awaiting_customer',
            workflowStatus: 'waiting_for_customer',
          },
        });
      }
    }

    // =========================================================================
    // 6. INTENT: EDIT QUOTE (Natural Language Modifications)
    // Test 12: "Change Battery to $350" -> modifies existing draft
    // =========================================================================
    if (intent === 'edit_quote') {
      const activePayload = pendingQuotePayload || (activeDraftId ? await store.getQuotationById(activeDraftId, orgId) : null);
      if (activePayload && activePayload.items?.length > 0) {
        let currentItems = [...activePayload.items];
        let currentTaxRate = activePayload.taxRate ?? activePayload.tax_rate ?? defaultTax;
        let currentTaxMode = activePayload.taxMode ?? activePayload.tax_mode ?? (org?.default_tax_mode || 'exclusive');
        let currentDiscountVal = activePayload.discountValue ?? activePayload.discount_value ?? 0;
        let currentDiscountType = activePayload.discountType || activePayload.discount_type || 'PERCENTAGE';
        let currentCurrency = activePayload.currency || orgCurrency;
        let currentValidity = activePayload.validityDays || 15;
        let modified = false;
        let modSummary = '';

        // Price change: "Change Battery to $350", "Make Battery $350"
        const changePriceMatch = text.match(
          /(?:change|update|set|make)\s+([A-Za-z0-9\s]+?)\s+(?:to|as|=|at|price)\s*(?:\$|₹|rs\.?|€|£)?\s*(\d+(?:\.\d+)?)/i
        );
        if (changePriceMatch) {
          const itemDesc = changePriceMatch[1].trim().toLowerCase();
          const newPrice = parseFloat(changePriceMatch[2]);
          const idx = currentItems.findIndex((it: any) => it.description.toLowerCase().includes(itemDesc));
          if (idx >= 0 && !isNaN(newPrice)) {
            currentItems[idx] = { ...currentItems[idx], unit_price: newPrice };
            modified = true;
            modSummary = `Updated **${currentItems[idx].description}** price to **${formatCurrency(newPrice, currentCurrency)}**.`;
          }
        }

        // Quantity change: "Battery quantity 3", "Change Battery quantity to 3"
        const qtyMatch =
          text.match(/(?:change\s+)?([A-Za-z0-9\s]+?)\s+(?:quantity|qty)\s*(?:to|=)?\s*(\d+)/i) ||
          text.match(/(\d+)\s*(?:x|\*|nos|units|pcs)?\s+([A-Za-z0-9\s]+?)\s*(?:quantity|qty)/i);
        if (qtyMatch && !changePriceMatch) {
          const itemDesc = qtyMatch[1].trim().toLowerCase();
          const newQty = parseInt(qtyMatch[2], 10);
          const idx = currentItems.findIndex((it: any) => it.description.toLowerCase().includes(itemDesc));
          if (idx >= 0 && !isNaN(newQty) && newQty > 0) {
            currentItems[idx] = { ...currentItems[idx], quantity: newQty };
            modified = true;
            modSummary = `Updated **${currentItems[idx].description}** quantity to **${newQty}**.`;
          }
        }

        // Add item: "Add installation $50"
        if (!modified && lower.startsWith('add ')) {
          const parsedAdd = extractQuoteSlots(text, currentTaxRate);
          if (parsedAdd.items.length > 0) {
            for (const newItem of parsedAdd.items) {
              const existingIdx = currentItems.findIndex((it: any) =>
                it.description.toLowerCase().includes(newItem.description.toLowerCase())
              );
              if (existingIdx >= 0) {
                currentItems[existingIdx].quantity += newItem.quantity;
                if (newItem.unit_price > 0) currentItems[existingIdx].unit_price = newItem.unit_price;
              } else {
                currentItems.push(newItem);
              }
            }
            modified = true;
            modSummary = `Added **${parsedAdd.items.map((i) => `${i.quantity}x ${i.description}`).join(', ')}** to draft.`;
          }
        }

        // Remove item: "Remove Gas", "Delete Gas"
        const removeMatch = text.match(/(?:remove|delete)\s+([A-Za-z0-9\s]+)/i);
        if (removeMatch && !changePriceMatch && !qtyMatch) {
          const toRemove = removeMatch[1].trim().toLowerCase();
          const prevLen = currentItems.length;
          currentItems = currentItems.filter((it: any) => !it.description.toLowerCase().includes(toRemove));
          if (currentItems.length < prevLen) {
            modified = true;
            modSummary = `Removed **${removeMatch[1].trim()}** from the draft.`;
          }
        }

        // Discount: "Give 10% discount", "Apply 10% discount"
        const discMatch =
          text.match(/(?:discount|disc)\s*(?:to|of|is)?\s*(\d+(?:\.\d+)?)\s*%/i) ||
          text.match(/(\d+(?:\.\d+)?)\s*%\s*discount/i) ||
          text.match(/give\s+(\d+(?:\.\d+)?)\s*%\s*discount/i);
        if (discMatch) {
          currentDiscountVal = parseFloat(discMatch[1]);
          currentDiscountType = 'PERCENTAGE';
          modified = true;
          modSummary = (modSummary ? modSummary + ' ' : '') + `Applied **${currentDiscountVal}% discount**.`;
        }

        // Tax rate & mode: "Add 5% GST", "Make tax inclusive", "Tax exclusive"
        const taxMatch = text.match(/(?:tax|gst|vat)\s*(?:to|at|is)?\s*(\d+(?:\.\d+)?)\s*%/i);
        if (taxMatch) {
          currentTaxRate = parseFloat(taxMatch[1]);
          modified = true;
          modSummary = (modSummary ? modSummary + ' ' : '') + `Adjusted tax rate to **${currentTaxRate}%**.`;
        }
        if (lower.includes('tax inclusive') || lower.includes('inclusive tax')) {
          currentTaxMode = 'inclusive';
          modified = true;
          modSummary = (modSummary ? modSummary + ' ' : '') + `Set tax mode to **Tax Inclusive**.`;
        } else if (lower.includes('tax exclusive') || lower.includes('exclusive tax')) {
          currentTaxMode = 'exclusive';
          modified = true;
          modSummary = (modSummary ? modSummary + ' ' : '') + `Set tax mode to **Tax Exclusive**.`;
        }

        if (modified) {
          const subtotal = currentItems.reduce((s: number, it: any) => s + it.unit_price * it.quantity, 0);
          const discountAmount =
            currentDiscountType === 'PERCENTAGE' ? (subtotal * currentDiscountVal) / 100 : currentDiscountVal;
          const taxable = Math.max(0, subtotal - discountAmount);
          const taxAmount = (taxable * currentTaxRate) / 100;
          const grandTotal = Math.round(taxable + taxAmount);

          const updatedPayload = {
            ...activePayload,
            items: currentItems,
            taxRate: currentTaxRate,
            taxMode: currentTaxMode,
            discountValue: currentDiscountVal,
            discountType: currentDiscountType,
            validityDays: currentValidity,
            currency: currentCurrency,
            subtotal,
            grandTotal,
          };

          if (activePayload.customer) {
            return sendResponse({
              replyText: `✏️ ${modSummary}\n\nHere is your updated Quote Draft:`,
              actionType: 'quote_draft_preview',
              customer: activePayload.customer,
              pendingQuotePayload: updatedPayload,
            });
          }

          return sendResponse({
            replyText: `✏️ ${modSummary}\n\nGot it. Who is this quote for?`,
            actionType: 'guided_quote_ask_customer',
            pendingQuotePayload: {
              ...updatedPayload,
              step: 'awaiting_customer',
            },
          });
        }
      }
    }

    // =========================================================================
    // 7. INTENT: QUOTES WAITING APPROVAL / FOLLOW-UP
    // Test 6: "Show quotes waiting for approval" -> returns actual unapproved quotes
    // =========================================================================
    if (intent === 'quotes_waiting_approval' || intent === 'quote_followup') {
      const quotations = await store.getQuotations(orgId, { environment: env });
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 86400000;

      const unapprovedList = quotations.filter((q) => {
        const time = new Date(q.created_at || q.issue_date).getTime();
        return ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status) && now - time <= THIRTY_DAYS_MS;
      });

      if (unapprovedList.length === 0) {
        return sendResponse({
          replyText: '🎉 You have no quotes waiting for approval in the past 30 days! All quotes have been approved or converted.',
          actionType: 'general_help',
        });
      }

      const listPreview = unapprovedList.slice(0, 6).map((q) => {
        const ageDays = Math.floor((now - new Date(q.issue_date || q.created_at).getTime()) / 86400000);
        const views = q.views_count || 0;
        const viewStr = views > 0 ? ` · Viewed ${views} time${views > 1 ? 's' : ''}` : ' · Not viewed yet';
        return `• **Quote #${q.quotation_number}** — ${q.customer?.name || 'Customer'}: **${formatCurrency(
          q.grand_total,
          q.currency
        )}** (Sent ${ageDays}d ago${viewStr})`;
      });

      return sendResponse({
        replyText: `⏳ **Quotes Waiting for Customer Approval (Past 30 Days)**:\nYou have **${unapprovedList.length} quote(s) awaiting approval**:\n\n${listPreview.join(
          '\n'
        )}\n\nWould you like me to prepare follow-up reminders?`,
        actionType: 'quotation_report',
        reportData: {
          title: 'UNAPPROVED QUOTES (30 DAYS)',
          count: unapprovedList.length,
          currency: orgCurrency,
        },
      });
    }

    // =========================================================================
    // 8. INTENT: OVERDUE INVOICES
    // Test 7: "Show overdue invoices" -> returns actual overdue invoices
    // =========================================================================
    if (intent === 'overdue_invoices') {
      const invoices = await store.getInvoices(orgId, { environment: env });
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 86400000;

      const overdueInvoices = invoices.filter((i) => {
        const time = new Date(i.due_date || i.issue_date).getTime();
        const isOverdue = i.status === 'OVERDUE' || (['ISSUED', 'PARTIAL'].includes(i.status) && new Date(i.due_date).getTime() < now);
        return isOverdue && now - time <= THIRTY_DAYS_MS;
      });

      if (overdueInvoices.length === 0) {
        return sendResponse({
          replyText: '✅ All invoices are up to date! There are no overdue invoices in the past 30 days.',
          actionType: 'general_help',
        });
      }

      const lines = overdueInvoices.slice(0, 6).map((i) => {
        const dueTime = new Date(i.due_date).getTime();
        const daysOverdue = Math.max(1, Math.floor((now - dueTime) / 86400000));
        const balance = (i.grand_total || 0) - (i.paid_amount || 0);
        return `• **Invoice #${i.invoice_number}** — ${i.customer?.name || 'Customer'}: **${formatCurrency(
          balance,
          i.currency
        )}** (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)`;
      });

      const totalOverdue = overdueInvoices.reduce(
        (sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)),
        0
      );

      return sendResponse({
        replyText: `⚠️ **Overdue Invoices (Past 30 Days)**:\nYou have **${overdueInvoices.length} overdue invoice(s)** totaling **${formatCurrency(
          totalOverdue,
          orgCurrency
        )}**:\n\n${lines.join('\n')}\n\nActions:\n• WhatsApp Reminder\n• Email Reminder\n• View Invoice`,
        actionType: 'payment_report',
        reportData: {
          title: 'OVERDUE INVOICES',
          overdue: totalOverdue,
          count: overdueInvoices.length,
          currency: orgCurrency,
        },
      });
    }

    // =========================================================================
    // 9. INTENT: SALES THIS MONTH
    // Test 8: "Show sales this month" -> returns live business summary
    // =========================================================================
    if (intent === 'sales_report') {
      const quotations = await store.getQuotations(orgId, { environment: env });
      const invoices = await store.getInvoices(orgId, { environment: env });

      const now = new Date();
      const currentMonthIdx = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthQuotes = quotations.filter((q) => {
        const d = new Date(q.created_at || q.issue_date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
      });

      const quotedAmount = thisMonthQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);
      const approvedQuotes = thisMonthQuotes.filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED');
      const approvedAmount = approvedQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);

      const thisMonthInvoices = invoices.filter((i) => {
        const d = new Date(i.issue_date || i.created_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
      });

      const receivedAmount = thisMonthInvoices
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + (i.paid_amount || i.grand_total || 0), 0);

      const outstandingAmount = thisMonthInvoices
        .filter((i) => ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(i.status))
        .reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

      return sendResponse({
        replyText: `📈 **This Month's Sales Overview**:\n• **Quoted**: ${formatCurrency(
          quotedAmount,
          orgCurrency
        )} (${thisMonthQuotes.length} quotes)\n• **Approved**: ${formatCurrency(
          approvedAmount,
          orgCurrency
        )} (${approvedQuotes.length} deals)\n• **Received**: ${formatCurrency(
          receivedAmount,
          orgCurrency
        )}\n• **Outstanding**: ${formatCurrency(outstandingAmount, orgCurrency)}`,
        actionType: 'sales_report',
        reportData: {
          title: 'MONTHLY SALES OVERVIEW',
          quoted: quotedAmount,
          approved: approvedAmount,
          received: receivedAmount,
          outstanding: outstandingAmount,
          currency: orgCurrency,
        },
      });
    }

    // =========================================================================
    // 10. INTENT: PAYMENT REPORT
    // Test 13: "How much payment is pending?" -> queries real data
    // =========================================================================
    if (intent === 'payment_report') {
      const invoices = await store.getInvoices(orgId, { environment: env });
      const quotations = await store.getQuotations(orgId, { environment: env });
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 86400000;

      const recentInvoices = invoices.filter((i) => {
        const time = new Date(i.due_date || i.issue_date || i.created_at).getTime();
        return now - time <= THIRTY_DAYS_MS;
      });

      const totalReceived = recentInvoices
        .filter((i) => i.status === 'PAID')
        .reduce((sum, i) => sum + (i.paid_amount || i.grand_total || 0), 0);

      const outstandingInvoices = recentInvoices.filter((i) => ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(i.status));
      const pendingInvoiceAmount = outstandingInvoices.reduce(
        (sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)),
        0
      );

      const overdueInvoices = recentInvoices.filter(
        (i) => i.status === 'OVERDUE' || (['ISSUED', 'PARTIAL'].includes(i.status) && new Date(i.due_date).getTime() < now)
      );
      const overdueAmount = overdueInvoices.reduce(
        (sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)),
        0
      );

      return sendResponse({
        replyText: `💳 **Live Payment Summary (Past 30 Days)**:\n• **Total Received**: ${formatCurrency(
          totalReceived,
          orgCurrency
        )}\n• **Pending Due**: ${formatCurrency(
          pendingInvoiceAmount,
          orgCurrency
        )}\n• **Overdue Invoices**: ${formatCurrency(overdueAmount, orgCurrency)} (${overdueInvoices.length} overdue)`,
        actionType: 'payment_report',
        reportData: {
          title: 'PAYMENT SUMMARY',
          received: totalReceived,
          pending: pendingInvoiceAmount,
          overdue: overdueAmount,
          currency: orgCurrency,
        },
      });
    }

    // =========================================================================
    // 11. INTENT: PRODUCT IMPORT
    // Test 9: "Help me import products for a quote" -> offers product import workflow
    // =========================================================================
    if (intent === 'import_products') {
      return sendResponse({
        replyText: 'Sure! Upload your product list (XLSX, CSV, PDF, or image) and I\'ll extract the item names, quantities, and prices to prepare your quote items.',
        actionType: 'import_products',
      });
    }

    // =========================================================================
    // 12. INTENT: GENERAL QUOTEFLOW QUESTION (Customer-Facing Product Flow)
    // Test 10: "How does my business quotation reach the customer?"
    // Explains business flow without Cloudflare/Supabase/RLS/architecture diagram!
    // =========================================================================
    if (intent === 'general_quoteflow_question') {
      return sendResponse({
        replyText:
          'Once your quotation is ready, you can send it through WhatsApp or email. Your customer receives a secure link where they can view the quotation, review the items and pricing, and approve it online. QuoteFlow tracks whether the quotation was sent, viewed and approved, so you can follow up when needed.',
        actionType: 'general_help',
      });
    }

    // =========================================================================
    // 13. INTENT: TECHNICAL / SECURITY QUESTION
    // Test 19: "What database does QuoteFlow use?" / "Are you using Supabase?"
    // Safe response without exposing backend architecture or credentials.
    // =========================================================================
    if (intent === 'technical_security_question') {
      return sendResponse({
        replyText:
          'QuoteFlow uses secure cloud infrastructure to manage your business data. For detailed technical or integration information, please refer to official developer documentation or contact QuoteFlow support.',
        actionType: 'general_help',
      });
    }

    // =========================================================================
    // 13B. INTENT: BUSINESS OPERATOR DAILY ACTION PLAN ("What should I do today?")
    // =========================================================================
    if (intent === 'operator_daily_plan' || action === 'daily_plan') {
      const plan = await businessOperatorEngine.generateDailyActionPlan(orgId, auth.userId, auth.role);
      const totalVal = formatCurrency(plan.summary.totalValueAtStake, plan.summary.currency as CurrencyCode);

      let reply = `⚡ **${plan.greeting}! Here is your QuoteFlow AI Daily Action Plan:**\n\n`;
      reply += `Found **${plan.summary.totalActions} prioritized actions** representing **${totalVal}** in potential revenue and recovery.\n\n`;

      if (plan.actions.length === 0) {
        reply += `✨ **All clear today!** No urgent quote follow-ups, overdue invoices, or uninvoiced approved quotes need attention right now. Keep up the great work!`;
      } else {
        const topActions = plan.actions.slice(0, 5);
        for (let i = 0; i < topActions.length; i++) {
          const act = topActions[i];
          const badge = act.urgency === 'HIGH' ? '🔴 HIGH' : act.urgency === 'MEDIUM' ? '🟡 MEDIUM' : '🟢 LOW';
          const valStr = act.value > 0 ? ` · ${formatCurrency(act.value, act.currency as CurrencyCode)}` : '';
          reply += `**${i + 1}. [${badge}] ${act.title}**${valStr}\n`;
          reply += `   ${act.description}\n`;
          reply += `   👉 *Recommended:* ${act.actionLabel}\n\n`;
        }

        if (plan.actions.length > 5) {
          reply += `_...plus ${plan.actions.length - 5} more actions available in your Operator card below._\n`;
        }
      }

      return sendResponse({
        replyText: reply.trim(),
        actionType: 'operator_daily_plan',
        operatorPlan: plan,
      });
    }

    // =========================================================================
    // 13C. INTENT: PIPELINE HEALTH & DEAL TEMPERATURES (Phase 3)
    // =========================================================================
    if (intent === 'pipeline_health') {
      const pipeline = await businessOperatorEngine.analyzePipelineTemperatures(orgId);
      const hotVal = formatCurrency(pipeline.summary.hotDealsValue, pipeline.currency as CurrencyCode);
      const warmVal = formatCurrency(pipeline.summary.warmDealsValue, pipeline.currency as CurrencyCode);
      const coldVal = formatCurrency(pipeline.summary.coldDealsValue, pipeline.currency as CurrencyCode);
      const totalVal = formatCurrency(pipeline.summary.totalPipelineValue, pipeline.currency as CurrencyCode);

      let reply = `🔥 **Live Sales Pipeline Breakdown (${totalVal} Total Pipeline):**\n\n`;
      reply += `• **${pipeline.summary.hotDealsCount} HOT Deals (${hotVal})**: Active client views & imminent buying decisions.\n`;
      reply += `• **${pipeline.summary.warmDealsCount} WARM Deals (${warmVal})**: Active consideration window.\n`;
      reply += `• **${pipeline.summary.coldDealsCount} COLD Deals (${coldVal})**: No client views or sent >7 days ago.\n\n`;

      if (pipeline.deals.length > 0) {
        reply += `**Top Actionable Deals:**\n`;
        for (const deal of pipeline.deals.slice(0, 4)) {
          const val = formatCurrency(deal.value, deal.currency as CurrencyCode);
          const icon = deal.temperature === 'HOT' ? '🔥' : deal.temperature === 'WARM' ? '⚡' : '❄️';
          reply += `${icon} **${deal.customerName}** (${deal.quotationNumber}): **${val}** — ${deal.reason} *Recommended: ${deal.recommendedAction}*\n`;
        }
      }

      return sendResponse({
        replyText: reply.trim(),
        actionType: 'pipeline_analysis',
        pipelineAnalysis: pipeline,
      });
    }

    // =========================================================================
    // 13D. INTENT: INTERNAL LEAD RECOVERY (Phase 3)
    // =========================================================================
    if (intent === 'lead_recovery') {
      const candidates = await businessOperatorEngine.recoverLostLeads(orgId);
      const totalRecoverable = candidates.reduce((sum, c) => sum + c.value, 0);
      const formattedTotal = formatCurrency(totalRecoverable, (org?.default_currency as CurrencyCode) || 'INR');

      let reply = `🎯 **QuoteFlow AI Lead Recovery Engine:**\n\n`;
      if (candidates.length === 0) {
        reply += `✨ **No dropped leads found!** All active quotes have client engagement and no recent high-value expired quotes are waiting for revival.`;
      } else {
        reply += `Identified **${candidates.length} recoverable opportunities** representing **${formattedTotal}** in pipeline:\n\n`;
        for (const item of candidates.slice(0, 5)) {
          const val = formatCurrency(item.value, item.currency as CurrencyCode);
          const badge =
            item.recoveryType === 'UNOPENED'
              ? '📫 Unopened'
              : item.recoveryType === 'VIEWED_UNAPPROVED'
              ? '👀 Viewed'
              : item.recoveryType === 'EXPIRED_REVIVAL'
              ? '⏰ Expired'
              : '🔄 Dormant';
          reply += `• **${item.customerName}** (${item.quoteNumber} • ${val}) [${badge}]: ${item.reason}\n  👉 *Action: ${item.recommendedAction}*\n`;
        }
      }

      return sendResponse({
        replyText: reply.trim(),
        actionType: 'lead_recovery',
        recoveryItems: candidates,
      });
    }

    // =========================================================================
    // 13E. INTENT: WIN/LOSS & CONVERSION DISPARITY INSIGHTS (Phase 3)
    // =========================================================================
    if (intent === 'win_loss_insights') {
      const analysis = await businessOperatorEngine.analyzeWinLossDisparity(orgId);
      let reply = `📊 **Win/Loss & Quote Conversion Insights:**\n\n`;
      reply += `• **Approval Rate**: **${analysis.metrics.approvalRate}%** (${analysis.metrics.approvedQuotesCount} approved of ${analysis.metrics.totalQuotesAnalyzed} quotes).\n`;
      reply += `• **Average Time to Close**: **${analysis.metrics.averageTimeToApprovalDays} days** (Rejections average ${analysis.metrics.averageTimeToRejectionDays} days).\n\n`;
      reply += `💡 **Discount Impact**: ${analysis.discountImpact.insight}\n\n`;

      if (analysis.lostOpportunities.recommendations.length > 0) {
        reply += `**Recommended Growth Levers:**\n`;
        for (const rec of analysis.lostOpportunities.recommendations) {
          reply += `• ${rec}\n`;
        }
      }

      return sendResponse({
        replyText: reply.trim(),
        actionType: 'win_loss_insights',
        winLossAnalysis: analysis,
      });
    }

    // =========================================================================
    // 14. INTENT: PROACTIVE BRIEFING & 4 QUESTIONS
    // =========================================================================
    if (intent === 'proactive_briefing') {
      const firstName = (auth.fullName || '').trim().split(' ')[0] || 'there';
      const briefing = await generateAiBusinessBriefing(orgId, env, firstName, clientHour);
      return sendResponse({
        replyText: `📋 **Today's AI Business Briefing**\n\n**1. What happened?**\n${briefing.fourQuestions.whatHappened}\n\n**2. What needs your attention?**\n${briefing.fourQuestions.needsAttention.map((n) => `• ${n}`).join('\n')}\n\n**3. What should you do next?**\n${briefing.fourQuestions.shouldDoNext.map((s) => `• ${s}`).join('\n')}\n\n**4. Can I do it for you?**\nI have prepared proactive follow-ups and notifications ready for your review and approval!`,
        actionType: 'proactive_briefing',
        briefing,
      });
    }

    // =========================================================================
    // 15. INTENT: ACTION HISTORY ("Did I follow up with...")
    // =========================================================================
    if (intent === 'action_history') {
      const actions = await store.getRecentAiActions(orgId, 20);
      if (actions.length === 0) {
        return sendResponse({
          replyText: 'There are no recorded follow-up actions yet in your database. Once you dispatch WhatsApp or email reminders, they will appear here.',
          actionType: 'general_help',
        });
      }

      const targetQuery = lower
        .replace(/did i follow up with|did i follow up|have i followed up with|have i followed up|follow up history for/gi, '')
        .trim();

      if (targetQuery.length > 2) {
        const matching = actions.filter(
          (a) =>
            (a.customer_name && a.customer_name.toLowerCase().includes(targetQuery)) ||
            (a.quote_number && a.quote_number.toLowerCase().includes(targetQuery)) ||
            (a.invoice_number && a.invoice_number.toLowerCase().includes(targetQuery))
        );

        if (matching.length > 0) {
          const act = matching[0];
          const channel = act.action_taken === 'whatsapp_sent' ? 'WhatsApp' : act.action_taken === 'email_sent' ? 'Email' : 'follow-up';
          const dateStr = new Date(act.action_taken_at || act.updated_at).toLocaleDateString([], {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          const staff = act.user_name ? ` by ${act.user_name}` : '';
          const target = act.quote_number ? `Quote #${act.quote_number}` : act.customer_name || 'the customer';

          return sendResponse({
            replyText: `Yes. A ${channel} follow-up for **${target}** was sent${staff} on **${dateStr}**.\n\nStatus: \`${act.status}\``,
            actionType: 'general_help',
          });
        }
      }

      const summaryList = actions.slice(0, 6).map((a) => {
        const channel = a.action_taken === 'whatsapp_sent' ? 'WhatsApp reminder' : a.action_taken === 'email_sent' ? 'Email reminder' : a.action_taken || 'Action';
        const dateStr = new Date(a.action_taken_at || a.updated_at).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
        });
        const staff = a.user_name ? ` (${a.user_name})` : '';
        return `• **${channel}** — ${a.customer_name || a.quote_number || 'Client'}${staff} on ${dateStr}`;
      });

      return sendResponse({
        replyText: `📋 **Recent AI Recommendation Actions**\n\n${summaryList.join('\n')}`,
        actionType: 'general_help',
      });
    }

    // =========================================================================
    // 16. INTENT: IN-PROCESS QUOTATIONS (6th Day Warning)
    // =========================================================================
    if (intent === 'quote_lookup' && (lower.includes('in process') || lower.includes('in progress'))) {
      const quotations = await store.getQuotations(orgId, { environment: env });
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 86400000;

      const inProcessQuotes = quotations.filter((q) => {
        const t = new Date(q.in_progress_at || q.updated_at || q.created_at).getTime();
        return q.status === 'IN_PROGRESS' && now - t <= THIRTY_DAYS_MS;
      });

      if (inProcessQuotes.length === 0) {
        return sendResponse({
          replyText: `⚙️ **In-Progress Quotations (Past 30 Days)**:\nNo quotations are currently marked in-progress in the last 30 days.`,
          actionType: 'general_help',
        });
      }

      const lines = inProcessQuotes.map((q) => {
        const custName = q.customer?.name || 'Customer';
        const startTime = new Date(q.in_progress_at || q.updated_at || q.created_at).getTime();
        const daysElapsed = Math.floor((now - startTime) / 86400000);
        const totalDays = q.estimated_days || (q.estimated_completion_date ? Math.max(1, Math.round((new Date(q.estimated_completion_date).getTime() - startTime) / 86400000)) : null);
        const isWarning = totalDays && (totalDays - daysElapsed <= 1);
        const warningBadge = isWarning ? ' ⚠️ *(Target completion tomorrow!)*' : '';
        const targetStr = totalDays ? `Day ${daysElapsed + 1} of ${totalDays}` : `${daysElapsed}d elapsed`;

        return `• **Quote #${q.quotation_number}** — ${custName}: **${formatCurrency(q.grand_total, q.currency)}** (${targetStr})${warningBadge}`;
      });

      return sendResponse({
        replyText: `⚙️ **In-Progress Quotations (Past 30 Days)**:\nYou have **${inProcessQuotes.length} quotation(s) in progress**:\n\n${lines.join('\n')}`,
        actionType: 'quotation_report',
        reportData: {
          title: 'IN-PROGRESS QUOTATIONS (30 DAYS)',
          count: inProcessQuotes.length,
          currency: orgCurrency,
        },
      });
    }

    // =========================================================================
    // 17. INTENT: SEND QUOTE (Email or WhatsApp)
    // =========================================================================
    if (intent === 'send_email' || intent === 'send_whatsapp') {
      let targetQuote: Quotation | null = null;
      if (activeDraftId) {
        targetQuote = await store.getQuotationById(activeDraftId, orgId);
      } else {
        const quotes = await store.getQuotations(orgId, { environment: env });
        targetQuote = quotes.find((q) => q.status === 'DRAFT') || quotes[0] || null;
      }

      if (!targetQuote) {
        return sendResponse({
          replyText: "There is no active quotation draft ready to send. Tell me what you'd like to quote (e.g. *'Draft quote for Glass $500 and Battery $600'*) and I'll create it instantly!",
          actionType: 'none',
        });
      }

      const cust = targetQuote.customer || (await store.getCustomer(targetQuote.customer_id, orgId));
      if (!cust) {
        return sendResponse({
          replyText: `Quotation **${targetQuote.quotation_number}** does not have an attached customer.`,
          actionType: 'error',
        });
      }

      if (intent === 'send_whatsapp') {
        const phone = cust.phone ? cust.phone.replace(/[^\d+]/g, '') : '';
        const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com'}/q/${targetQuote.public_token}`;
        const msg = encodeURIComponent(`Hello ${cust.name}, here is your quotation #${targetQuote.quotation_number} for ${formatCurrency(targetQuote.grand_total, targetQuote.currency)}. You can view and approve it online here: ${viewUrl}`);
        const waLink = phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;

        return sendResponse({
          replyText: `📱 WhatsApp link ready for **${cust.name}**!\nClick below to open and dispatch quotation **#${targetQuote.quotation_number}**:`,
          actionType: 'quote_sent',
          quotation: targetQuote,
          sentDetails: {
            quoteNumber: targetQuote.quotation_number,
            customerName: cust.name,
            amount: targetQuote.grand_total,
            currency: targetQuote.currency,
            status: 'Ready',
            viewUrl: waLink,
          },
        });
      }

      // Default: Email send
      const updatedQuote = await store.updateQuotation(targetQuote.id, { status: 'SENT' }, orgId);
      if (cust.email) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';
          const emailPayload = generateQuotationSentEmail({
            customerName: cust.name,
            companyName: org?.name || 'QuoteFlow',
            replyTo: org?.email,
            quotationNumber: updatedQuote.quotation_number,
            amount: updatedQuote.grand_total,
            currency: updatedQuote.currency,
            validUntil: updatedQuote.valid_until,
            publicUrl: `${appUrl}/q/${updatedQuote.public_token}`,
          });
          emailPayload.to = cust.email;

          if (env === 'test') {
            await store.logTestEmail({
              organization_id: orgId,
              document_type: 'QUOTE',
              document_number: updatedQuote.quotation_number,
              document_id: updatedQuote.id,
              to_email: cust.email,
              to_name: cust.name,
              subject: emailPayload.subject,
              html_preview: emailPayload.html || '',
              text_preview: emailPayload.text || '',
              simulated_at: new Date().toISOString(),
            });
          } else {
            await sendEmail(emailPayload);
          }
        } catch (mailErr) {
          console.warn('AI copilot email send note:', mailErr);
        }
      }

      return sendResponse({
        replyText: `🚀 Quotation **${updatedQuote.quotation_number}** has been sent to **${cust.name}**!\nTotal: **${formatCurrency(
          updatedQuote.grand_total,
          updatedQuote.currency
        )}**. The client can view and approve it online anytime.`,
        actionType: 'quote_sent',
        quotation: updatedQuote,
        sentDetails: {
          quoteNumber: updatedQuote.quotation_number,
          customerName: cust.name,
          amount: updatedQuote.grand_total,
          currency: updatedQuote.currency,
          status: 'Sent',
          viewUrl: `/quotations/${updatedQuote.id}`,
        },
      });
    }

    // =========================================================================
    // 18. INTENT: SPECIFIC BUSINESS QUESTIONS (Non-hallucinated data)
    // =========================================================================
    if (intent === 'general_business_question') {
      const quotations = await store.getQuotations(orgId, { environment: env });

      // "How many quotes did I create this week?"
      if (lower.includes('this week') || lower.includes('created this week')) {
        const now = Date.now();
        const SEVEN_DAYS_MS = 7 * 86400000;
        const weekQuotes = quotations.filter((q) => {
          const t = new Date(q.created_at || q.issue_date).getTime();
          return now - t <= SEVEN_DAYS_MS;
        });
        const totalVal = weekQuotes.reduce((sum, q) => sum + (q.grand_total || 0), 0);

        return sendResponse({
          replyText: `📊 You created **${weekQuotes.length} quotation(s)** this week totaling **${formatCurrency(
            totalVal,
            orgCurrency
          )}**.`,
          actionType: 'general_help',
        });
      }

      // "Show my biggest quote this month"
      if (lower.includes('biggest quote') || lower.includes('largest quote')) {
        const now = new Date();
        const currentMonthIdx = now.getMonth();
        const currentYear = now.getFullYear();

        const thisMonthQuotes = quotations.filter((q) => {
          const d = new Date(q.created_at || q.issue_date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
        });

        if (thisMonthQuotes.length === 0) {
          return sendResponse({
            replyText: 'No quotes have been created yet this month.',
            actionType: 'general_help',
          });
        }

        const sorted = [...thisMonthQuotes].sort((a, b) => (b.grand_total || 0) - (a.grand_total || 0));
        const biggest = sorted[0];

        return sendResponse({
          replyText: `🏆 Your biggest quote this month is **Quote #${biggest.quotation_number}** for **${
            biggest.customer?.name || 'Customer'
          }** at **${formatCurrency(biggest.grand_total, biggest.currency)}** (${biggest.status}).`,
          actionType: 'general_help',
        });
      }

      // "Which quote has the most customer views?"
      if (lower.includes('most customer views') || lower.includes('most views') || lower.includes('viewed quote')) {
        const sorted = [...quotations].sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
        const topViewed = sorted[0];

        if (!topViewed || (topViewed.views_count || 0) === 0) {
          return sendResponse({
            replyText: 'No customer views recorded yet across your active quotations.',
            actionType: 'general_help',
          });
        }

        return sendResponse({
          replyText: `👀 **Quote #${topViewed.quotation_number}** for **${
            topViewed.customer?.name || 'Customer'
          }** has the most customer views (**${topViewed.views_count} views**). Status: **${topViewed.status}**.`,
          actionType: 'general_help',
        });
      }

      // Default business question handler backed by organization calculations
      const growthAnswer = await growthEngine.answerNaturalBusinessQuestion(orgId, text, auth.role);
      return sendResponse({
        replyText: growthAnswer.answerMarkdown,
        actionType: 'business_growth_insight',
        growthAnswer,
        suggestedFollowUps: growthAnswer.suggestedFollowUps,
        actionLink: growthAnswer.actionLink,
      });
    }

    // =========================================================================
    // 19. INTENT: UNKNOWN / GENERAL FALLBACK
    // NEVER fall back to customer search!
    // =========================================================================
    const systemPrompt = `You are QuoteFlow Copilot, an intelligent, helpful business assistant built directly into QuoteFlow — a quotation, invoicing, follow-up, and payment SaaS platform.
Help the user manage quotes, taxes, payments, customers, and invoices.
Keep responses concise (2 to 5 sentences), practical, and business-focused. Never explain internal cloud infrastructure like Cloudflare, Supabase, or private endpoints.`;

    const geminiReply = await callGeminiIfAvailable(text, systemPrompt);
    if (geminiReply) {
      return NextResponse.json({
        replyText: geminiReply,
        actionType: 'general_help',
        richPayload: {
          leadingText: geminiReply,
          isVisualResponse: false,
          blocks: [],
          suggestedQuestions: [
            'How does my business quotation reach the customer?',
            'Draft a quote',
            'Show quotes waiting for approval',
            'Show overdue invoices',
          ],
        },
      });
    }

    // Built-in intelligent conversational fallbacks
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      const reply = `👋 Hello! I am your **QuoteFlow AI Copilot**.\n\nI can help you:\n• **Draft quotes**: *"Battery $400 and Gas $100 for Subesh"*\n• **Edit drafts**: *"Change Battery to $350"* or *"Add 10% discount"*\n• **Follow up**: *"Show quotes waiting for approval"*\n• **Check revenue**: *"Show sales this month"* or *"Show overdue invoices"*\n\nHow can I help you today?`;
      return sendResponse({
        replyText: reply,
        actionType: 'general_help',
      });
    }

    return sendResponse({
      replyText: `🤖 I'm here to help manage your quotes, customers, follow-ups, and payments!\n\nHere are a few quick things you can ask me:\n• *"Create quote Glass $500 and Battery $600 for ABC"*\n• *"Show quotes waiting for approval"*\n• *"Show overdue invoices"*\n• *"Show sales this month"*\n• *"How does my business quotation reach the customer?"*`,
      actionType: 'general_help',
    });
  } catch (err: any) {
    console.error('Error in POST /api/ai/copilot:', err);
    return NextResponse.json(
      { error: err.message || 'AI Copilot encountered an unexpected error.' },
      { status: 500 }
    );
  }
}
