import {
  ActionCategory,
  ControlledAiActionDescriptor,
  AiActionExecutionResult,
} from '@/types/business-operator';
import { StaffRole, StaffPermissions, isOwnerOrAdminRole } from '@/types/staff';
import { store } from '@/lib/supabase/data-store';
import { staffService } from '@/lib/staff/staff-service';
import { businessMemoryService } from './memory-service';
import { operatorAuditService } from './audit-service';
import { calculateQuotationTotals, formatCurrency } from '@/lib/quotations/calculations';
import { Quotation, Invoice, Customer, CurrencyCode } from '@/types/database';

export interface ActionExecutionContext {
  organizationId: string;
  userId: string;
  userEmail: string;
  userRole: StaffRole;
  userPermissions?: StaffPermissions;
  branchAccess?: string | null;
  subscriptionActive: boolean;
  conversationId?: string | null;
}

export class ControlledActionRegistry {
  private actions = new Map<string, ControlledAiActionDescriptor>();

  constructor() {
    this.registerDescriptors();
  }

  private registerDescriptors() {
    const list: ControlledAiActionDescriptor[] = [
      // --- READ ACTIONS ---
      {
        name: 'get_business_profile',
        category: 'READ',
        description: 'Retrieve business profile, currency, and operational defaults',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_business_rules',
        category: 'READ',
        description: 'Retrieve active explicit business rules and customer-specific policies',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'search_customers',
        category: 'READ',
        description: 'Search customer database by name, phone, or company',
        requiredPermission: 'customers_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_customer_history',
        category: 'READ',
        description: 'View customer purchase history, quotes, invoices, and reorder frequency',
        requiredPermission: 'customers_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'search_products',
        category: 'READ',
        description: 'Search product and service catalog with standard rates',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'search_quotes',
        category: 'READ',
        description: 'Search quotes by title, customer, or number',
        requiredPermission: 'quotes_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_pending_quotes',
        category: 'READ',
        description: 'List quotes currently awaiting customer response',
        requiredPermission: 'quotes_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_expired_quotes',
        category: 'READ',
        description: 'List quotes that have expired without customer approval',
        requiredPermission: 'quotes_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_quote_views',
        category: 'READ',
        description: 'Retrieve customer portal view counts and engagement metrics on quotes',
        requiredPermission: 'quotes_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_approved_quotes',
        category: 'READ',
        description: 'List approved quotes, highlighting those not yet invoiced',
        requiredPermission: 'quotes_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'search_invoices',
        category: 'READ',
        description: 'Search tax and commercial invoices',
        requiredPermission: 'invoices_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_overdue_invoices',
        category: 'READ',
        description: 'List overdue invoices with outstanding balances',
        requiredPermission: 'invoices_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_payment_summary',
        category: 'READ',
        description: 'Summary of paid, pending, and overdue invoice balances',
        requiredPermission: 'payments_view',
        requiresHumanConfirmation: false,
        sensitive: true,
      },
      {
        name: 'get_sales_summary',
        category: 'READ',
        description: 'Company-wide sales and revenue performance metrics',
        requiredPermission: 'reports_view',
        requiresHumanConfirmation: false,
        sensitive: true,
      },
      {
        name: 'get_repeat_customer_candidates',
        category: 'READ',
        description: 'Identify previous clients approaching their historical reorder window',
        requiredPermission: 'customers_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'get_staff_performance',
        category: 'READ',
        description: 'Sales conversion and activity metrics across staff members',
        requiredPermission: 'staff_view',
        requiresHumanConfirmation: false,
        sensitive: true,
      },

      // --- DRAFT ACTIONS ---
      {
        name: 'create_quote_draft',
        category: 'DRAFT',
        description: 'Prepare an uncommitted quotation draft with calculated line items',
        requiredPermission: 'quotes_create',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'create_invoice_draft',
        category: 'DRAFT',
        description: 'Prepare an invoice draft from an approved quote or customer order',
        requiredPermission: 'invoices_create',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'create_followup_draft',
        category: 'DRAFT',
        description: 'Prepare personalized follow-up message for a pending quote',
        requiresHumanConfirmation: false,
        sensitive: false,
      },
      {
        name: 'create_payment_reminder_draft',
        category: 'DRAFT',
        description: 'Prepare polite payment reminder for an overdue invoice',
        requiredPermission: 'invoices_view',
        requiresHumanConfirmation: false,
        sensitive: false,
      },

      // --- EXECUTE ACTIONS (Human Approval Required) ---
      {
        name: 'send_quote',
        category: 'EXECUTE',
        description: 'Dispatch quotation to customer via Email or WhatsApp',
        requiredPermission: 'quotes_send',
        requiresHumanConfirmation: true,
        sensitive: true,
      },
      {
        name: 'send_invoice',
        category: 'EXECUTE',
        description: 'Dispatch invoice to customer via Email or WhatsApp',
        requiredPermission: 'invoices_send',
        requiresHumanConfirmation: true,
        sensitive: true,
      },
      {
        name: 'record_payment',
        category: 'EXECUTE',
        description: 'Record customer payment on an outstanding invoice',
        requiredPermission: 'payments_record',
        requiresHumanConfirmation: true,
        sensitive: true,
      },
      {
        name: 'delete_record',
        category: 'EXECUTE',
        description: 'Permanently remove a quotation, invoice, or customer',
        requiresHumanConfirmation: true,
        sensitive: true,
      },
    ];

    for (const d of list) {
      this.actions.set(d.name, d);
    }
  }

  /**
   * Execute a controlled AI action with strict permission checking and audit logging
   */
  public async executeAction(
    actionName: string,
    params: Record<string, any>,
    ctx: ActionExecutionContext,
    confirmedByUser: boolean = false
  ): Promise<AiActionExecutionResult> {
    const descriptor = this.actions.get(actionName);
    if (!descriptor) {
      return {
        success: false,
        actionName,
        category: 'READ',
        error: `Action "${actionName}" is not registered in the Controlled AI Action Registry.`,
      };
    }

    // 1. Subscription Check
    if (!ctx.subscriptionActive) {
      return {
        success: false,
        actionName,
        category: descriptor.category,
        error: 'Subscription expired. An active organization subscription is required.',
      };
    }

    // 2. Permission Check
    const isOwnerAdmin = isOwnerOrAdminRole(ctx.userRole);
    if (descriptor.requiredPermission && !isOwnerAdmin) {
      const hasPerm = staffService.hasPermission(
        ctx.userRole,
        ctx.userPermissions,
        descriptor.requiredPermission
      );
      if (!hasPerm) {
        await operatorAuditService.logAiAction({
          organization_id: ctx.organizationId,
          user_id: ctx.userId,
          user_email: ctx.userEmail,
          user_role: ctx.userRole,
          conversation_id: ctx.conversationId,
          action: actionName,
          category: descriptor.category,
          approval_required: descriptor.requiresHumanConfirmation,
          execution_status: 'BLOCKED_PERMISSIONS',
          details: `Blocked: Missing permission ${descriptor.requiredPermission}`,
        });

        return {
          success: false,
          actionName,
          category: descriptor.category,
          error: `Permission Denied: Your staff role (${ctx.userRole}) lacks "${descriptor.requiredPermission}" privilege.`,
        };
      }
    }

    // 3. Sensitive / EXECUTE Human Confirmation Guard
    if (descriptor.category === 'EXECUTE' && !confirmedByUser) {
      return {
        success: false,
        actionName,
        category: descriptor.category,
        requiresConfirmation: true,
        confirmationMessage: `Please confirm you want to proceed with: ${descriptor.description}.`,
        draftPayload: params,
      };
    }

    // 4. Action Execution Handlers
    try {
      const resultData = await this.dispatchActionHandler(actionName, params, ctx);

      await operatorAuditService.logAiAction({
        organization_id: ctx.organizationId,
        user_id: ctx.userId,
        user_email: ctx.userEmail,
        user_role: ctx.userRole,
        conversation_id: ctx.conversationId,
        action: actionName,
        category: descriptor.category,
        resource_type: params?.resourceType || descriptor.category,
        resource_id: params?.resourceId || params?.id,
        approval_required: descriptor.requiresHumanConfirmation,
        approved_by: confirmedByUser ? ctx.userId : null,
        execution_status: 'SUCCESS',
        metadata: { paramsKeys: Object.keys(params || {}) },
      });

      return {
        success: true,
        actionName,
        category: descriptor.category,
        data: resultData,
      };
    } catch (err: any) {
      await operatorAuditService.logAiAction({
        organization_id: ctx.organizationId,
        user_id: ctx.userId,
        user_email: ctx.userEmail,
        user_role: ctx.userRole,
        conversation_id: ctx.conversationId,
        action: actionName,
        category: descriptor.category,
        approval_required: descriptor.requiresHumanConfirmation,
        execution_status: 'FAILED',
        details: err?.message,
      });

      return {
        success: false,
        actionName,
        category: descriptor.category,
        error: err?.message || 'Action execution failed.',
      };
    }
  }

  /**
   * Internal dispatcher for registered actions
   */
  private async dispatchActionHandler(
    actionName: string,
    params: Record<string, any>,
    ctx: ActionExecutionContext
  ): Promise<any> {
    const orgId = ctx.organizationId;
    const org = await store.getOrganization(orgId);
    const env = (org?.mode === 'test' ? 'test' : 'live') as 'live' | 'test';

    switch (actionName) {
      // --- READ ---
      case 'get_business_profile':
        return businessMemoryService.getProfile(orgId);

      case 'get_business_rules':
        return businessMemoryService.getMemories(orgId, { status: 'ACTIVE' });

      case 'search_customers': {
        const query = (params?.query || '').toLowerCase().trim();
        const customers = await store.getCustomers(orgId, { environment: env });
        if (!query) return customers.slice(0, 15);
        return customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              (c.email && c.email.toLowerCase().includes(query)) ||
              (c.company_name && c.company_name.toLowerCase().includes(query)) ||
              (c.phone && c.phone.includes(query))
          )
          .slice(0, 15);
      }

      case 'get_customer_history': {
        const customerId = params?.customerId;
        if (!customerId) throw new Error('Missing customerId parameter');
        const [quotes, invoices] = await Promise.all([
          store.getQuotations(orgId, { customer_id: customerId, environment: env }),
          store.getInvoices(orgId, { customer_id: customerId, environment: env }),
        ]);
        return { customerId, quotesCount: quotes.length, invoicesCount: invoices.length, quotes, invoices };
      }

      case 'search_products': {
        const query = (params?.query || '').toLowerCase().trim();
        const products = await store.getProducts(orgId);
        if (!query) return products.slice(0, 20);
        return products
          .filter((p) => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query)))
          .slice(0, 20);
      }

      case 'search_quotes': {
        const query = (params?.query || '').toLowerCase().trim();
        const quotes = await store.getQuotations(orgId, { environment: env });
        if (!query) return quotes.slice(0, 20);
        return quotes
          .filter(
            (q) =>
              q.title?.toLowerCase().includes(query) ||
              q.quotation_number?.toLowerCase().includes(query) ||
              q.customer?.name?.toLowerCase().includes(query)
          )
          .slice(0, 20);
      }

      case 'get_pending_quotes': {
        const quotes = await store.getQuotations(orgId, { environment: env });
        return quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT');
      }

      case 'get_expired_quotes': {
        const now = Date.now();
        const quotes = await store.getQuotations(orgId, { environment: env });
        return quotes.filter(
          (q) => q.status === 'EXPIRED' || (q.valid_until && new Date(q.valid_until).getTime() < now && q.status === 'SENT')
        );
      }

      case 'get_quote_views': {
        const quotes = await store.getQuotations(orgId, { environment: env });
        return quotes.map((q) => ({
          id: q.id,
          number: q.quotation_number,
          customerName: q.customer?.name,
          viewsCount: q.views_count || 0,
          status: q.status,
          grandTotal: q.grand_total,
          currency: q.currency,
        }));
      }

      case 'get_approved_quotes': {
        const quotes = await store.getQuotations(orgId, { environment: env });
        const approved = quotes.filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED');
        const uninvoiced = approved.filter((q) => !q.has_issued_invoice && !q.invoice_number);
        return { approvedQuotes: approved, uninvoicedApprovedCount: uninvoiced.length, uninvoicedQuotes: uninvoiced };
      }

      case 'search_invoices': {
        return store.getInvoices(orgId, { environment: env });
      }

      case 'get_overdue_invoices': {
        const now = Date.now();
        const invoices = await store.getInvoices(orgId, { environment: env });
        return invoices.filter(
          (i) => i.status === 'OVERDUE' || (i.due_date && new Date(i.due_date).getTime() < now && i.status !== 'PAID')
        );
      }

      case 'get_payment_summary': {
        const invoices = await store.getInvoices(orgId, { environment: env });
        const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.grand_total) || 0), 0);
        const totalCollected = invoices.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
        const outstanding = totalInvoiced - totalCollected;
        return {
          totalInvoiced,
          totalCollected,
          outstanding,
          currency: org?.default_currency || 'INR',
          invoicesCount: invoices.length,
        };
      }

      case 'get_sales_summary': {
        const [quotes, invoices] = await Promise.all([
          store.getQuotations(orgId, { environment: env }),
          store.getInvoices(orgId, { environment: env }),
        ]);
        const totalPipeline = quotes
          .filter((q) => q.status === 'SENT')
          .reduce((s, q) => s + (Number(q.grand_total) || 0), 0);
        const totalWon = quotes
          .filter((q) => q.status === 'APPROVED' || q.status === 'COMPLETED')
          .reduce((s, q) => s + (Number(q.grand_total) || 0), 0);
        return {
          totalQuotes: quotes.length,
          activePipeline: totalPipeline,
          totalWonRevenue: totalWon,
          currency: org?.default_currency || 'INR',
        };
      }

      case 'get_repeat_customer_candidates': {
        const [quotes, customers] = await Promise.all([
          store.getQuotations(orgId, { environment: env }),
          store.getCustomers(orgId, { environment: env }),
        ]);
        const custQuoteMap = new Map<string, number>();
        for (const q of quotes) {
          if (q.customer_id) custQuoteMap.set(q.customer_id, (custQuoteMap.get(q.customer_id) || 0) + 1);
        }
        return customers
          .filter((c) => (custQuoteMap.get(c.id) || 0) >= 2)
          .map((c) => ({
            customer: c,
            historicalOrdersCount: custQuoteMap.get(c.id) || 0,
          }));
      }

      // --- DRAFT ---
      case 'create_quote_draft': {
        const items = params?.items || [];
        const subtotal = items.reduce(
          (s: number, it: any) => s + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
          0
        );
        const taxRate = params?.taxRate ?? org?.default_tax_rate ?? 0;
        const discountVal = Number(params?.discountValue) || 0;
        const discountAmount = params?.discountType === 'FIXED' ? discountVal : (subtotal * discountVal) / 100;
        const taxable = Math.max(0, subtotal - discountAmount);
        const taxAmount = (taxable * taxRate) / 100;
        const grandTotal = Math.round(taxable + taxAmount);

        return {
          draftStatus: 'DRAFT_READY',
          customerId: params?.customerId,
          customerName: params?.customerName,
          items,
          subtotal,
          taxRate,
          taxAmount,
          discountValue: discountVal,
          discountAmount,
          grandTotal,
          currency: params?.currency || org?.default_currency || 'INR',
        };
      }

      case 'create_invoice_draft': {
        return {
          draftStatus: 'INVOICE_DRAFT_READY',
          quotationId: params?.quotationId,
          customerId: params?.customerId,
          items: params?.items || [],
          dueDate: params?.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        };
      }

      case 'create_followup_draft': {
        const quoteNumber = params?.quoteNumber || 'Proposal';
        const customerName = params?.customerName || 'Customer';
        return {
          channel: params?.channel || 'EMAIL',
          subject: `Follow-up regarding Quote ${quoteNumber}`,
          body: `Hi ${customerName},\n\nI wanted to check in on Quote ${quoteNumber} sent recently. Please let us know if you have any questions or would like to adjust any details.\n\nBest regards,\n${org?.name || 'QuoteFlow Team'}`,
        };
      }

      case 'create_payment_reminder_draft': {
        const invoiceNumber = params?.invoiceNumber || 'Invoice';
        const customerName = params?.customerName || 'Customer';
        const amount = params?.amount ? formatCurrency(params.amount, org?.default_currency || 'INR') : '';
        return {
          channel: params?.channel || 'EMAIL',
          subject: `Friendly Payment Reminder: Invoice ${invoiceNumber}`,
          body: `Hi ${customerName},\n\nThis is a friendly reminder that payment for Invoice ${invoiceNumber}${amount ? ` (${amount})` : ''} is now due. Please remit payment at your earliest convenience.\n\nThank you for your business,\n${org?.name || 'QuoteFlow Team'}`,
        };
      }

      // --- EXECUTE ---
      case 'record_payment': {
        const invoiceId = params?.invoiceId;
        const paidAmount = Number(params?.amount) || 0;
        if (!invoiceId || paidAmount <= 0) throw new Error('Valid invoiceId and positive amount required');
        const invoice = await store.getInvoiceById(invoiceId, orgId);
        if (!invoice) throw new Error('Invoice not found');

        const newPaid = (Number(invoice.paid_amount) || 0) + paidAmount;
        const isPaid = newPaid >= (Number(invoice.grand_total) || 0);

        const updated = await store.updateInvoice(invoiceId, {
          paid_amount: newPaid,
          status: isPaid ? 'PAID' : 'PARTIALLY_PAID',
        });
        return { success: true, updatedInvoice: updated };
      }

      default:
        throw new Error(`Handler for action ${actionName} is not yet implemented.`);
    }
  }

  public getRegisteredActions(): ControlledAiActionDescriptor[] {
    return Array.from(this.actions.values());
  }
}

export const controlledActionRegistry = new ControlledActionRegistry();
