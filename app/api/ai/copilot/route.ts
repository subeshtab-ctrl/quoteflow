import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserContext } from '@/lib/supabase/auth-context';
import { store } from '@/lib/supabase/data-store';
import { calculateQuotationTotals } from '@/lib/quotations/calculations';
import { generateQuotationSentEmail, sendEmail } from '@/lib/email/service';
import { CurrencyCode, Quotation } from '@/types/database';

interface ParseResult {
  customerName?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
  }>;
  taxRate?: number;
  discountValue?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
}

function parseNaturalQuoteRequest(text: string, defaultTaxRate = 18): ParseResult {
  const result: ParseResult = {
    items: [],
    taxRate: defaultTaxRate,
  };

  // 1. Extract customer name if present: "for ABC Customer" or "to XYZ Client"
  const customerMatch = text.match(/(?:for|to|customer|client)\s+([A-Za-z0-9\s&]+?)(?:\s+with|\s+having|\s+items|\s*$|\.\s*)/i);
  if (customerMatch && customerMatch[1]) {
    const rawCust = customerMatch[1].trim();
    // Clean trailing keywords
    result.customerName = rawCust.replace(/(?:with|having|including|and|item).*$/i, '').trim();
  }

  // 2. Extract tax if mentioned: e.g. "18% GST" or "tax 18%" or "5% tax"
  const taxMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:tax|gst|vat)/i) || text.match(/(?:tax|gst|vat)\s*(?:of|at)?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (taxMatch) {
    result.taxRate = parseFloat(taxMatch[1]);
  }

  // 3. Extract discount if mentioned: e.g. "10% discount" or "discount 10%"
  const discountMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*discount/i) || text.match(/discount\s*(?:of|at)?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (discountMatch) {
    result.discountValue = parseFloat(discountMatch[1]);
    result.discountType = 'PERCENTAGE';
  }

  // 4. Extract items:
  // Examples:
  // - "Glass 500 and Battery 600"
  // - "2 batteries at 300, 1 screen at 1500"
  // - "Web Design 2000, Hosting 500"
  // - "Glass 500, Battery 600, Wire 200"

  // Remove the customer clause first so it doesn't get parsed as item
  let itemText = text;
  if (customerMatch && customerMatch[0]) {
    itemText = itemText.replace(customerMatch[0], ' ');
  }

  // Split by "and", ",", ";" or newline
  const segments = itemText
    .split(/\b(?:and|\band\b|,|;|\n|\+)\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    // Pattern A: "2 batteries at 300" or "3 x Battery for 500"
    const patternA = seg.match(/(?:(?:add|create|quote)?\s*)?(\d+)\s*(?:x|\*|nos|units|pieces)?\s+([A-Za-z\s]+?)\s+(?:at|for|@|costing|price)\s*(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d+)?)/i);
    if (patternA) {
      const qty = parseInt(patternA[1], 10) || 1;
      const desc = patternA[2].trim();
      const price = parseFloat(patternA[3]);
      if (desc && !isNaN(price)) {
        result.items.push({ description: desc, quantity: qty, unit_price: price });
        continue;
      }
    }

    // Pattern B: "Glass 500" or "Battery 600" or "Consulting ₹1500"
    const patternB = seg.match(/(?:(?:add|create|quote)?\s*)?([A-Za-z\s]+?)\s+(?:at|for|@|:)?\s*(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d+)?)/i);
    if (patternB) {
      const desc = patternB[1].trim();
      const price = parseFloat(patternB[2]);
      // Exclude keywords like "tax 18", "discount 10"
      if (desc && !/^(tax|gst|vat|discount|total|subtotal)$/i.test(desc) && !isNaN(price) && price > 0) {
        result.items.push({ description: desc, quantity: 1, unit_price: price });
        continue;
      }
    }
  }

  // Fallback: If no items parsed from segments, try global regex match for "[Word] [Number]"
  if (result.items.length === 0) {
    const globalMatches = [...text.matchAll(/([A-Za-z]{3,20})\s+(?:for|at)?\s*(?:₹|rs\.?|\$)?\s*(\d+)/gi)];
    for (const gm of globalMatches) {
      const word = gm[1].trim();
      const price = parseFloat(gm[2]);
      if (!/^(tax|gst|vat|discount|for|quote|draft)$/i.test(word) && price > 0) {
        result.items.push({ description: word, quantity: 1, unit_price: price });
      }
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserContext();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = auth.orgId;
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';
    const currency = (org?.default_currency || 'INR') as CurrencyCode;

    const body = await req.json();
    const { message, activeDraftId } = body;
    const text = (message || '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    const lower = text.toLowerCase();

    // =========================================================================
    // 1. INTENT: SEND QUOTATION ("Send it", "Confirm & Send", "Send quote")
    // =========================================================================
    if (
      lower === 'send it' ||
      lower === 'send' ||
      lower.startsWith('send ') ||
      lower.includes('confirm & send') ||
      lower.includes('confirm and send') ||
      lower === 'send quote'
    ) {
      let targetQuote: Quotation | null = null;
      if (activeDraftId) {
        targetQuote = await store.getQuotationById(activeDraftId, orgId);
      } else {
        // Find latest draft for this org
        const quotes = await store.getQuotations(orgId, { environment: env });
        targetQuote = quotes.find((q) => q.status === 'DRAFT') || quotes[0] || null;
      }

      if (!targetQuote) {
        return NextResponse.json({
          replyText: 'There is no active quotation draft ready to send. Would you like me to create a quote draft first?',
          actionType: 'none',
        });
      }

      // Verify customer exists and has contact info
      const customer = targetQuote.customer || (await store.getCustomer(targetQuote.customer_id, orgId));
      if (!customer) {
        return NextResponse.json({
          replyText: `Quotation ${targetQuote.quotation_number} cannot be sent because no customer is attached. Please specify a customer first.`,
          actionType: 'error',
        });
      }

      const hasEmail = Boolean(customer.email && !customer.email.endsWith('@mobile.client') && !customer.email.endsWith('@customer.local'));
      const hasPhone = Boolean(customer.phone && customer.phone.length >= 6);

      if (!hasEmail && !hasPhone) {
        return NextResponse.json({
          replyText: `Cannot send quotation ${targetQuote.quotation_number}: Customer "${customer.name}" does not have an email or mobile number configured. Please edit the quote to add contact details.`,
          actionType: 'missing_contact',
          quotation: targetQuote,
        });
      }

      // Update quote status to SENT
      const updatedQuote = await store.updateQuotation(
        targetQuote.id,
        {
          status: 'SENT',
        },
        orgId
      );

      // Trigger email if customer has email
      if (hasEmail && customer.email) {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.blendandbold.com';
          const emailPayload = generateQuotationSentEmail({
            customerName: customer.name,
            companyName: org?.name || 'QuoteFlow',
            replyTo: org?.email,
            quotationNumber: updatedQuote.quotation_number,
            amount: updatedQuote.grand_total,
            currency: updatedQuote.currency,
            validUntil: updatedQuote.valid_until,
            publicUrl: `${appUrl}/q/${updatedQuote.public_token}`,
          });
          emailPayload.to = customer.email;

          if (env === 'test') {
            await store.logTestEmail({
              organization_id: orgId,
              document_type: 'QUOTE',
              document_number: updatedQuote.quotation_number,
              document_id: updatedQuote.id,
              to_email: customer.email,
              to_name: customer.name,
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

      return NextResponse.json({
        replyText: `Quotation ${updatedQuote.quotation_number} has been sent successfully to ${customer.name}!`,
        actionType: 'quote_sent',
        quotation: updatedQuote,
        sentDetails: {
          quoteNumber: updatedQuote.quotation_number,
          customerName: customer.name,
          amount: updatedQuote.grand_total,
          currency: updatedQuote.currency,
          status: 'Sent',
          publicToken: updatedQuote.public_token,
          viewUrl: `/quotations/${updatedQuote.id}`,
        },
      });
    }

    // =========================================================================
    // 2. INTENT: MODIFY EXISTING ACTIVE QUOTATION DRAFT
    // e.g. "Change Glass to 600", "Add 2 batteries", "Tax 18%", "Remove glass"
    // =========================================================================
    if (activeDraftId && (
      lower.startsWith('change ') ||
      lower.startsWith('update ') ||
      lower.startsWith('set ') ||
      lower.startsWith('make ') ||
      lower.startsWith('add ') ||
      lower.startsWith('remove ') ||
      lower.startsWith('delete ') ||
      lower.includes('tax to ') ||
      lower.includes('discount to ')
    )) {
      const activeQuote = await store.getQuotationById(activeDraftId, orgId);
      if (activeQuote) {
        let currentItems = [...(activeQuote.items || [])];
        let currentTaxRate = activeQuote.tax_rate;
        let currentDiscountVal = activeQuote.discount_value;
        let currentDiscountType = activeQuote.discount_type;

        let modified = false;
        let modSummary = '';

        // Case A: "Change [Item] to [Price]" e.g. "Change Glass to 600"
        const changePriceMatch = text.match(/(?:change|update|set|make)\s+([A-Za-z\s]+?)\s+(?:to|as|=|at)\s*(?:₹|rs\.?|\$)?\s*(\d+(?:\.\d+)?)/i);
        if (changePriceMatch) {
          const targetName = changePriceMatch[1].trim().toLowerCase();
          const newPrice = parseFloat(changePriceMatch[2]);
          const itemIdx = currentItems.findIndex((it) => it.description.toLowerCase().includes(targetName));

          if (itemIdx >= 0 && !isNaN(newPrice)) {
            currentItems[itemIdx] = {
              ...currentItems[itemIdx],
              unit_price: newPrice,
              line_total: currentItems[itemIdx].quantity * newPrice,
            };
            modified = true;
            modSummary = `Updated ${currentItems[itemIdx].description} price to ₹${newPrice}.`;
          }
        }

        // Case B: "Add [Qty] [Item] at [Price]" or "Add [Item] [Price]"
        if (!modified && lower.startsWith('add ')) {
          const parsed = parseNaturalQuoteRequest(text, currentTaxRate);
          if (parsed.items.length > 0) {
            for (const newItem of parsed.items) {
              const existingIdx = currentItems.findIndex((it) => it.description.toLowerCase().includes(newItem.description.toLowerCase()));
              if (existingIdx >= 0) {
                currentItems[existingIdx].quantity += newItem.quantity;
                if (newItem.unit_price > 0) {
                  currentItems[existingIdx].unit_price = newItem.unit_price;
                }
                currentItems[existingIdx].line_total = currentItems[existingIdx].quantity * currentItems[existingIdx].unit_price;
              } else {
                currentItems.push({
                  id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  quotation_id: activeQuote.id,
                  description: newItem.description,
                  quantity: newItem.quantity,
                  unit: 'unit',
                  unit_price: newItem.unit_price || 0,
                  discount_type: 'PERCENTAGE',
                  discount_value: 0,
                  discount_amount: 0,
                  tax_rate: currentTaxRate,
                  tax_amount: 0,
                  line_total: newItem.quantity * (newItem.unit_price || 0),
                  sort_order: currentItems.length,
                });
              }
            }
            modified = true;
            modSummary = `Added line items to quotation draft.`;
          }
        }

        // Case C: Tax adjustment: "Add 18% GST" or "Change tax to 12%"
        const taxMatch = text.match(/(?:tax|gst|vat)\s*(?:to|at|is)?\s*(\d+(?:\.\d+)?)\s*%/i) || text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:tax|gst|vat)/i);
        if (taxMatch) {
          currentTaxRate = parseFloat(taxMatch[1]);
          modified = true;
          modSummary = (modSummary ? modSummary + ' ' : '') + `Updated tax rate to ${currentTaxRate}%.`;
        }

        // Case D: Remove item: "Remove Glass" or "Delete Battery"
        const removeMatch = text.match(/(?:remove|delete)\s+([A-Za-z\s]+)/i);
        if (removeMatch && !changePriceMatch) {
          const toRemove = removeMatch[1].trim().toLowerCase();
          const prevLen = currentItems.length;
          currentItems = currentItems.filter((it) => !it.description.toLowerCase().includes(toRemove));
          if (currentItems.length < prevLen) {
            modified = true;
            modSummary = `Removed item from quotation draft.`;
          }
        }

        if (modified) {
          const updatedQuote = await store.updateQuotation(
            activeQuote.id,
            {
              items: currentItems,
              tax_rate: currentTaxRate,
              discount_value: currentDiscountVal,
              discount_type: currentDiscountType,
            },
            orgId
          );

          return NextResponse.json({
            replyText: `${modSummary || 'Updated quotation draft.'} Here are the recalculated totals:`,
            actionType: 'quote_draft',
            quotation: updatedQuote,
          });
        }
      }
    }

    // =========================================================================
    // 3. INTENT: BUSINESS QUESTIONS & REPORT QUERIES
    // e.g. "Show payment report", "How much payment is pending?", "Sales this month"
    // =========================================================================
    if (
      lower.includes('payment report') ||
      lower.includes('payments report') ||
      lower.includes('payment is pending') ||
      lower.includes('pending payment') ||
      lower.includes('received payment') ||
      lower.includes('today\'s payment') ||
      lower.includes('todays payment') ||
      lower.includes('overdue invoice') ||
      lower.includes('haven\'t paid') ||
      lower.includes('havent paid') ||
      lower.includes('who has not paid') ||
      lower.includes('quotation report') ||
      lower.includes('quotes report') ||
      lower.includes('pending quotation') ||
      lower.includes('rejected quotation') ||
      lower.includes('sales this month') ||
      lower.includes('this month\'s sales') ||
      lower.includes('how many quotes') ||
      lower.includes('business summary')
    ) {
      const [analytics, quotations, invoices] = await Promise.all([
        store.getDashboardAnalytics(orgId, { environment: env }),
        store.getQuotations(orgId, { environment: env }),
        store.getInvoices(orgId, { environment: env }),
      ]);

      // Calculate Payment figures strictly from real invoice & quotation records
      const paidInvoices = invoices.filter((i) => i.status === 'PAID');
      const receivedInvoices = paidInvoices.reduce((sum, i) => sum + (i.paid_amount || i.grand_total || 0), 0);

      // Paid quotations that might not have converted to invoices yet
      const paidQuotesOnly = quotations
        .filter((q) => (q.is_paid || q.status === 'PAYMENT_COMPLETED') && !invoices.some((inv) => inv.quotation_id === q.id))
        .reduce((sum, q) => sum + (q.paid_amount || q.grand_total || 0), 0);

      const totalReceived = receivedInvoices + paidQuotesOnly;

      const outstandingInvoices = invoices.filter((i) => ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(i.status));
      const pendingInvoiceAmount = outstandingInvoices.reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

      const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE' || (['ISSUED', 'PARTIAL'].includes(i.status) && new Date(i.due_date).getTime() < Date.now()));
      const overdueAmount = overdueInvoices.reduce((sum, i) => sum + ((i.grand_total || 0) - (i.paid_amount || 0)), 0);

      const totalInvoiced = invoices.reduce((sum, i) => sum + (i.grand_total || 0), 0);

      // Check if user specifically asked for quotations report
      if (
        lower.includes('quotation report') ||
        lower.includes('quotes report') ||
        lower.includes('pending quotation') ||
        lower.includes('rejected quotation') ||
        lower.includes('how many quotes')
      ) {
        const approvedCount = quotations.filter((q) => q.status === 'APPROVED').length;
        const pendingCount = quotations.filter((q) => ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status)).length;
        const rejectedCount = quotations.filter((q) => q.status === 'REJECTED').length;
        const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
        const conversionRate = quotations.length > 0 ? Math.round((approvedCount / quotations.length) * 100) : 0;

        const pendingList = quotations
          .filter((q) => ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status))
          .slice(0, 5)
          .map((q) => ({
            number: q.quotation_number,
            customer: q.customer?.name || 'Customer',
            amount: q.grand_total,
            validUntil: q.valid_until,
          }));

        return NextResponse.json({
          replyText: `Here is your live quotation report:`,
          actionType: 'quotation_report',
          reportData: {
            title: 'QUOTATION REPORT SUMMARY',
            totalQuotes: quotations.length,
            approvedCount,
            pendingCount,
            rejectedCount,
            draftCount,
            conversionRate: `${conversionRate}%`,
            currency,
            pendingList,
          },
        });
      }

      // Check if user asked for "This month's sales"
      if (lower.includes('sales this month') || lower.includes('this month\'s sales')) {
        const now = new Date();
        const currentMonthIdx = now.getMonth();
        const currentYear = now.getFullYear();

        const thisMonthQuotes = quotations.filter((q) => {
          const d = new Date(q.created_at || q.issue_date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx && q.status === 'APPROVED';
        });
        const thisMonthSales = thisMonthQuotes.reduce((sum, q) => sum + q.grand_total, 0);

        return NextResponse.json({
          replyText: `Here is your sales summary for this month:`,
          actionType: 'sales_report',
          reportData: {
            title: 'MONTHLY SALES OVERVIEW',
            thisMonthSales,
            approvedQuotesCount: thisMonthQuotes.length,
            currency,
          },
        });
      }

      // Default: Payment summary & outstanding invoices
      const unpaidCustomers = outstandingInvoices.map((inv) => ({
        customer: inv.customer?.name || 'Client',
        invoiceNumber: inv.invoice_number,
        amount: (inv.grand_total || 0) - (inv.paid_amount || 0),
        dueDate: inv.due_date,
        isOverdue: new Date(inv.due_date).getTime() < Date.now(),
      }));

      return NextResponse.json({
        replyText: `Here is your live payment summary:`,
        actionType: 'payment_report',
        reportData: {
          title: 'PAYMENT SUMMARY',
          received: totalReceived,
          pending: pendingInvoiceAmount,
          overdue: overdueAmount,
          totalInvoiced,
          currency,
          unpaidList: unpaidCustomers.slice(0, 5),
        },
      });
    }

    // =========================================================================
    // 4. INTENT: CREATE QUOTATION DRAFT DIRECTLY
    // e.g. "Create a quote for Glass 500 and Battery 600 for ABC Customer"
    // =========================================================================
    const parsedQuote = parseNaturalQuoteRequest(text, org?.default_tax_rate || 18);

    if (parsedQuote.items.length > 0) {
      // Find or create customer
      const existingCustomers = await store.getCustomers(orgId, { environment: env });
      let targetCustomer = existingCustomers[0];

      if (parsedQuote.customerName) {
        const found = existingCustomers.find(
          (c) => c.name.toLowerCase().includes(parsedQuote.customerName!.toLowerCase()) ||
                 (c.company_name && c.company_name.toLowerCase().includes(parsedQuote.customerName!.toLowerCase()))
        );
        if (found) {
          targetCustomer = found;
        } else {
          // Auto-create customer
          targetCustomer = await store.createCustomer({
            organization_id: orgId,
            name: parsedQuote.customerName,
            company_name: parsedQuote.customerName,
            email: `${parsedQuote.customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.local`,
            phone: '9800000000',
            environment: env,
          });
        }
      }

      if (!targetCustomer) {
        targetCustomer = await store.createCustomer({
          organization_id: orgId,
          name: 'General Customer',
          email: 'customer@client.local',
          environment: env,
        });
      }

      const calculation = calculateQuotationTotals({
        items: parsedQuote.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          unit: 'unit',
          tax_rate: parsedQuote.taxRate || org?.default_tax_rate || 18,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
        })),
        discount_type: parsedQuote.discountType || 'PERCENTAGE',
        discount_value: parsedQuote.discountValue || 0,
        tax_rate: parsedQuote.taxRate || org?.default_tax_rate || 18,
      });

      const issueDate = new Date().toISOString().slice(0, 10);
      const validUntil = new Date(Date.now() + (org?.default_validity_days || 30) * 86400000).toISOString().slice(0, 10);

      const quotation = await store.createQuotation({
        organization_id: orgId,
        customer_id: targetCustomer.id,
        title: `Proposal for ${targetCustomer.name}`,
        status: 'DRAFT',
        issue_date: issueDate,
        valid_until: validUntil,
        items: parsedQuote.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit: 'unit',
          unit_price: it.unit_price,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          tax_rate: parsedQuote.taxRate || org?.default_tax_rate || 18,
        })),
        tax_rate: parsedQuote.taxRate || org?.default_tax_rate || 18,
        discount_value: parsedQuote.discountValue || 0,
        discount_type: parsedQuote.discountType || 'PERCENTAGE',
        currency,
        notes: org?.default_terms || 'Payment due within 30 days of completion.',
      });

      return NextResponse.json({
        replyText: `I've created quotation draft ${quotation.quotation_number} for ${targetCustomer.name}. You can review it below and confirm when ready:`,
        actionType: 'quote_draft',
        quotation,
      });
    }

    // =========================================================================
    // 5. DEFAULT / GENERAL HELP
    // =========================================================================
    return NextResponse.json({
      replyText: `I can create quotation drafts, modify line items and taxes, send quotes directly, or analyze your live revenue reports. Try asking:\n• "Create a quote for Glass 500 and Battery 600 for ABC Customer"\n• "Show payment report"\n• "How much payment is pending?"\n• "Show this month's sales"`,
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
