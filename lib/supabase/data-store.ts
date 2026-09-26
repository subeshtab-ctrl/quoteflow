import {
  Customer,
  Notification,
  Organization,
  Product,
  Quotation,
  QuotationChatMessage,
  ChatAttachment,
  QuotationEvent,
  QuotationItem,
  QuotationSignature,
  QuotationView,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  AttachmentItem,
  InvoiceAuditEvent,
  PortalPinRegistration,
  BankAccountDetails,
  UpiPaymentDetails,
  CryptoPaymentDetails,
  PaymentDisplayMode,
} from '@/types/database';
import { calculateQuotationTotals } from '@/lib/quotations/calculations';
import { generateDocumentHash, generateSecureToken, hashToken } from '@/lib/quotations/tokens';
import { createAdminClient } from '@/lib/supabase/service-role';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Default Demo Organization
export const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export const DEFAULT_INVOICE_NOTES =
  'Thank you for your business. Please remit payment according to the agreed terms.';

export const DEFAULT_INVOICE_TERMS = [
  '1. Payment is due within agreed terms from the date of invoice.',
  '2. Please quote the invoice number when making remittance.',
  '3. Overdue payments may be subject to interest as permitted by applicable law.',
  '4. Goods/services provided in accordance with approved scope are non-refundable.',
].join('\n');

class QuoteFlowStore {
  private organizations: Map<string, Organization> = new Map();
  private customers: Map<string, Customer> = new Map();
  private products: Map<string, Product> = new Map();
  private quotations: Map<string, Quotation> = new Map();
  private quotationItems: Map<string, QuotationItem[]> = new Map();
  private signatures: Map<string, QuotationSignature> = new Map();
  private views: Map<string, QuotationView[]> = new Map();
  private events: Map<string, QuotationEvent[]> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem[]> = new Map();
  private portalPins: Map<string, PortalPinRegistration> = new Map();

  private getOrgSettingsFilePath(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'org-settings.json');
  }

  private loadOrgSettingsFromFile(): Record<string, { require_full_payment_for_invoice?: boolean }> {
    try {
      const p = this.getOrgSettingsFilePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw) || {};
        const result: Record<string, { require_full_payment_for_invoice?: boolean }> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (val && typeof val === 'object' && 'require_full_payment_for_invoice' in val) {
            result[key] = {
              require_full_payment_for_invoice: Boolean((val as any).require_full_payment_for_invoice),
            };
          }
        }
        return result;
      }
    } catch {}
    return {};
  }

  private saveOrgSettingsToFile(orgId: string, data: Partial<Organization>): void {
    if (data.require_full_payment_for_invoice === undefined) return;
    try {
      const all = this.loadOrgSettingsFromFile();
      all[orgId] = {
        require_full_payment_for_invoice: Boolean(data.require_full_payment_for_invoice),
      };
      fs.writeFileSync(this.getOrgSettingsFilePath(), JSON.stringify(all, null, 2), 'utf-8');
    } catch {}
  }

  private getPaymentSettingsFilePath(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'org-payment-settings.json');
  }

  private loadPaymentSettingsFromFile(): Record<string, Partial<Organization>> {
    try {
      const p = this.getPaymentSettingsFilePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) || {};
      }
    } catch {}
    return {};
  }

  private savePaymentSettingsToFile(orgId: string, data: Partial<Organization>): void {
    try {
      const all = this.loadPaymentSettingsFromFile();
      all[orgId] = {
        ...(all[orgId] || {}),
        ...(data.default_bank_details !== undefined ? { default_bank_details: data.default_bank_details } : {}),
        ...(data.default_upi_details !== undefined ? { default_upi_details: data.default_upi_details } : {}),
        ...(data.default_crypto_details !== undefined ? { default_crypto_details: data.default_crypto_details } : {}),
        ...(data.default_payment_display_mode !== undefined ? { default_payment_display_mode: data.default_payment_display_mode } : {}),
        ...(data.default_show_bank_details !== undefined ? { default_show_bank_details: data.default_show_bank_details } : {}),
        ...(data.default_show_upi_details !== undefined ? { default_show_upi_details: data.default_show_upi_details } : {}),
        ...(data.default_show_crypto_details !== undefined ? { default_show_crypto_details: data.default_show_crypto_details } : {}),
      };
      const p = this.getPaymentSettingsFilePath();
      fs.writeFileSync(p, JSON.stringify(all, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save payment settings to file:', e);
    }
  }

  private getPaymentsFilePath(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'payments.json');
  }

  private loadPaymentsFromFile(): Record<
    string,
    {
      is_paid: boolean;
      paid_at?: string | null;
      payment_method?: string | null;
      payment_notes?: string | null;
      paid_amount?: number;
      balance_amount?: number;
      advance_percentage?: number | null;
      payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
      payment_confirmed_by_company?: boolean;
      payment_confirmed_at?: string | null;
      payment_confirmed_by?: string | null;
      payment_display_mode?: PaymentDisplayMode;
      show_bank_details?: boolean;
      show_upi_details?: boolean;
      show_crypto_details?: boolean;
      bank_details?: BankAccountDetails | null;
      upi_details?: UpiPaymentDetails | null;
      crypto_details?: CryptoPaymentDetails | null;
      payment_terms_instructions?: string | null;
      accepted_payment_methods?: string[] | null;
    }
  > {
    try {
      const p = this.getPaymentsFilePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) || {};
      }
    } catch {
      // Fallback
    }
    return {};
  }

  private savePaymentToFile(
    quotationId: string,
    data: {
      is_paid: boolean;
      paid_at?: string | null;
      payment_method?: string | null;
      payment_notes?: string | null;
      paid_amount?: number;
      balance_amount?: number;
      advance_percentage?: number | null;
      payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
      payment_confirmed_by_company?: boolean;
      payment_confirmed_at?: string | null;
      payment_confirmed_by?: string | null;
      payment_display_mode?: PaymentDisplayMode;
      show_bank_details?: boolean;
      show_upi_details?: boolean;
      show_crypto_details?: boolean;
      bank_details?: BankAccountDetails | null;
      upi_details?: UpiPaymentDetails | null;
      crypto_details?: CryptoPaymentDetails | null;
      payment_terms_instructions?: string | null;
      accepted_payment_methods?: string[] | null;
    }
  ): void {
    try {
      const all = this.loadPaymentsFromFile();
      all[quotationId] = {
        ...(all[quotationId] || {}),
        ...data,
      };
      const p = this.getPaymentsFilePath();
      fs.writeFileSync(p, JSON.stringify(all, null, 2), 'utf-8');
    } catch {
      // Fallback
    }
  }

  private resolvePaymentDetails(
    quotationId: string,
    grandTotal: number,
    eventsData: any[] | null | undefined,
    filePayments: Record<string, any>,
    existingQuote?: Quotation
  ): {
    is_paid: boolean;
    paid_at: string | null;
    payment_method: string | null;
    payment_notes: string | null;
    paid_amount: number;
    balance_amount: number;
    advance_percentage: number | null;
    payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    payment_confirmed_by_company: boolean;
    payment_confirmed_at: string | null;
    payment_confirmed_by: string | null;
    payment_display_mode?: PaymentDisplayMode;
    show_bank_details?: boolean;
    show_upi_details?: boolean;
    show_crypto_details?: boolean;
    bank_details?: BankAccountDetails | null;
    upi_details?: UpiPaymentDetails | null;
    crypto_details?: CryptoPaymentDetails | null;
    payment_terms_instructions?: string | null;
    accepted_payment_methods?: string[] | null;
  } {
    const filePayment = filePayments[quotationId];

    // 1. Look for latest payment event in eventsData
    const latestPaymentEvent = eventsData?.find(
      (e: any) =>
        e.event_type === 'MARKED_PAID' ||
        e.event_type === 'ADVANCE_PAID' ||
        e.event_type === 'MARKED_UNPAID'
    );

    const baseConfig = {
      payment_display_mode: filePayment?.payment_display_mode || existingQuote?.payment_display_mode || 'BOTH',
      show_bank_details: filePayment?.show_bank_details ?? existingQuote?.show_bank_details ?? true,
      show_upi_details: filePayment?.show_upi_details ?? existingQuote?.show_upi_details ?? true,
      show_crypto_details: filePayment?.show_crypto_details ?? existingQuote?.show_crypto_details ?? false,
      bank_details: filePayment?.bank_details ?? existingQuote?.bank_details ?? null,
      upi_details: filePayment?.upi_details ?? existingQuote?.upi_details ?? null,
      crypto_details: filePayment?.crypto_details ?? existingQuote?.crypto_details ?? null,
      payment_terms_instructions: filePayment?.payment_terms_instructions ?? existingQuote?.payment_terms_instructions ?? null,
      accepted_payment_methods: filePayment?.accepted_payment_methods ?? existingQuote?.accepted_payment_methods ?? null,
    };

    if (latestPaymentEvent) {
      const meta = latestPaymentEvent.metadata || {};
      if (latestPaymentEvent.event_type === 'MARKED_PAID') {
        const pAmt = meta.paid_amount !== undefined ? Number(meta.paid_amount) : grandTotal;
        return {
          ...baseConfig,
          is_paid: true,
          paid_at: meta.paid_at || latestPaymentEvent.created_at,
          payment_method: meta.payment_method || null,
          payment_notes: meta.payment_notes || null,
          paid_amount: pAmt,
          balance_amount: 0,
          advance_percentage: 100,
          payment_status: 'PAID',
          payment_confirmed_by_company: meta.payment_confirmed_by_company !== undefined ? Boolean(meta.payment_confirmed_by_company) : true,
          payment_confirmed_at: meta.payment_confirmed_at || latestPaymentEvent.created_at,
          payment_confirmed_by: meta.confirmed_by || meta.payment_confirmed_by || null,
        };
      } else if (latestPaymentEvent.event_type === 'ADVANCE_PAID') {
        const pAmt = meta.paid_amount !== undefined ? Number(meta.paid_amount) : 0;
        const bAmt = meta.balance_amount !== undefined ? Number(meta.balance_amount) : Math.max(0, grandTotal - pAmt);
        const advPct = meta.advance_percentage !== undefined && meta.advance_percentage !== null
          ? Number(meta.advance_percentage)
          : (grandTotal > 0 && pAmt > 0 ? Math.round((pAmt / grandTotal) * 100) : null);
        return {
          ...baseConfig,
          is_paid: false,
          paid_at: meta.paid_at || latestPaymentEvent.created_at,
          payment_method: meta.payment_method || null,
          payment_notes: meta.payment_notes || null,
          paid_amount: pAmt,
          balance_amount: bAmt,
          advance_percentage: advPct,
          payment_status: 'PARTIALLY_PAID',
          payment_confirmed_by_company: meta.payment_confirmed_by_company !== undefined ? Boolean(meta.payment_confirmed_by_company) : true,
          payment_confirmed_at: meta.payment_confirmed_at || latestPaymentEvent.created_at,
          payment_confirmed_by: meta.confirmed_by || meta.payment_confirmed_by || null,
        };
      } else if (latestPaymentEvent.event_type === 'MARKED_UNPAID') {
        return {
          ...baseConfig,
          is_paid: false,
          paid_at: null,
          payment_method: null,
          payment_notes: null,
          paid_amount: 0,
          balance_amount: grandTotal,
          advance_percentage: 0,
          payment_status: 'UNPAID',
          payment_confirmed_by_company: false,
          payment_confirmed_at: null,
          payment_confirmed_by: null,
        };
      }
    }

    if (filePayment !== undefined) {
      const isPaid = Boolean(filePayment.is_paid);
      const pAmt = filePayment.paid_amount !== undefined ? Number(filePayment.paid_amount) : (isPaid ? grandTotal : 0);
      const bAmt = filePayment.balance_amount !== undefined ? Number(filePayment.balance_amount) : (isPaid ? 0 : Math.max(0, grandTotal - pAmt));
      const advPct = filePayment.advance_percentage !== undefined ? filePayment.advance_percentage : (isPaid ? 100 : (grandTotal > 0 && pAmt > 0 ? Math.round((pAmt / grandTotal) * 100) : null));
      const payStatus = filePayment.payment_status || (isPaid ? 'PAID' : (pAmt > 0 ? 'PARTIALLY_PAID' : 'UNPAID'));
      return {
        ...baseConfig,
        is_paid: isPaid,
        paid_at: filePayment.paid_at || null,
        payment_method: filePayment.payment_method || null,
        payment_notes: filePayment.payment_notes || null,
        paid_amount: pAmt,
        balance_amount: bAmt,
        advance_percentage: advPct,
        payment_status: payStatus,
        payment_confirmed_by_company: filePayment.payment_confirmed_by_company !== undefined ? Boolean(filePayment.payment_confirmed_by_company) : isPaid,
        payment_confirmed_at: filePayment.payment_confirmed_at || null,
        payment_confirmed_by: filePayment.payment_confirmed_by || null,
      };
    }

    if (existingQuote) {
      const isPaid = Boolean(existingQuote.is_paid);
      const pAmt = existingQuote.paid_amount !== undefined ? Number(existingQuote.paid_amount) : (isPaid ? grandTotal : 0);
      const bAmt = existingQuote.balance_amount !== undefined ? Number(existingQuote.balance_amount) : (isPaid ? 0 : Math.max(0, grandTotal - pAmt));
      return {
        ...baseConfig,
        is_paid: isPaid,
        paid_at: existingQuote.paid_at || null,
        payment_method: existingQuote.payment_method || null,
        payment_notes: existingQuote.payment_notes || null,
        paid_amount: pAmt,
        balance_amount: bAmt,
        advance_percentage: existingQuote.advance_percentage ?? (isPaid ? 100 : null),
        payment_status: existingQuote.payment_status || (isPaid ? 'PAID' : (pAmt > 0 ? 'PARTIALLY_PAID' : 'UNPAID')),
        payment_confirmed_by_company: existingQuote.payment_confirmed_by_company ?? isPaid,
        payment_confirmed_at: existingQuote.payment_confirmed_at || null,
        payment_confirmed_by: existingQuote.payment_confirmed_by || null,
      };
    }

    return {
      ...baseConfig,
      is_paid: false,
      paid_at: null,
      payment_method: null,
      payment_notes: null,
      paid_amount: 0,
      balance_amount: grandTotal,
      advance_percentage: null,
      payment_status: 'UNPAID',
      payment_confirmed_by_company: false,
      payment_confirmed_at: null,
      payment_confirmed_by: null,
    };
  }

  private getInvoicesFilePath(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'invoices.json');
  }

  private loadInvoicesFromFile(): Invoice[] {
    try {
      const p = this.getInvoicesFilePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) || [];
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private saveInvoicesToFile(): void {
    try {
      const all = Array.from(this.invoices.values());
      const p = this.getInvoicesFilePath();
      fs.writeFileSync(p, JSON.stringify(all, null, 2), 'utf-8');
    } catch {
      // Fallback
    }
  }

  private async persistInvoiceToSupabase(invoice: Invoice): Promise<void> {
    try {
      const supabase = createAdminClient();
      if (!supabase) return;
      const invName = `INVOICE:${invoice.id}`;
      const payload = JSON.stringify(invoice);

      const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('name', invName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('templates')
          .update({
            layout_style: payload,
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('templates')
          .insert({
            organization_id: invoice.organization_id || DEFAULT_ORG_ID,
            name: invName,
            layout_style: payload,
            accent_color: 'INVOICE',
            is_default: false,
          });
      }
    } catch (e) {
      console.warn('Failed to persist invoice to Supabase templates:', e);
    }
  }

  private async loadInvoicesFromSupabase(orgId?: string): Promise<Invoice[]> {
    try {
      const supabase = createAdminClient();
      if (!supabase) return [];
      let query = supabase.from('templates').select('*').eq('accent_color', 'INVOICE');
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      const { data, error } = await query;
      if (error || !data) return [];

      const list: Invoice[] = [];
      for (const row of data) {
        try {
          if (row.layout_style) {
            const parsed = JSON.parse(row.layout_style) as Invoice;
            if (parsed && parsed.id) {
              list.push(parsed);
              this.invoices.set(parsed.id, parsed);
              if (parsed.items) {
                this.invoiceItems.set(parsed.id, parsed.items);
              }
            }
          }
        } catch {}
      }
      return list;
    } catch {
      return [];
    }
  }

  constructor() {
    // Load any file-persisted invoices
    const savedInvoices = this.loadInvoicesFromFile();
    if (savedInvoices && savedInvoices.length > 0) {
      for (const inv of savedInvoices) {
        this.invoices.set(inv.id, inv);
        if (inv.items) {
          this.invoiceItems.set(inv.id, inv.items);
        }
      }
    }

    const hasSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!hasSupabase) {
      this.seedInitialData();
    } else {
      // Set baseline organization fallback in case remote DB is temporarily unreachable
      this.organizations.set(DEFAULT_ORG_ID, {
        id: DEFAULT_ORG_ID,
        name: 'SUBESH M LLC',
        slug: 'subesh-m-llc',
        business_type: 'Services & Products',
        email: 'subeshtab@gmail.com',
        phone: '+91 99999 88888',
        website: '',
        gst_vat_number: '',
        address_line1: 'Business Center',
        address_line2: null,
        city: 'Metropolis',
        state: 'State',
        country: 'United Arab Emirates',
        postal_code: '10001',
        brand_color: '#4f46e5',
        default_currency: 'AED',
        default_tax_rate: 5,
        default_validity_days: 30,
        quotation_prefix: 'Q-',
        quotation_start_number: 1,
        current_quotation_counter: 19,
        default_terms: '1. Quotation valid for 30 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.',
        invoice_footer: 'Thank you for your business!',
        logo_url: '/uploads/logo-1790062784938.jpg',
        require_full_payment_for_invoice: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  private seedInitialData() {
    // 1. Organization
    const demoOrg: Organization = {
      id: DEFAULT_ORG_ID,
      name: 'SUBESH M LLC',
      logo_url: '/uploads/logo-1790062784938.jpg',
      slug: 'subesh-m-llc',
      business_type: 'Services & Products',
      email: 'subeshtab@gmail.com',
      phone: '+91 99999 88888',
      website: '',
      gst_vat_number: '',
      address_line1: 'Business Center',
      address_line2: null,
      city: 'Metropolis',
      state: 'State',
      country: 'United Arab Emirates',
      postal_code: '10001',
      brand_color: '#4f46e5',
      default_currency: 'AED',
      default_tax_rate: 5,
      default_validity_days: 30,
      quotation_prefix: 'Q-',
      quotation_start_number: 1,
      current_quotation_counter: 19,
      default_terms: '1. Quotation valid for 30 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.',
      invoice_footer: 'Thank you for your business!',
      require_full_payment_for_invoice: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.organizations.set(demoOrg.id, demoOrg);

    // 2. Customers
    const cust1: Customer = {
      id: 'b0000000-0000-0000-0000-000000000001',
      organization_id: DEFAULT_ORG_ID,
      name: 'Rajesh Sharma',
      company_name: 'ABC Private Limited',
      email: 'rajesh@abc.example.com',
      phone: '+91 98111 22233',
      billing_address: '102 Nariman Point',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postal_code: '400021',
      tax_number: '27AABCA1122B1Z8',
      notes: 'Key enterprise account',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const cust2: Customer = {
      id: 'b0000000-0000-0000-0000-000000000002',
      organization_id: DEFAULT_ORG_ID,
      name: 'John Mathew',
      company_name: 'JM Architect Studio',
      email: 'john@mathew.example.com',
      phone: '+91 98222 33344',
      billing_address: 'Marine Drive West',
      city: 'Kochi',
      state: 'Kerala',
      country: 'India',
      postal_code: '682011',
      tax_number: '32AAAJM9988C1Z2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const cust3: Customer = {
      id: 'b0000000-0000-0000-0000-000000000003',
      organization_id: DEFAULT_ORG_ID,
      name: 'Priya Sen',
      company_name: 'XYZ Technologies',
      email: 'priya@xyztech.example.com',
      phone: '+91 98333 44455',
      billing_address: 'Kalyani Nagar IT Zone',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      postal_code: '411006',
      tax_number: '27AAACX5544D1Z0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.customers.set(cust1.id, cust1);
    this.customers.set(cust2.id, cust2);
    this.customers.set(cust3.id, cust3);

    // 3. Products
    const prod1: Product = {
      id: 'c0000000-0000-0000-0000-000000000001',
      organization_id: DEFAULT_ORG_ID,
      name: 'Cloud Architecture Consulting',
      sku: 'SRV-CONSULT',
      description: 'Advisory & cloud architecture assessment',
      unit_price: 25000,
      unit: 'days',
      tax_rate: 18,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const prod2: Product = {
      id: 'c0000000-0000-0000-0000-000000000002',
      organization_id: DEFAULT_ORG_ID,
      name: 'Hardware & Server Installation',
      sku: 'SRV-INSTALL',
      description: 'On-premise / rack server deployment & setup',
      unit_price: 12000,
      unit: 'units',
      tax_rate: 18,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const prod3: Product = {
      id: 'c0000000-0000-0000-0000-000000000003',
      organization_id: DEFAULT_ORG_ID,
      name: 'Enterprise Software License',
      sku: 'LIC-ENT-01',
      description: 'Annual license for SaaS platform (up to 50 users)',
      unit_price: 65000,
      unit: 'licenses',
      tax_rate: 18,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const prod4: Product = {
      id: 'c0000000-0000-0000-0000-000000000004',
      organization_id: DEFAULT_ORG_ID,
      name: 'Annual Maintenance Contract (AMC)',
      sku: 'AMC-GOLD',
      description: '24/7 priority support and quarterly maintenance',
      unit_price: 30000,
      unit: 'year',
      tax_rate: 18,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.set(prod1.id, prod1);
    this.products.set(prod2.id, prod2);
    this.products.set(prod3.id, prod3);
    this.products.set(prod4.id, prod4);

    // 4. Sample Quotation: Q-000001 (Draft)
    const q1: Quotation = {
      id: 'd0000000-0000-0000-0000-000000000001',
      organization_id: DEFAULT_ORG_ID,
      customer_id: cust1.id,
      quotation_number: 'Q-000001',
      revision_number: 1,
      title: 'Cloud Infrastructure Setup & Migration',
      status: 'DRAFT',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      subtotal: 50000,
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      discount_amount: 5000,
      tax_rate: 18,
      tax_amount: 8100,
      grand_total: 53100,
      notes: 'Initial draft for client review.',
      terms_conditions: demoOrg.default_terms,
      public_token: 'demo_token_draft_q001',
      public_token_hash: hashToken('demo_token_draft_q001'),
      is_token_revoked: false,
      view_count: 0,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    };
    this.quotations.set(q1.id, q1);
    this.quotationItems.set(q1.id, [
      {
        id: 'e0000000-0000-0000-0000-000000000001',
        quotation_id: q1.id,
        product_id: prod1.id,
        description: 'Cloud Architecture Consulting (2 Days)',
        quantity: 2,
        unit: 'days',
        unit_price: 25000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 9000,
        line_total: 50000,
        sort_order: 0,
      },
    ]);

    // 5. Sample Quotation: Q-000002 (Sent - Customer Review Ready)
    const q2: Quotation = {
      id: 'd0000000-0000-0000-0000-000000000002',
      organization_id: DEFAULT_ORG_ID,
      customer_id: cust2.id,
      quotation_number: 'Q-000002',
      revision_number: 1,
      title: 'Enterprise Software & Deployment',
      status: 'SENT',
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      subtotal: 77000,
      discount_type: 'FIXED',
      discount_value: 2000,
      discount_amount: 2000,
      tax_rate: 18,
      tax_amount: 13500,
      grand_total: 88500,
      notes: 'Special introductory bundle rate.',
      terms_conditions: demoOrg.default_terms,
      public_token: 'demo_token_sent_q002',
      public_token_hash: hashToken('demo_token_sent_q002'),
      is_token_revoked: false,
      view_count: 0,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    this.quotations.set(q2.id, q2);
    this.quotationItems.set(q2.id, [
      {
        id: 'e0000000-0000-0000-0000-000000000002',
        quotation_id: q2.id,
        product_id: prod3.id,
        description: 'Enterprise Software License (1 Year)',
        quantity: 1,
        unit: 'licenses',
        unit_price: 65000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 11700,
        line_total: 65000,
        sort_order: 0,
      },
      {
        id: 'e0000000-0000-0000-0000-000000000003',
        quotation_id: q2.id,
        product_id: prod2.id,
        description: 'Server Setup & Config',
        quantity: 1,
        unit: 'units',
        unit_price: 12000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 2160,
        line_total: 12000,
        sort_order: 1,
      },
    ]);
    this.events.set(q2.id, [
      {
        id: 'evt_1',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q2.id,
        actor_type: 'USER',
        actor_name: 'Admin',
        event_type: 'CREATED',
        metadata: { title: q2.title },
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'evt_2',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q2.id,
        actor_type: 'USER',
        actor_name: 'Admin',
        event_type: 'SENT',
        metadata: { recipient: cust2.email },
        created_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
      },
    ]);

    // 6. Sample Quotation: Q-000003 (Approved)
    const q3: Quotation = {
      id: 'd0000000-0000-0000-0000-000000000003',
      organization_id: DEFAULT_ORG_ID,
      customer_id: cust3.id,
      quotation_number: 'Q-000003',
      revision_number: 1,
      title: 'Annual Maintenance & Support Contract',
      status: 'APPROVED',
      issue_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      subtotal: 30000,
      discount_type: 'PERCENTAGE',
      discount_value: 0,
      discount_amount: 0,
      tax_rate: 18,
      tax_amount: 5400,
      grand_total: 35400,
      notes: 'Includes 24/7 on-call engineering assistance.',
      terms_conditions: demoOrg.default_terms,
      public_token: 'demo_token_approved_q003',
      public_token_hash: hashToken('demo_token_approved_q003'),
      is_token_revoked: false,
      view_count: 4,
      first_viewed_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      last_viewed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      approved_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      approved_document_hash: 'sha256_mock_hash_approved_doc_3',
      is_paid: true,
      paid_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      payment_method: 'UPI',
      payment_notes: 'UPI Ref #UPI-9988-7766 - Received in Axis Bank',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    this.quotations.set(q3.id, q3);
    this.quotationItems.set(q3.id, [
      {
        id: 'e0000000-0000-0000-0000-000000000004',
        quotation_id: q3.id,
        product_id: prod4.id,
        description: 'Annual Maintenance Contract (AMC)',
        quantity: 1,
        unit: 'year',
        unit_price: 30000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 5400,
        line_total: 30000,
        sort_order: 0,
      },
    ]);
    this.signatures.set(q3.id, {
      id: 'sig_1',
      quotation_id: q3.id,
      signer_name: 'Priya Sen',
      signer_email: 'priya@xyztech.example.com',
      signer_company: 'XYZ Technologies',
      signature_data_url:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="35" font-family="cursive" font-size="24">Priya Sen</text></svg>',
      signature_type: 'TYPED',
      signed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      document_hash: 'sha256_mock_hash_approved_doc_3',
    });
    this.events.set(q3.id, [
      {
        id: 'evt_3',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q3.id,
        actor_type: 'USER',
        actor_name: 'Admin',
        event_type: 'CREATED',
        metadata: {},
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'evt_4',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q3.id,
        actor_type: 'USER',
        actor_name: 'Admin',
        event_type: 'SENT',
        metadata: {},
        created_at: new Date(Date.now() - 4.5 * 86400000).toISOString(),
      },
      {
        id: 'evt_5',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q3.id,
        actor_type: 'CUSTOMER',
        actor_name: 'Priya Sen',
        event_type: 'VIEWED',
        metadata: { device: 'Chrome on Mac' },
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'evt_6',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q3.id,
        actor_type: 'CUSTOMER',
        actor_name: 'Priya Sen',
        event_type: 'APPROVED',
        metadata: { signer: 'Priya Sen', email: 'priya@xyztech.example.com' },
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ]);

    // 7. Sample Quotation: Q-000004 (Rejected)
    const q4: Quotation = {
      id: 'd0000000-0000-0000-0000-000000000004',
      organization_id: DEFAULT_ORG_ID,
      customer_id: cust1.id,
      quotation_number: 'Q-000004',
      revision_number: 1,
      title: 'Hardware Upgrades & Installation',
      status: 'REJECTED',
      issue_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      subtotal: 36000,
      discount_type: 'PERCENTAGE',
      discount_value: 0,
      discount_amount: 0,
      tax_rate: 18,
      tax_amount: 6480,
      grand_total: 42480,
      notes: 'Server rack upgrade proposal.',
      terms_conditions: demoOrg.default_terms,
      public_token: 'demo_token_rejected_q004',
      public_token_hash: hashToken('demo_token_rejected_q004'),
      is_token_revoked: false,
      view_count: 2,
      first_viewed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      rejected_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      rejection_reason: 'Price too high',
      rejection_comments: 'Budget for Q3 has been capped. Please revise or provide tiered pricing.',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    this.quotations.set(q4.id, q4);
    this.quotationItems.set(q4.id, [
      {
        id: 'e0000000-0000-0000-0000-000000000005',
        quotation_id: q4.id,
        product_id: prod2.id,
        description: 'Hardware & Server Installation',
        quantity: 3,
        unit: 'units',
        unit_price: 12000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 6480,
        line_total: 36000,
        sort_order: 0,
      },
    ]);
    this.events.set(q4.id, [
      {
        id: 'evt_7',
        organization_id: DEFAULT_ORG_ID,
        quotation_id: q4.id,
        actor_type: 'CUSTOMER',
        actor_name: 'Rajesh Sharma',
        event_type: 'REJECTED',
        metadata: { reason: 'Price too high', comments: 'Budget capped' },
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ]);

    // 8. Notifications
    const notif1: Notification = {
      id: 'n_1',
      organization_id: DEFAULT_ORG_ID,
      quotation_id: q3.id,
      title: 'Quotation Q-000003 Approved!',
      message: 'Priya Sen from XYZ Technologies has digitally approved the quotation.',
      type: 'APPROVED',
      is_read: false,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    const notif2: Notification = {
      id: 'n_2',
      organization_id: DEFAULT_ORG_ID,
      quotation_id: q4.id,
      title: 'Quotation Q-000004 Rejected',
      message: 'Rajesh Sharma rejected quotation: Price too high.',
      type: 'REJECTED',
      is_read: true,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    };
    this.notifications.set(notif1.id, notif1);
    this.notifications.set(notif2.id, notif2);

    // 9. Initial Invoices
    if (this.invoices.size === 0) {
      const inv1: Invoice = {
        id: 'inv_demo_001',
        organization_id: DEFAULT_ORG_ID,
        customer_id: cust2.id,
        quotation_id: q3.id,
        invoice_number: 'INV-000001',
        po_number: 'PO-2026-091',
        status: 'PAID',
        issue_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        due_date: new Date(Date.now() + 27 * 86400000).toISOString().split('T')[0],
        currency: 'INR',
        subtotal: 75000,
        discount_type: 'PERCENTAGE',
        discount_value: 0,
        discount_amount: 0,
        tax_rate: 18,
        tax_amount: 13500,
        grand_total: 88500,
        tax_breakdown: [
          { label: 'CGST (9%)', rate: 9, amount: 6750 },
          { label: 'SGST (9%)', rate: 9, amount: 6750 },
        ],
        notes: 'Thank you for your prompt business! Payment received in full.',
        terms_conditions: 'Standard 30 days payment cycle. All taxes as per statutory norms.',
        payment_terms: 'Net 30 Days',
        payment_method: 'BANK_TRANSFER',
        is_paid: true,
        paid_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        payment_notes: 'NEFT Ref: 2026092400921',
        attachments: [],
        created_by: 'User',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      };
      this.invoices.set(inv1.id, inv1);
      this.invoiceItems.set(inv1.id, [
        {
          id: 'inv_item_demo_1',
          invoice_id: inv1.id,
          product_id: prod1.id,
          description: 'UI/UX Redesign & Customer Portal Workflow',
          quantity: 1,
          unit: 'service',
          unit_price: 75000,
          discount_type: 'PERCENTAGE',
          discount_value: 0,
          discount_amount: 0,
          tax_rate: 18,
          tax_amount: 13500,
          line_total: 88500,
          sort_order: 0,
          item_type: 'SERVICE',
          classification_type: 'SAC',
          classification_code: '998311',
          cgst_rate: 9,
          cgst_amount: 6750,
          sgst_rate: 9,
          sgst_amount: 6750,
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ]);
    }
  }

  // --- ORGANIZATIONS ---
  public async getOrganization(orgId: string = DEFAULT_ORG_ID): Promise<Organization | null> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        let { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', orgId)
          .maybeSingle();

        if (!data && orgId === DEFAULT_ORG_ID) {
          const { data: fallbackOrg } = await supabase
            .from('organizations')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          data = fallbackOrg;
        }

        if (!error && data) {
          const compName = data.name || 'us';
          if (data.invoice_footer && data.invoice_footer.includes('The Mining Future')) {
            data.invoice_footer = `Thank you for partnering with ${compName}.`;
            supabase.from('organizations').update({ invoice_footer: data.invoice_footer }).eq('id', data.id).then();
          } else if (!data.invoice_footer) {
            data.invoice_footer = `Thank you for partnering with ${compName}.`;
          }
          const localSettings = this.loadOrgSettingsFromFile()[data.id] || {};
          const localPayment = this.loadPaymentSettingsFromFile()[data.id] || {};
          const fullOrg = {
            ...data,
            require_full_payment_for_invoice:
              localSettings.require_full_payment_for_invoice !== undefined
                ? localSettings.require_full_payment_for_invoice
                : ((data as any).require_full_payment_for_invoice ?? true),
            default_bank_details: localPayment.default_bank_details ?? (data as any).default_bank_details ?? null,
            default_upi_details: localPayment.default_upi_details ?? (data as any).default_upi_details ?? null,
            default_crypto_details: localPayment.default_crypto_details ?? (data as any).default_crypto_details ?? null,
            default_payment_display_mode: localPayment.default_payment_display_mode ?? (data as any).default_payment_display_mode ?? 'BOTH',
            default_show_bank_details: localPayment.default_show_bank_details ?? (data as any).default_show_bank_details ?? true,
            default_show_upi_details: localPayment.default_show_upi_details ?? (data as any).default_show_upi_details ?? true,
            default_show_crypto_details: localPayment.default_show_crypto_details ?? (data as any).default_show_crypto_details ?? false,
          } as Organization;
          this.organizations.set(data.id, fullOrg);
          return fullOrg;
        }
      }
    } catch (err) {
      console.warn('Could not fetch organization from Supabase:', err);
    }
    const cached = this.organizations.get(orgId);
    if (cached) {
      const compName = cached.name || 'us';
      if (cached.invoice_footer && cached.invoice_footer.includes('The Mining Future')) {
        cached.invoice_footer = `Thank you for partnering with ${compName}.`;
      }
      const localSettings = this.loadOrgSettingsFromFile()[orgId] || {};
      const localPayment = this.loadPaymentSettingsFromFile()[orgId] || {};
      return {
        ...cached,
        require_full_payment_for_invoice:
          localSettings.require_full_payment_for_invoice !== undefined
            ? localSettings.require_full_payment_for_invoice
            : ((cached as any).require_full_payment_for_invoice ?? true),
        default_bank_details: localPayment.default_bank_details ?? cached.default_bank_details ?? null,
        default_upi_details: localPayment.default_upi_details ?? cached.default_upi_details ?? null,
        default_crypto_details: localPayment.default_crypto_details ?? cached.default_crypto_details ?? null,
        default_payment_display_mode: localPayment.default_payment_display_mode ?? cached.default_payment_display_mode ?? 'BOTH',
        default_show_bank_details: localPayment.default_show_bank_details ?? cached.default_show_bank_details ?? true,
        default_show_upi_details: localPayment.default_show_upi_details ?? cached.default_show_upi_details ?? true,
        default_show_crypto_details: localPayment.default_show_crypto_details ?? cached.default_show_crypto_details ?? false,
      } as Organization;
    }
    return null;
  }

  public setCachedOrganization(orgId: string, org: Organization): void {
    this.organizations.set(orgId, org);
  }

  public async updateOrganization(orgId: string = DEFAULT_ORG_ID, data: Partial<Organization>): Promise<Organization> {
    const org = (await this.getOrganization(orgId)) || this.organizations.get(orgId)!;
    const compName = data.name || org.name || 'us';
    let cleanFooter = data.invoice_footer !== undefined ? data.invoice_footer : org.invoice_footer;
    if (cleanFooter && cleanFooter.includes('The Mining Future')) {
      cleanFooter = `Thank you for partnering with ${compName}.`;
    }
    const logoUrl =
      data.logo_url !== undefined
        ? (data.logo_url ? data.logo_url : null)
        : (org.logo_url || null);

    const updated: Organization = {
      ...org,
      ...data,
      logo_url: logoUrl,
      invoice_footer: cleanFooter,
      updated_at: new Date().toISOString(),
    };
    this.organizations.set(orgId, updated);
    this.saveOrgSettingsToFile(orgId, updated);
    this.savePaymentSettingsToFile(orgId, updated);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const dbPayload: Record<string, any> = {
          name: updated.name,
          slug: updated.slug || 'my-company',
          business_type: updated.business_type,
          email: updated.email,
          phone: updated.phone,
          website: updated.website,
          gst_vat_number: updated.gst_vat_number,
          address_line1: updated.address_line1,
          address_line2: updated.address_line2,
          city: updated.city,
          state: updated.state,
          country: updated.country,
          postal_code: updated.postal_code,
          logo_url: logoUrl,
          brand_color: updated.brand_color,
          default_currency: updated.default_currency,
          default_tax_rate: updated.default_tax_rate,
          default_validity_days: updated.default_validity_days,
          quotation_prefix: updated.quotation_prefix,
          quotation_start_number: updated.quotation_start_number,
          current_quotation_counter: updated.current_quotation_counter,
          default_terms: updated.default_terms,
          invoice_footer: cleanFooter,
          updated_at: new Date().toISOString(),
        };

        let { data: saved, error } = await supabase
          .from('organizations')
          .update(dbPayload)
          .eq('id', orgId)
          .select()
          .maybeSingle();

        if (!saved && !error) {
          const insertPayload = { ...dbPayload, id: orgId };
          const insertRes = await supabase
            .from('organizations')
            .insert(insertPayload)
            .select()
            .maybeSingle();
          saved = insertRes.data;
          error = insertRes.error;
        }

        if (error) {
          console.error('Supabase organization update error:', error);
        } else if (saved) {
          const localSettings = this.loadOrgSettingsFromFile()[orgId] || {};
          const localPayment = this.loadPaymentSettingsFromFile()[orgId] || {};
          const fullSaved = {
            ...saved,
            require_full_payment_for_invoice:
              localSettings.require_full_payment_for_invoice !== undefined
                ? localSettings.require_full_payment_for_invoice
                : ((saved as any).require_full_payment_for_invoice ?? true),
            default_bank_details: localPayment.default_bank_details ?? (saved as any).default_bank_details ?? updated.default_bank_details ?? null,
            default_upi_details: localPayment.default_upi_details ?? (saved as any).default_upi_details ?? updated.default_upi_details ?? null,
            default_crypto_details: localPayment.default_crypto_details ?? (saved as any).default_crypto_details ?? updated.default_crypto_details ?? null,
            default_payment_display_mode: localPayment.default_payment_display_mode ?? (saved as any).default_payment_display_mode ?? updated.default_payment_display_mode ?? 'BOTH',
            default_show_bank_details: localPayment.default_show_bank_details ?? (saved as any).default_show_bank_details ?? updated.default_show_bank_details ?? true,
            default_show_upi_details: localPayment.default_show_upi_details ?? (saved as any).default_show_upi_details ?? updated.default_show_upi_details ?? true,
            default_show_crypto_details: localPayment.default_show_crypto_details ?? (saved as any).default_show_crypto_details ?? updated.default_show_crypto_details ?? false,
          } as Organization;
          this.organizations.set(orgId, fullSaved);
          return fullSaved;
        }
      }
    } catch (err) {
      console.error('Failed to sync organization to Supabase:', err);
    }

    return updated;
  }

  // --- QUOTATION NUMBER GENERATOR (Atomic sequential per org) ---
  public async generateNextQuotationNumber(orgId: string = DEFAULT_ORG_ID): Promise<string> {
    let nextCount = 1;
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data } = await supabase
          .from('quotations')
          .select('quotation_number')
          .eq('organization_id', orgId)
          .order('quotation_number', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const match = data[0].quotation_number.match(/\d+$/);
          if (match) {
            nextCount = parseInt(match[0], 10) + 1;
          }
        }
      }
    } catch (err) {
      console.warn('Error finding latest quotation number from Supabase:', err);
    }

    const org = await this.getOrganization(orgId);
    const orgCount = (org?.current_quotation_counter || 0) + 1;
    nextCount = Math.max(nextCount, orgCount);

    if (org) {
      org.current_quotation_counter = nextCount;
      this.organizations.set(orgId, org);
      try {
        const supabase = createAdminClient();
        if (supabase) {
          await supabase
            .from('organizations')
            .update({ current_quotation_counter: nextCount })
            .eq('id', orgId);
        }
      } catch {
        // Non-fatal
      }
    }

    const prefix = org?.quotation_prefix || 'Q-';
    return `${prefix}${String(nextCount).padStart(6, '0')}`;
  }

  // --- CUSTOMERS ---
  public async getCustomers(orgId: string = DEFAULT_ORG_ID): Promise<Customer[]> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const remoteIds = new Set(data.map((c) => c.id));
          for (const [id, c] of this.customers.entries()) {
            if (c.organization_id === orgId && !remoteIds.has(id)) {
              this.customers.delete(id);
            }
          }
          for (const c of data) {
            this.customers.set(c.id, c as Customer);
          }
          return data as Customer[];
        }
      }
    } catch (err) {
      console.warn('Could not fetch customers from Supabase, using local cache:', err);
    }

    return Array.from(this.customers.values())
      .filter((c) => c.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getCustomerById(id: string, orgId: string = DEFAULT_ORG_ID): Promise<Customer | null> {
    const cust = this.customers.get(id);
    if (cust && cust.organization_id === orgId) return cust;

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (!error && data) {
          this.customers.set(data.id, data as Customer);
          return data as Customer;
        }
      }
    } catch (err) {
      console.warn('Error fetching customer from Supabase:', err);
    }

    return null;
  }

  public async getCustomer(id: string, orgId: string = DEFAULT_ORG_ID): Promise<Customer | null> {
    return this.getCustomerById(id, orgId);
  }

  public async createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `b0000000-0000-0000-0000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
    const now = new Date().toISOString();
    const customerEmail = data.email && data.email.trim()
      ? data.email.trim()
      : `${(data.name || 'client').toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@customer.local`;

    const newCustomer: Customer = {
      ...data,
      email: customerEmail,
      id,
      created_at: now,
      updated_at: now,
    };
    this.customers.set(id, newCustomer);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: inserted, error } = await supabase
          .from('customers')
          .insert({
            id,
            organization_id: data.organization_id || DEFAULT_ORG_ID,
            name: data.name,
            company_name: data.company_name || null,
            email: customerEmail,
            phone: data.phone || null,
            alternate_phone: data.alternate_phone || null,
            billing_address: data.billing_address || null,
            shipping_address: data.shipping_address || null,
            city: data.city || null,
            state: data.state || null,
            country: data.country || 'India',
            postal_code: data.postal_code || null,
            tax_number: data.tax_number || null,
            notes: data.notes || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase customer insert error:', error);
          throw error;
        } else if (inserted) {
          this.customers.set(inserted.id, inserted as Customer);
          return inserted as Customer;
        }
      }
    } catch (err: any) {
      console.error('Failed to sync customer to Supabase:', err);
      throw new Error(err.message || 'Failed to save customer to database');
    }

    return newCustomer;
  }

  public async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const existing = this.customers.get(id);
    const updated = { ...(existing || {}), ...data, updated_at: new Date().toISOString() } as Customer;
    this.customers.set(id, updated);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: updatedRow, error } = await supabase
          .from('customers')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase customer update error:', error);
        } else if (updatedRow) {
          this.customers.set(id, updatedRow as Customer);
          return updatedRow as Customer;
        }
      }
    } catch (err) {
      console.error('Failed to update customer in Supabase:', err);
    }

    return updated;
  }

  public async deleteCustomer(id: string, orgId: string = DEFAULT_ORG_ID): Promise<boolean> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        // Cascade delete quotations belonging to this customer
        const { data: quotes } = await supabase
          .from('quotations')
          .select('id')
          .eq('customer_id', id);

        if (quotes && quotes.length > 0) {
          for (const q of quotes) {
            await this.deleteQuotation(q.id, orgId);
          }
        }

        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Supabase customer delete error:', error);
        }
      }
    } catch (err) {
      console.error('Failed to delete customer from Supabase:', err);
    }

    // Clean up memory
    const relatedQuoteIds = Array.from(this.quotations.values())
      .filter((q) => q.customer_id === id)
      .map((q) => q.id);

    for (const qId of relatedQuoteIds) {
      this.quotations.delete(qId);
      this.quotationItems.delete(qId);
      this.signatures.delete(qId);
      this.views.delete(qId);
      this.events.delete(qId);
    }

    this.customers.delete(id);
    return true;
  }

  // --- PRODUCTS ---
  public async getProducts(orgId: string = DEFAULT_ORG_ID): Promise<Product[]> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('organization_id', orgId)
          .order('name', { ascending: true });

        if (!error && data) {
          for (const p of data) {
            this.products.set(p.id, p as Product);
          }
          return data as Product[];
        }
      }
    } catch (err) {
      console.warn('Could not fetch products from Supabase:', err);
    }

    return Array.from(this.products.values())
      .filter((p) => p.organization_id === orgId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public async createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newProd: Product = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };
    this.products.set(id, newProd);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: saved, error } = await supabase
          .from('products')
          .insert({
            id,
            organization_id: data.organization_id || DEFAULT_ORG_ID,
            name: data.name,
            sku: data.sku || null,
            description: data.description || null,
            unit_price: data.unit_price,
            unit: data.unit || 'unit',
            tax_rate: data.tax_rate || 0,
            is_active: data.is_active !== undefined ? data.is_active : true,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase product create error:', error);
        } else if (saved) {
          this.products.set(id, saved as Product);
          return saved as Product;
        }
      }
    } catch (err) {
      console.error('Failed to sync new product to Supabase:', err);
    }

    return newProd;
  }

  public async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const existing = this.products.get(id);
    const now = new Date().toISOString();
    const updated: Product = {
      ...(existing || {}),
      ...data,
      id,
      organization_id: (existing?.organization_id || data.organization_id || DEFAULT_ORG_ID) as string,
      name: (data.name !== undefined ? data.name : existing?.name) || 'Product',
      unit_price: data.unit_price !== undefined ? data.unit_price : (existing?.unit_price || 0),
      unit: (data.unit !== undefined ? data.unit : existing?.unit) || 'unit',
      tax_rate: data.tax_rate !== undefined ? data.tax_rate : (existing?.tax_rate || 0),
      is_active: data.is_active !== undefined ? data.is_active : (existing?.is_active ?? true),
      updated_at: now,
      created_at: existing?.created_at || now,
    };
    this.products.set(id, updated);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: saved, error } = await supabase
          .from('products')
          .update({
            name: updated.name,
            sku: updated.sku || null,
            description: updated.description || null,
            unit_price: updated.unit_price,
            unit: updated.unit,
            tax_rate: updated.tax_rate,
            is_active: updated.is_active,
            updated_at: now,
          })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) {
          console.error('Supabase product update error:', error);
        } else if (saved) {
          this.products.set(id, saved as Product);
          return saved as Product;
        }
      }
    } catch (err) {
      console.error('Failed to sync updated product to Supabase:', err);
    }

    return updated;
  }

  public async deleteProduct(id: string, orgId: string = DEFAULT_ORG_ID): Promise<boolean> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Supabase product delete error:', error);
        }
      }
    } catch (err) {
      console.error('Failed to delete product from Supabase:', err);
    }

    this.products.delete(id);
    return true;
  }

  // --- QUOTATIONS ---
  public async getQuotations(
    orgId: string = DEFAULT_ORG_ID,
    filters?: { status?: string; search?: string; customerId?: string }
  ): Promise<Quotation[]> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        let query = supabase
          .from('quotations')
          .select('*, customer:customers(*), items:quotation_items(*)')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (filters?.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }

        const { data, error } = await query;
        if (!error && data) {
          // Synchronize memory cache with Supabase quotations for this org
          const remoteIds = new Set(data.map((q) => q.id));
          for (const [id, q] of this.quotations.entries()) {
            if (q.organization_id === orgId && !remoteIds.has(id)) {
              this.quotations.delete(id);
              this.quotationItems.delete(id);
            }
          }

          const filePayments = this.loadPaymentsFromFile();

          // Fetch payment and chat events from Supabase to ensure accurate status across all clients
          const eventsByQuote: Record<string, any[]> = {};
          const completedMap: Record<string, { completed_at: string; unpaid: boolean }> = {};
          const chatEventsByQuote: Record<string, { messages: Array<{ senderRole: string; createdAt: string }>; lastReadAt: string | null }> = {};
          try {
            const { data: orgEvents } = await supabase
              .from('quotation_events')
              .select('quotation_id, actor_type, event_type, metadata, created_at')
              .eq('organization_id', orgId)
              .in('event_type', ['MARKED_PAID', 'ADVANCE_PAID', 'MARKED_UNPAID', 'CHAT_MESSAGE', 'CHAT_READ', 'COMPLETED'])
              .order('created_at', { ascending: true });

            if (orgEvents) {
              for (const pe of orgEvents) {
                if (!eventsByQuote[pe.quotation_id]) {
                  eventsByQuote[pe.quotation_id] = [];
                }
                eventsByQuote[pe.quotation_id].push(pe);

                if (pe.event_type === 'COMPLETED') {
                  completedMap[pe.quotation_id] = {
                    completed_at: pe.metadata?.completed_at || pe.created_at,
                    unpaid: Boolean(pe.metadata?.unpaid),
                  };
                } else if (pe.event_type === 'CHAT_MESSAGE') {
                  if (!chatEventsByQuote[pe.quotation_id]) {
                    chatEventsByQuote[pe.quotation_id] = { messages: [], lastReadAt: null };
                  }
                  const senderRole = pe.metadata?.sender_role || (pe.actor_type === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF');
                  chatEventsByQuote[pe.quotation_id].messages.push({
                    senderRole,
                    createdAt: pe.created_at,
                  });
                  if (senderRole === 'STAFF') {
                    chatEventsByQuote[pe.quotation_id].lastReadAt = pe.created_at;
                  }
                } else if (pe.event_type === 'CHAT_READ') {
                  if (!chatEventsByQuote[pe.quotation_id]) {
                    chatEventsByQuote[pe.quotation_id] = { messages: [], lastReadAt: null };
                  }
                  chatEventsByQuote[pe.quotation_id].lastReadAt = pe.created_at;
                }
              }
            }
          } catch {}

          const expiredToUpdate: string[] = [];

          for (const q of data) {
            const existing = this.quotations.get(q.id);
            const quoteEvents = (eventsByQuote[q.id] || []).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const payDetails = this.resolvePaymentDetails(
              q.id,
              Number(q.grand_total) || 0,
              quoteEvents,
              filePayments,
              existing
            );

            // Auto-expire at the end of valid_until date (23:59:59.999) or check COMPLETED
            let currentStatus = q.status;
            let expiredAt = q.expired_at || existing?.expired_at || null;
            const completedInfo = completedMap[q.id];
            if (completedInfo) {
              currentStatus = 'COMPLETED';
            } else if (
              ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(currentStatus) &&
              this.isPastEndOfValidityDate(q.valid_until)
            ) {
              currentStatus = 'EXPIRED';
              expiredAt = expiredAt || new Date().toISOString();
              expiredToUpdate.push(q.id);
            }

            // Calculate chat unread status
            const chatStats = chatEventsByQuote[q.id];
            const chatCount = chatStats ? chatStats.messages.length : 0;
            const lastReadTime = chatStats?.lastReadAt ? new Date(chatStats.lastReadAt).getTime() : 0;
            const unreadChatCount = chatStats
              ? chatStats.messages.filter(
                  (m) => m.senderRole === 'CUSTOMER' && new Date(m.createdAt).getTime() > lastReadTime
                ).length
              : 0;

            const finalIsPaid = completedInfo && completedInfo.unpaid ? false : payDetails.is_paid;

            const merged: Quotation = {
              ...(existing || {}),
              ...q,
              status: currentStatus,
              expired_at: expiredAt,
              is_paid: finalIsPaid,
              paid_at: payDetails.paid_at,
              payment_method: payDetails.payment_method,
              payment_notes: payDetails.payment_notes,
              paid_amount: completedInfo && completedInfo.unpaid ? 0 : payDetails.paid_amount,
              balance_amount: completedInfo && completedInfo.unpaid ? Number(q.grand_total) : payDetails.balance_amount,
              advance_percentage: completedInfo && completedInfo.unpaid ? 0 : payDetails.advance_percentage,
              payment_status: completedInfo && completedInfo.unpaid ? 'UNPAID' : payDetails.payment_status,
              payment_confirmed_by_company: completedInfo && completedInfo.unpaid ? false : payDetails.payment_confirmed_by_company,
              payment_confirmed_at: completedInfo && completedInfo.unpaid ? null : payDetails.payment_confirmed_at,
              payment_confirmed_by: completedInfo && completedInfo.unpaid ? null : payDetails.payment_confirmed_by,
              completed_at: completedInfo?.completed_at || existing?.completed_at || null,
              completed_unpaid: Boolean(completedInfo?.unpaid || existing?.completed_unpaid),
              chat_count: chatCount,
              unread_chat_count: unreadChatCount,
              has_unread_chat: unreadChatCount > 0,
              payment_display_mode: payDetails.payment_display_mode,
              show_bank_details: payDetails.show_bank_details,
              show_upi_details: payDetails.show_upi_details,
              show_crypto_details: payDetails.show_crypto_details,
              bank_details: payDetails.bank_details,
              upi_details: payDetails.upi_details,
              crypto_details: payDetails.crypto_details,
              payment_terms_instructions: payDetails.payment_terms_instructions || (q as any).payment_terms_instructions || existing?.payment_terms_instructions || '',
              accepted_payment_methods: payDetails.accepted_payment_methods || (q as any).accepted_payment_methods || existing?.accepted_payment_methods || null,
            };
            this.quotations.set(q.id, merged);
            if (q.customer) {
              this.customers.set(q.customer.id, q.customer as Customer);
            }
            if (q.items) {
              this.quotationItems.set(q.id, q.items as QuotationItem[]);
            }
          }

          if (expiredToUpdate.length > 0) {
            const nowIso = new Date().toISOString();
            supabase
              .from('quotations')
              .update({ status: 'EXPIRED', expired_at: nowIso, updated_at: nowIso })
              .in('id', expiredToUpdate)
              .then(() => {});
          }

          let results = data.map((q) => this.quotations.get(q.id) as Quotation);
          if (filters?.status && filters.status !== 'ALL') {
            results = results.filter((item) => item.status === filters.status);
          }
          if (filters?.search) {
            const s = filters.search.toLowerCase();
            results = results.filter((item) => {
              const cust = item.customer;
              return (
                item.quotation_number.toLowerCase().includes(s) ||
                item.title.toLowerCase().includes(s) ||
                (cust && (cust.name?.toLowerCase().includes(s) || cust.company_name?.toLowerCase().includes(s)))
              );
            });
          }
          return results;
        }
      }
    } catch (err) {
      console.warn('Could not fetch quotations from Supabase, using local cache:', err);
    }

    let list = Array.from(this.quotations.values()).filter((q) => q.organization_id === orgId);

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((q) => q.status === filters.status);
    }

    if (filters?.customerId) {
      list = list.filter((q) => q.customer_id === filters.customerId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((item) => {
        const cust = this.customers.get(item.customer_id);
        return (
          item.quotation_number.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (cust && (cust.name.toLowerCase().includes(q) || (cust.company_name && cust.company_name.toLowerCase().includes(q))))
        );
      });
    }

    // Attach joined customer & items
    return list
      .map((quote) => ({
        ...quote,
        customer: this.customers.get(quote.customer_id),
        items: this.quotationItems.get(quote.id) || [],
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getQuotationById(id: string, orgId: string = DEFAULT_ORG_ID): Promise<Quotation | null> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('quotations')
          .select('*, customer:customers(*), items:quotation_items(*)')
          .eq('id', id)
          .eq('organization_id', orgId)
          .maybeSingle();

        if (!error && data) {
          const existing = this.quotations.get(data.id);
          const filePayments = this.loadPaymentsFromFile();
          const filePayment = filePayments[data.id];

          // Fetch signature, events, views from Supabase first
          const [
            { data: sigData },
            { data: eventsData },
            { data: viewsData }
          ] = await Promise.all([
            supabase
              .from('quotation_signatures')
              .select('*')
              .eq('quotation_id', data.id)
              .order('signed_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('quotation_events')
              .select('*')
              .eq('quotation_id', data.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('quotation_views')
              .select('*')
              .eq('quotation_id', data.id),
          ]);

          if (sigData) {
            this.signatures.set(data.id, sigData as QuotationSignature);
          }
          if (eventsData && eventsData.length > 0) {
            this.events.set(data.id, eventsData as QuotationEvent[]);
          }
          if (viewsData && viewsData.length > 0) {
            this.views.set(data.id, viewsData as QuotationView[]);
          }

          const payDetails = this.resolvePaymentDetails(
            data.id,
            Number(data.grand_total) || 0,
            eventsData,
            filePayments,
            existing
          );

          // Check for COMPLETED event or auto-expire at end of valid_until date
          let currentStatus = data.status;
          let expiredAt = data.expired_at || existing?.expired_at || null;

          const latestCompletedEvent = eventsData?.find(
            (e: any) => e.event_type === 'COMPLETED'
          );

          let isPaid = payDetails.is_paid;

          if (latestCompletedEvent) {
            currentStatus = 'COMPLETED';
            if (latestCompletedEvent.metadata?.unpaid) {
              isPaid = false;
            }
          } else if (
            ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(currentStatus) &&
            this.isPastEndOfValidityDate(data.valid_until)
          ) {
            currentStatus = 'EXPIRED';
            expiredAt = expiredAt || new Date().toISOString();
            supabase
              .from('quotations')
              .update({ status: 'EXPIRED', expired_at: expiredAt, updated_at: new Date().toISOString() })
              .eq('id', data.id)
              .then(() => {});
          }

          const chatState = this.computeChatStatsFromEvents(eventsData || []);

          const merged: Quotation = {
            ...(existing || {}),
            ...data,
            status: currentStatus,
            expired_at: expiredAt,
            is_paid: isPaid,
            paid_at: payDetails.paid_at,
            payment_method: payDetails.payment_method,
            payment_notes: payDetails.payment_notes,
            paid_amount: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? 0 : payDetails.paid_amount,
            balance_amount: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? Number(data.grand_total) : payDetails.balance_amount,
            advance_percentage: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? 0 : payDetails.advance_percentage,
            payment_status: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? 'UNPAID' : payDetails.payment_status,
            payment_confirmed_by_company: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? false : payDetails.payment_confirmed_by_company,
            payment_confirmed_at: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? null : payDetails.payment_confirmed_at,
            payment_confirmed_by: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? null : payDetails.payment_confirmed_by,
            completed_at: latestCompletedEvent ? (latestCompletedEvent.metadata?.completed_at || latestCompletedEvent.created_at) : existing?.completed_at || null,
            completed_unpaid: Boolean(latestCompletedEvent?.metadata?.unpaid || existing?.completed_unpaid),
            chat_count: chatState.chatCount,
            unread_chat_count: chatState.unreadChatCount,
            has_unread_chat: chatState.unreadChatCount > 0,
            payment_display_mode: payDetails.payment_display_mode,
            show_bank_details: payDetails.show_bank_details,
            show_upi_details: payDetails.show_upi_details,
            show_crypto_details: payDetails.show_crypto_details,
            bank_details: payDetails.bank_details,
            upi_details: payDetails.upi_details,
            crypto_details: payDetails.crypto_details,
            payment_terms_instructions: payDetails.payment_terms_instructions || (data as any).payment_terms_instructions || existing?.payment_terms_instructions || '',
            accepted_payment_methods: payDetails.accepted_payment_methods || (data as any).accepted_payment_methods || existing?.accepted_payment_methods || null,
          };
          this.quotations.set(data.id, merged);
          if (data.customer) {
            this.customers.set(data.customer.id, data.customer as Customer);
          }
          if (data.items) {
            this.quotationItems.set(data.id, data.items as QuotationItem[]);
          }

          const org = (await this.getOrganization(data.organization_id)) || this.organizations.get(data.organization_id);

          return {
            ...merged,
            organization: org,
            signature: (sigData as QuotationSignature) || this.signatures.get(data.id) || null,
            events: (this.events.get(data.id) || []).sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ),
            views: this.views.get(data.id) || [],
          } as Quotation;
        }
      }
    } catch (err) {
      console.warn('Error fetching quotation from Supabase:', err);
    }

    const quote = this.quotations.get(id);
    if (!quote || quote.organization_id !== orgId) return null;

    if (
      ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(quote.status) &&
      this.isPastEndOfValidityDate(quote.valid_until)
    ) {
      quote.status = 'EXPIRED';
      quote.expired_at = quote.expired_at || new Date().toISOString();
      this.quotations.set(id, quote);
    }

    const org = (await this.getOrganization(quote.organization_id)) || this.organizations.get(quote.organization_id);

    return {
      ...quote,
      organization: org,
      customer: this.customers.get(quote.customer_id),
      items: (this.quotationItems.get(quote.id) || []).sort((a, b) => a.sort_order - b.sort_order),
      signature: this.signatures.get(quote.id) || null,
      events: (this.events.get(quote.id) || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      views: this.views.get(quote.id) || [],
    };
  }

  public async getQuotationByPublicToken(token: string): Promise<Quotation | null> {
    const hashed = hashToken(token);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('quotations')
          .select('*, customer:customers(*), items:quotation_items(*)')
          .or(`public_token.eq.${token},public_token_hash.eq.${hashed}`)
          .maybeSingle();

        if (!error && data) {
          const existing = this.quotations.get(data.id);
          const filePayments = this.loadPaymentsFromFile();
          const filePayment = filePayments[data.id];

          // Fetch signatures and events
          const [
            { data: sigData },
            { data: eventsData },
          ] = await Promise.all([
            supabase
              .from('quotation_signatures')
              .select('*')
              .eq('quotation_id', data.id)
              .order('signed_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('quotation_events')
              .select('*')
              .eq('quotation_id', data.id)
              .order('created_at', { ascending: false }),
          ]);

          if (sigData) {
            this.signatures.set(data.id, sigData as QuotationSignature);
          }
          if (eventsData && eventsData.length > 0) {
            this.events.set(data.id, eventsData as QuotationEvent[]);
          }

          const payDetails = this.resolvePaymentDetails(
            data.id,
            Number(data.grand_total) || 0,
            eventsData,
            filePayments,
            existing
          );

          // Check for COMPLETED event or auto-expire at end of valid_until date
          let currentStatus = data.status;
          let expiredAt = data.expired_at || existing?.expired_at || null;

          const latestCompletedEvent = eventsData?.find(
            (e: any) => e.event_type === 'COMPLETED'
          );

          let isPaid = payDetails.is_paid;

          if (latestCompletedEvent) {
            currentStatus = 'COMPLETED';
            if (latestCompletedEvent.metadata?.unpaid) {
              isPaid = false;
            }
          } else if (
            ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(currentStatus) &&
            this.isPastEndOfValidityDate(data.valid_until)
          ) {
            currentStatus = 'EXPIRED';
            expiredAt = expiredAt || new Date().toISOString();
            supabase
              .from('quotations')
              .update({ status: 'EXPIRED', expired_at: expiredAt, updated_at: new Date().toISOString() })
              .eq('id', data.id)
              .then(() => {});
          }

          const chatState = this.computeChatStatsFromEvents(eventsData || []);

          const merged: Quotation = {
            ...(existing || {}),
            ...data,
            status: currentStatus,
            expired_at: expiredAt,
            is_paid: isPaid,
            paid_at: payDetails.paid_at,
            payment_method: payDetails.payment_method,
            payment_notes: payDetails.payment_notes,
            paid_amount: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? 0 : payDetails.paid_amount,
            balance_amount: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? Number(data.grand_total) : payDetails.balance_amount,
            advance_percentage: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? 0 : payDetails.advance_percentage,
            payment_status: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? 'UNPAID' : payDetails.payment_status,
            payment_confirmed_by_company: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? false : payDetails.payment_confirmed_by_company,
            payment_confirmed_at: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? null : payDetails.payment_confirmed_at,
            payment_confirmed_by: latestCompletedEvent && latestCompletedEvent.metadata?.unpaid ? null : payDetails.payment_confirmed_by,
            completed_at: latestCompletedEvent ? (latestCompletedEvent.metadata?.completed_at || latestCompletedEvent.created_at) : existing?.completed_at || null,
            completed_unpaid: Boolean(latestCompletedEvent?.metadata?.unpaid || existing?.completed_unpaid),
            chat_count: chatState.chatCount,
            unread_chat_count: chatState.unreadChatCount,
            has_unread_chat: chatState.unreadChatCount > 0,
            payment_display_mode: payDetails.payment_display_mode,
            show_bank_details: payDetails.show_bank_details,
            show_upi_details: payDetails.show_upi_details,
            show_crypto_details: payDetails.show_crypto_details,
            bank_details: payDetails.bank_details,
            upi_details: payDetails.upi_details,
            crypto_details: payDetails.crypto_details,
            payment_terms_instructions: payDetails.payment_terms_instructions || (data as any).payment_terms_instructions || existing?.payment_terms_instructions || '',
            accepted_payment_methods: payDetails.accepted_payment_methods || (data as any).accepted_payment_methods || existing?.accepted_payment_methods || null,
          };

          this.quotations.set(data.id, merged);
          if (data.customer) {
            this.customers.set(data.customer.id, data.customer as Customer);
          }
          if (data.items) {
            this.quotationItems.set(data.id, data.items as QuotationItem[]);
          }

          const org = (await this.getOrganization(data.organization_id)) || this.organizations.get(data.organization_id);

          return {
            ...merged,
            organization: org,
            signature: (sigData as QuotationSignature) || this.signatures.get(data.id) || null,
          } as Quotation;
        }
      }
    } catch (err) {
      console.warn('Error fetching quotation by token from Supabase:', err);
    }

    // Lookup by raw token or hash
    const quote = Array.from(this.quotations.values()).find(
      (q) => q.public_token === token || q.public_token_hash === hashed
    );

    if (!quote) return null;

    const org = (await this.getOrganization(quote.organization_id)) || this.organizations.get(quote.organization_id);

    return {
      ...quote,
      organization: org,
      customer: this.customers.get(quote.customer_id),
      items: (this.quotationItems.get(quote.id) || []).sort((a, b) => a.sort_order - b.sort_order),
      signature: this.signatures.get(quote.id) || null,
    };
  }

  public async createQuotation(data: {
    organization_id?: string;
    customer_id?: string;
    title: string;
    issue_date: string;
    valid_until: string;
    currency?: any;
    discount_type?: any;
    discount_value?: number;
    tax_rate?: number;
    notes?: string;
    terms_conditions?: string;
    items: any[];
    attachments?: any[];
    status?: any;
    advance_percentage?: number | null;
    accepted_payment_methods?: string[] | null;
    payment_terms_instructions?: string | null;
    payment_display_mode?: PaymentDisplayMode;
    show_bank_details?: boolean;
    show_upi_details?: boolean;
    show_crypto_details?: boolean;
    bank_details?: BankAccountDetails | null;
    upi_details?: UpiPaymentDetails | null;
    crypto_details?: CryptoPaymentDetails | null;
  }): Promise<Quotation> {
    const orgId = data.organization_id || DEFAULT_ORG_ID;
    const org = await this.getOrganization(orgId);
    const customerId = data.customer_id || 'b0000000-0000-0000-0000-000000000001';

    // Recalculate totals server-side
    const calculation = calculateQuotationTotals({
      items: data.items,
      discount_type: data.discount_type || 'PERCENTAGE',
      discount_value: data.discount_value || 0,
      tax_rate: data.tax_rate || 0,
    });

    const quotationNumber = await this.generateNextQuotationNumber(orgId);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `d0000000-0000-0000-0000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
    const publicToken = generateSecureToken();
    const publicTokenHash = hashToken(publicToken);

    const paymentDisplayMode = data.payment_display_mode || org?.default_payment_display_mode || 'BOTH';
    const showBank = data.show_bank_details !== undefined ? data.show_bank_details : (org?.default_show_bank_details ?? true);
    const showUpi = data.show_upi_details !== undefined ? data.show_upi_details : (org?.default_show_upi_details ?? true);
    const showCrypto = data.show_crypto_details !== undefined ? data.show_crypto_details : (org?.default_show_crypto_details ?? false);
    const bankDetails = data.bank_details !== undefined ? data.bank_details : (org?.default_bank_details || null);
    const upiDetails = data.upi_details !== undefined ? data.upi_details : (org?.default_upi_details || null);
    const cryptoDetails = data.crypto_details !== undefined ? data.crypto_details : (org?.default_crypto_details || null);

    const newQuotation: Quotation = {
      id,
      organization_id: orgId,
      customer_id: customerId,
      quotation_number: quotationNumber,
      revision_number: 1,
      title: data.title,
      status: data.status || 'DRAFT',
      issue_date: data.issue_date,
      valid_until: data.valid_until,
      currency: data.currency || org?.default_currency || 'INR',
      subtotal: calculation.subtotal,
      discount_type: calculation.discount_type,
      discount_value: calculation.discount_value,
      discount_amount: calculation.discount_amount,
      tax_rate: calculation.tax_rate,
      tax_amount: calculation.tax_amount,
      grand_total: calculation.grand_total,
      notes: data.notes || '',
      terms_conditions: data.terms_conditions || org?.default_terms || '',
      public_token: publicToken,
      public_token_hash: publicTokenHash,
      is_token_revoked: false,
      view_count: 0,
      attachments: data.attachments || [],
      advance_percentage: data.advance_percentage !== undefined ? data.advance_percentage : 50,
      accepted_payment_methods: data.accepted_payment_methods || ['Bank Transfer', 'Online / Card', 'Cheque'],
      payment_terms_instructions: data.payment_terms_instructions || '',
      payment_display_mode: paymentDisplayMode,
      show_bank_details: showBank,
      show_upi_details: showUpi,
      show_crypto_details: showCrypto,
      bank_details: bankDetails,
      upi_details: upiDetails,
      crypto_details: cryptoDetails,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.quotations.set(id, newQuotation);
    this.savePaymentToFile(id, {
      is_paid: false,
      payment_display_mode: paymentDisplayMode,
      show_bank_details: showBank,
      show_upi_details: showUpi,
      show_crypto_details: showCrypto,
      bank_details: bankDetails,
      upi_details: upiDetails,
      crypto_details: cryptoDetails,
      payment_terms_instructions: data.payment_terms_instructions || '',
      accepted_payment_methods: data.accepted_payment_methods || null,
      advance_percentage: data.advance_percentage !== undefined ? data.advance_percentage : 50,
    });

    // Save items with classification and tax breakdowns
    const savedItems: QuotationItem[] = calculation.items.map((item, idx) => {
      const orig = (data.items && data.items[idx]) || {};
      return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${idx}`,
        quotation_id: id,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        discount_amount: item.discount_amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        sort_order: idx,
        item_type: orig.item_type || 'GOODS',
        classification_type: orig.classification_type || null,
        classification_code: orig.classification_code || null,
        cgst_rate: orig.cgst_rate,
        cgst_amount: orig.cgst_amount,
        sgst_rate: orig.sgst_rate,
        sgst_amount: orig.sgst_amount,
        igst_rate: orig.igst_rate,
        igst_amount: orig.igst_amount,
        tax_category: orig.tax_category || null,
      };
    });
    this.quotationItems.set(id, savedItems);

    // Audit Event
    this.logEvent(orgId, id, 'USER', 'CREATED', {
      title: newQuotation.title,
      quotation_number: quotationNumber,
      grand_total: newQuotation.grand_total,
    });

    if (newQuotation.status === 'SENT') {
      this.logEvent(orgId, id, 'USER', 'SENT', {
        public_token: publicToken,
      });
    }

    // Sync to Supabase
    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase.from('quotations').insert({
          id,
          organization_id: orgId,
          customer_id: data.customer_id,
          quotation_number: quotationNumber,
          revision_number: 1,
          title: data.title,
          status: newQuotation.status,
          issue_date: data.issue_date,
          valid_until: data.valid_until,
          currency: newQuotation.currency,
          subtotal: newQuotation.subtotal,
          discount_type: newQuotation.discount_type,
          discount_value: newQuotation.discount_value,
          discount_amount: newQuotation.discount_amount,
          tax_rate: newQuotation.tax_rate,
          tax_amount: newQuotation.tax_amount,
          grand_total: newQuotation.grand_total,
          notes: newQuotation.notes,
          terms_conditions: newQuotation.terms_conditions,
          public_token: publicToken,
          public_token_hash: publicTokenHash,
          is_token_revoked: false,
          view_count: 0,
        });

        if (savedItems.length > 0) {
          await supabase.from('quotation_items').insert(
            savedItems.map((item) => ({
              id: item.id,
              quotation_id: id,
              product_id: item.product_id || null,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              discount_type: item.discount_type,
              discount_value: item.discount_value,
              discount_amount: item.discount_amount,
              tax_rate: item.tax_rate,
              tax_amount: item.tax_amount,
              line_total: item.line_total,
              sort_order: item.sort_order,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to sync quotation to Supabase:', err);
    }

    return {
      ...newQuotation,
      items: savedItems,
      customer: this.customers.get(customerId),
      organization: org || undefined,
    };
  }

  public async deleteQuotation(id: string, orgId: string = DEFAULT_ORG_ID): Promise<boolean> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        // Clean up child tables first to satisfy foreign key constraints
        await Promise.allSettled([
          supabase.from('quotation_items').delete().eq('quotation_id', id),
          supabase.from('signatures').delete().eq('quotation_id', id),
          supabase.from('quotation_views').delete().eq('quotation_id', id),
          supabase.from('quotation_events').delete().eq('quotation_id', id),
        ]);

        const { error } = await supabase
          .from('quotations')
          .delete()
          .eq('id', id)
          .eq('organization_id', orgId);

        if (error) {
          console.error('Supabase quotation delete error:', error);
        }
      }
    } catch (err) {
      console.error('Failed to delete quotation from Supabase:', err);
    }

    this.quotations.delete(id);
    this.quotationItems.delete(id);
    this.signatures.delete(id);
    this.views.delete(id);
    this.events.delete(id);

    return true;
  }

  public async updateQuotation(
    id: string,
    data: {
      customer_id?: string;
      title?: string;
      issue_date?: string;
      valid_until?: string;
      currency?: any;
      discount_type?: any;
      discount_value?: number;
      tax_rate?: number;
      notes?: string;
      terms_conditions?: string;
      items?: any[];
      attachments?: any[];
      status?: any;
      advance_percentage?: number | null;
      accepted_payment_methods?: string[] | null;
      payment_terms_instructions?: string | null;
      payment_display_mode?: PaymentDisplayMode;
      show_bank_details?: boolean;
      show_upi_details?: boolean;
      show_crypto_details?: boolean;
      bank_details?: BankAccountDetails | null;
      upi_details?: UpiPaymentDetails | null;
      crypto_details?: CryptoPaymentDetails | null;
    },
    orgId?: string
  ): Promise<Quotation> {
    let existing = this.quotations.get(id);
    if (!existing) {
      existing = (await this.getQuotationById(id, orgId || DEFAULT_ORG_ID)) || undefined;
    }
    if (!existing) throw new Error('Quotation not found');

    if (orgId && existing.organization_id !== orgId) {
      throw new Error('Unauthorized to modify quotation from another organization');
    }

    if (existing.status === 'COMPLETED') {
      throw new Error('Completed quotation is locked and cannot be edited.');
    }

    if (existing.status === 'APPROVED') {
      throw new Error('Approved quotation is immutable. Please create a revision.');
    }

    let calculation: any = null;
    let newItems = this.quotationItems.get(id) || [];

    if (data.items) {
      calculation = calculateQuotationTotals({
        items: data.items,
        discount_type: data.discount_type || existing.discount_type,
        discount_value: data.discount_value !== undefined ? data.discount_value : existing.discount_value,
        tax_rate: data.tax_rate !== undefined ? data.tax_rate : existing.tax_rate,
      });

      newItems = calculation.items.map((item: any, idx: number) => {
        const orig = (data.items && data.items[idx]) || {};
        return {
          id: item.id || `item_${Date.now()}_${idx}`,
          quotation_id: id,
          product_id: item.product_id || null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          discount_amount: item.discount_amount,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          line_total: item.line_total,
          sort_order: idx,
          item_type: orig.item_type || 'GOODS',
          classification_type: orig.classification_type || null,
          classification_code: orig.classification_code || null,
          cgst_rate: orig.cgst_rate,
          cgst_amount: orig.cgst_amount,
          sgst_rate: orig.sgst_rate,
          sgst_amount: orig.sgst_amount,
          igst_rate: orig.igst_rate,
          igst_amount: orig.igst_amount,
          tax_category: orig.tax_category || null,
        };
      });
      this.quotationItems.set(id, newItems);
    }

    const updated: Quotation = {
      ...existing,
      customer_id: data.customer_id || existing.customer_id,
      title: data.title || existing.title,
      issue_date: data.issue_date || existing.issue_date,
      valid_until: data.valid_until || existing.valid_until,
      currency: data.currency || existing.currency,
      subtotal: calculation ? calculation.subtotal : existing.subtotal,
      discount_type: calculation ? calculation.discount_type : existing.discount_type,
      discount_value: calculation ? calculation.discount_value : existing.discount_value,
      discount_amount: calculation ? calculation.discount_amount : existing.discount_amount,
      tax_rate: calculation ? calculation.tax_rate : existing.tax_rate,
      tax_amount: calculation ? calculation.tax_amount : existing.tax_amount,
      grand_total: calculation ? calculation.grand_total : existing.grand_total,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      terms_conditions: data.terms_conditions !== undefined ? data.terms_conditions : existing.terms_conditions,
      attachments: data.attachments !== undefined ? data.attachments : existing.attachments,
      advance_percentage: data.advance_percentage !== undefined ? data.advance_percentage : existing.advance_percentage,
      accepted_payment_methods: data.accepted_payment_methods !== undefined ? data.accepted_payment_methods : existing.accepted_payment_methods,
      payment_terms_instructions: data.payment_terms_instructions !== undefined ? data.payment_terms_instructions : existing.payment_terms_instructions,
      payment_display_mode: data.payment_display_mode !== undefined ? data.payment_display_mode : existing.payment_display_mode,
      show_bank_details: data.show_bank_details !== undefined ? data.show_bank_details : existing.show_bank_details,
      show_upi_details: data.show_upi_details !== undefined ? data.show_upi_details : existing.show_upi_details,
      show_crypto_details: data.show_crypto_details !== undefined ? data.show_crypto_details : existing.show_crypto_details,
      bank_details: data.bank_details !== undefined ? data.bank_details : existing.bank_details,
      upi_details: data.upi_details !== undefined ? data.upi_details : existing.upi_details,
      crypto_details: data.crypto_details !== undefined ? data.crypto_details : existing.crypto_details,
      status: data.status || existing.status,
      updated_at: new Date().toISOString(),
    };

    this.quotations.set(id, updated);
    this.savePaymentToFile(id, {
      is_paid: Boolean(updated.is_paid),
      paid_at: updated.paid_at,
      payment_method: updated.payment_method,
      payment_notes: updated.payment_notes,
      paid_amount: updated.paid_amount,
      balance_amount: updated.balance_amount,
      advance_percentage: updated.advance_percentage,
      payment_status: updated.payment_status,
      payment_confirmed_by_company: updated.payment_confirmed_by_company,
      payment_confirmed_at: updated.payment_confirmed_at,
      payment_confirmed_by: updated.payment_confirmed_by,
      payment_display_mode: updated.payment_display_mode,
      show_bank_details: updated.show_bank_details,
      show_upi_details: updated.show_upi_details,
      show_crypto_details: updated.show_crypto_details,
      bank_details: updated.bank_details,
      upi_details: updated.upi_details,
      crypto_details: updated.crypto_details,
      payment_terms_instructions: updated.payment_terms_instructions,
      accepted_payment_methods: updated.accepted_payment_methods,
    });

    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase
          .from('quotations')
          .update({
            customer_id: updated.customer_id,
            title: updated.title,
            issue_date: updated.issue_date,
            valid_until: updated.valid_until,
            currency: updated.currency,
            subtotal: updated.subtotal,
            discount_type: updated.discount_type,
            discount_value: updated.discount_value,
            discount_amount: updated.discount_amount,
            tax_rate: updated.tax_rate,
            tax_amount: updated.tax_amount,
            grand_total: updated.grand_total,
            notes: updated.notes,
            terms_conditions: updated.terms_conditions,
            status: updated.status,
            updated_at: updated.updated_at,
          })
          .eq('id', id);

        if (data.items) {
          await supabase.from('quotation_items').delete().eq('quotation_id', id);
          if (newItems.length > 0) {
            await supabase.from('quotation_items').insert(
              newItems.map((item: any, idx: number) => ({
                id: item.id && !item.id.startsWith('item_') ? item.id : undefined,
                quotation_id: id,
                product_id: item.product_id || null,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                discount_type: item.discount_type,
                discount_value: item.discount_value,
                discount_amount: item.discount_amount,
                tax_rate: item.tax_rate,
                tax_amount: item.tax_amount,
                line_total: item.line_total,
                sort_order: idx,
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync updated quotation to Supabase:', err);
    }

    this.logEvent(existing.organization_id, id, 'USER', 'EDITED', {
      status: updated.status,
      grand_total: updated.grand_total,
    });

    return {
      ...updated,
      items: newItems,
      customer: this.customers.get(updated.customer_id),
    };
  }

  // --- REVISION SYSTEM ---
  public async createQuotationRevision(quotationId: string): Promise<Quotation> {
    const parent = await this.getQuotationById(quotationId);
    if (!parent) throw new Error('Quotation not found');

    const nextRevisionNum = (parent.revision_number || 1) + 1;
    const newId = `quote_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const publicToken = generateSecureToken();

    const revisionQuotation: Quotation = {
      ...parent,
      id: newId,
      revision_number: nextRevisionNum,
      original_quotation_id: parent.original_quotation_id || parent.id,
      quotation_number: `${parent.quotation_number}-V${nextRevisionNum}`,
      status: 'DRAFT',
      public_token: publicToken,
      public_token_hash: hashToken(publicToken),
      is_token_revoked: false,
      view_count: 0,
      first_viewed_at: null,
      last_viewed_at: null,
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      rejection_comments: null,
      approved_document_hash: null,
      signature: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.quotations.set(newId, revisionQuotation);

    // Clone items
    const clonedItems: QuotationItem[] = (parent.items || []).map((item, idx) => ({
      ...item,
      id: `item_rev_${Date.now()}_${idx}`,
      quotation_id: newId,
    }));
    this.quotationItems.set(newId, clonedItems);

    this.logEvent(parent.organization_id, newId, 'USER', 'REVISED', {
      parent_quotation_number: parent.quotation_number,
      revision_number: nextRevisionNum,
    });

    return {
      ...revisionQuotation,
      items: clonedItems,
      customer: parent.customer,
      organization: parent.organization,
    };
  }

  // --- PUBLIC CUSTOMER VIEW TRACKING ---
  public async recordQuotationView(
    quotationId: string,
    meta: { ip?: string; userAgent?: string; ip_address?: string; user_agent?: string }
  ): Promise<{ quotation: Quotation; firstView: boolean }> {
    const quote = this.quotations.get(quotationId) || (await this.getQuotationById(quotationId));
    if (!quote) throw new Error('Quotation not found');

    const now = new Date();
    const nowIso = now.toISOString();
    const ipInput = meta.ip || meta.ip_address;
    const userAgentInput = meta.userAgent || meta.user_agent;
    const rawIp = ipInput && ipInput !== 'Unknown IP' && ipInput !== '::1' ? ipInput : (ipInput || '127.0.0.1');

    // 1-hour rolling window check for identical IP address
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const viewList = this.views.get(quotationId) || [];

    let isViewCountEligible = true;
    if (rawIp && rawIp !== 'Unknown IP') {
      const recentViewFromIp = [...viewList]
        .reverse()
        .find((v) => v.ip_address === rawIp);

      if (recentViewFromIp && recentViewFromIp.viewed_at) {
        const timeDiff = now.getTime() - new Date(recentViewFromIp.viewed_at).getTime();
        if (timeDiff < ONE_HOUR_MS) {
          isViewCountEligible = false;
        }
      }
    }

    const firstView = (quote.view_count || 0) === 0;

    if (isViewCountEligible) {
      quote.view_count = (quote.view_count || 0) + 1;
      if (!quote.first_viewed_at) {
        quote.first_viewed_at = nowIso;
      }
    }
    quote.last_viewed_at = nowIso;

    // Transition SENT -> VIEWED
    if (quote.status === 'SENT') {
      quote.status = 'VIEWED';
    }

    quote.updated_at = nowIso;
    this.quotations.set(quotationId, quote);

    // Record view log
    viewList.push({
      id: `view_${Date.now()}`,
      quotation_id: quotationId,
      ip_address: rawIp,
      user_agent: meta.userAgent,
      viewed_at: nowIso,
    });
    this.views.set(quotationId, viewList);

    // Audit Event - record IP in metadata
    this.logEvent(quote.organization_id, quotationId, 'CUSTOMER', 'VIEWED', {
      first_view: firstView,
      view_count: quote.view_count,
      ip_address: rawIp,
      user_agent: meta.userAgent,
      counted: isViewCountEligible,
    });

    if (firstView) {
      this.createNotification(
        quote.organization_id,
        quote.id,
        `Quotation ${quote.quotation_number} Viewed`,
        `Customer has opened and viewed quotation ${quote.quotation_number}.`,
        'VIEWED'
      );
    }

    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase
          .from('quotations')
          .update({
            status: quote.status,
            view_count: quote.view_count,
            first_viewed_at: quote.first_viewed_at,
            last_viewed_at: quote.last_viewed_at,
            updated_at: now,
          })
          .eq('id', quotationId);

        await supabase
          .from('quotation_views')
          .insert({
            quotation_id: quotationId,
            ip_address: meta.ip || null,
            user_agent: meta.userAgent || null,
            viewed_at: now,
          });

        if (firstView) {
          await supabase
            .from('quotation_events')
            .insert({
              organization_id: quote.organization_id,
              quotation_id: quotationId,
              actor_type: 'CUSTOMER',
              actor_name: quote.customer?.name || 'Customer',
              event_type: 'VIEWED',
              metadata: {
                userAgent: meta.userAgent,
                ip: meta.ip,
              },
              created_at: now,
            });
        }
      }
    } catch (err) {
      console.warn('Failed to sync quotation view to Supabase:', err);
    }

    return { quotation: quote, firstView };
  }

  // --- CLIENT PORTAL 6-DIGIT PIN AUTHENTICATION ---
  public hashPin(pin: string): string {
    return crypto.createHash('sha256').update(pin.trim()).digest('hex');
  }

  public async getPortalPin(quotationId: string): Promise<PortalPinRegistration | null> {
    if (this.portalPins.has(quotationId)) {
      return this.portalPins.get(quotationId)!;
    }

    const quote = await this.getQuotationById(quotationId);
    const customerEmail = quote?.customer?.email?.toLowerCase().trim();

    // Check if another quotation for this same customer already has a PIN
    for (const reg of this.portalPins.values()) {
      if (
        (customerEmail && reg.customer_email.toLowerCase().trim() === customerEmail) ||
        (quote?.customer_id && reg.customer_id === quote.customer_id)
      ) {
        this.portalPins.set(quotationId, reg);
        return reg;
      }
    }

    try {
      const supabase = createAdminClient();
      if (supabase) {
        let query = supabase
          .from('quotation_events')
          .select('*')
          .eq('event_type', 'PORTAL_PIN_REGISTERED')
          .order('created_at', { ascending: false })
          .limit(1);

        if (customerEmail) {
          query = query.or(`quotation_id.eq.${quotationId},metadata->>customer_email.eq.${customerEmail}`);
        } else {
          query = query.eq('quotation_id', quotationId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const evt = data[0];
          const reg: PortalPinRegistration = {
            id: evt.id,
            quotation_id: quotationId,
            customer_id: quote?.customer_id,
            customer_email: evt.metadata?.customer_email || customerEmail || '',
            pin_hash: evt.metadata?.pin_hash,
            registered_at: evt.metadata?.registered_at || evt.created_at,
          };
          this.portalPins.set(quotationId, reg);
          return reg;
        }
      }
    } catch (e) {
      console.warn('Could not fetch portal pin from Supabase:', e);
    }

    return null;
  }

  public async registerPortalPin(
    quotationId: string,
    email: string,
    pin: string
  ): Promise<{ success: boolean; message?: string }> {
    const quote = await this.getQuotationById(quotationId);
    if (!quote) throw new Error('Quotation not found');

    const cleanInputEmail = email.toLowerCase().trim();
    const customerEmail = (quote.customer?.email || '').toLowerCase().trim();

    if (!customerEmail) {
      throw new Error('This quotation does not have a registered customer email. Please contact the company.');
    }

    if (cleanInputEmail !== customerEmail) {
      throw new Error(`Email address does not match the registered client email on quotation ${quote.quotation_number}.`);
    }

    const cleanPin = pin.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      throw new Error('Security PIN must be exactly 6 digits (numbers only).');
    }

    const pinHash = this.hashPin(cleanPin);
    const now = new Date().toISOString();

    const reg: PortalPinRegistration = {
      id: `pin_${Date.now()}`,
      quotation_id: quotationId,
      customer_id: quote.customer_id,
      customer_email: cleanInputEmail,
      pin_hash: pinHash,
      registered_at: now,
    };

    this.portalPins.set(quotationId, reg);

    // Also link to other quotations belonging to this customer
    for (const [qId, q] of this.quotations.entries()) {
      if (
        q.customer_id === quote.customer_id ||
        (q.customer?.email && q.customer.email.toLowerCase().trim() === cleanInputEmail)
      ) {
        this.portalPins.set(qId, {
          ...reg,
          quotation_id: qId,
        });
      }
    }

    // Persist registration event in Supabase
    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase.from('quotation_events').insert({
          organization_id: quote.organization_id,
          quotation_id: quotationId,
          actor_type: 'CUSTOMER',
          actor_name: quote.customer?.name || 'Customer',
          event_type: 'PORTAL_PIN_REGISTERED',
          metadata: {
            customer_email: cleanInputEmail,
            pin_hash: pinHash,
            registered_at: now,
          },
          created_at: now,
        });
      }
    } catch (e) {
      console.warn('Could not persist portal pin to Supabase:', e);
    }

    return { success: true, message: '6-digit PIN registered successfully' };
  }

  public async verifyPortalPin(quotationId: string, pin: string): Promise<boolean> {
    const reg = await this.getPortalPin(quotationId);
    if (!reg) return false;

    const inputHash = this.hashPin(pin);
    return inputHash === reg.pin_hash;
  }

  public async resetPortalPin(
    quotationId: string,
    email: string,
    newPin: string
  ): Promise<{ success: boolean; message?: string }> {
    return await this.registerPortalPin(quotationId, email, newPin);
  }

  // --- APPROVAL WORKFLOW (ATOMIC TRANSACTION) ---
  public async approveQuotation(params: {
    token: string;
    signer_name: string;
    signer_email: string;
    signer_company?: string;
    signature_data_url: string;
    signature_type: 'DRAWN' | 'TYPED';
    ip_address?: string;
    user_agent?: string;
  }): Promise<Quotation> {
    const quote = await this.getQuotationByPublicToken(params.token);
    if (!quote) throw new Error('Quotation not found');

    if (quote.is_token_revoked) {
      throw new Error('This quotation link has been revoked');
    }

    // Expiry Check (end of valid_until date)
    if (this.isPastEndOfValidityDate(quote.valid_until) || quote.status === 'EXPIRED') {
      throw new Error(`This quotation expired on ${quote.valid_until}`);
    }

    if (quote.status === 'APPROVED') {
      throw new Error('This quotation has already been approved.');
    }

    if (quote.status === 'REJECTED') {
      throw new Error('This quotation has already been rejected.');
    }

    if (quote.status === 'CANCELLED') {
      throw new Error('This quotation has been cancelled by the business.');
    }

    const now = new Date().toISOString();

    // Compute immutable document hash
    const documentHash = generateDocumentHash({
      quotation_id: quote.id,
      quotation_number: quote.quotation_number,
      customer_id: quote.customer_id,
      grand_total: quote.grand_total,
      currency: quote.currency,
      issue_date: quote.issue_date,
      valid_until: quote.valid_until,
      items: (quote.items || []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
      })),
      approved_at: now,
      signer_name: params.signer_name,
      signer_email: params.signer_email,
    });

    // 1. Create Signature Record
    const sig: QuotationSignature = {
      id: `sig_${Date.now()}`,
      quotation_id: quote.id,
      signer_name: params.signer_name,
      signer_email: params.signer_email,
      signer_company: params.signer_company,
      signature_data_url: params.signature_data_url,
      signature_type: params.signature_type,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      signed_at: now,
      document_hash: documentHash,
    };
    this.signatures.set(quote.id, sig);

    // 2. Update Quotation Status
    const rawQuote = this.quotations.get(quote.id) || quote;
    rawQuote.status = 'APPROVED';
    rawQuote.approved_at = now;
    rawQuote.approved_document_hash = documentHash;
    rawQuote.updated_at = now;
    this.quotations.set(quote.id, rawQuote);

    // 3. Log Audit Event
    this.logEvent(quote.organization_id, quote.id, 'CUSTOMER', 'APPROVED', {
      signer_name: params.signer_name,
      signer_email: params.signer_email,
      signer_company: params.signer_company,
      document_hash: documentHash,
      ip_address: params.ip_address,
    });

    // 4. Create Notification
    this.createNotification(
      quote.organization_id,
      quote.id,
      `🎉 Quotation ${quote.quotation_number} Approved!`,
      `Approved by ${params.signer_name} (${params.signer_email}) for ${quote.currency} ${quote.grand_total}`,
      'APPROVED'
    );

    // 5. Persist to Supabase Database
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { error: qErr } = await supabase
          .from('quotations')
          .update({
            status: 'APPROVED',
            approved_at: now,
            approved_document_hash: documentHash,
            updated_at: now,
          })
          .eq('id', quote.id);

        if (qErr) console.error('Supabase quotation status update error:', qErr);

        const { error: sErr } = await supabase
          .from('quotation_signatures')
          .insert({
            quotation_id: quote.id,
            signer_name: params.signer_name,
            signer_email: params.signer_email,
            signer_company: params.signer_company || null,
            signature_data_url: params.signature_data_url,
            signature_type: params.signature_type,
            ip_address: params.ip_address || null,
            user_agent: params.user_agent || null,
            signed_at: now,
            document_hash: documentHash,
          });

        if (sErr) console.error('Supabase signature insert error:', sErr);

        const { error: eErr } = await supabase
          .from('quotation_events')
          .insert({
            organization_id: quote.organization_id,
            quotation_id: quote.id,
            actor_type: 'CUSTOMER',
            actor_name: params.signer_name,
            event_type: 'APPROVED',
            metadata: {
              signer_name: params.signer_name,
              signer_email: params.signer_email,
              signer_company: params.signer_company,
              document_hash: documentHash,
              ip_address: params.ip_address,
            },
            created_at: now,
          });

        if (eErr) console.error('Supabase approval event insert error:', eErr);
      }
    } catch (err) {
      console.error('Failed to sync approval to Supabase:', err);
    }

    return {
      ...rawQuote,
      signature: sig,
      items: quote.items,
      customer: quote.customer,
      organization: quote.organization,
    };
  }

  // --- BUSINESS / ADMIN MANUAL APPROVAL ---
  public async markQuotationApproved(id: string, approverName: string = 'Admin'): Promise<Quotation> {
    const quote = await this.getQuotationById(id);
    if (!quote) throw new Error('Quotation not found');

    const now = new Date().toISOString();
    const documentHash = generateDocumentHash({
      quotation_id: quote.id,
      quotation_number: quote.quotation_number,
      customer_id: quote.customer_id,
      grand_total: quote.grand_total,
      currency: quote.currency,
      issue_date: quote.issue_date,
      valid_until: quote.valid_until,
      items: (quote.items || []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
      })),
      approved_at: now,
      signer_name: approverName,
      signer_email: quote.customer?.email || 'admin@quoteflow.local',
    });

    const sig: QuotationSignature = {
      id: `sig_${Date.now()}`,
      quotation_id: quote.id,
      signer_name: approverName,
      signer_email: quote.customer?.email || 'admin@quoteflow.local',
      signer_company: quote.customer?.company_name || quote.customer?.name,
      signature_data_url:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="50"><text x="10" y="32" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23059669">✓ Approved (' +
        encodeURIComponent(approverName) +
        ')</text></svg>',
      signature_type: 'TYPED',
      signed_at: now,
      document_hash: documentHash,
    };
    this.signatures.set(quote.id, sig);

    const rawQuote = this.quotations.get(quote.id) || quote;
    rawQuote.status = 'APPROVED';
    rawQuote.approved_at = now;
    rawQuote.approved_document_hash = documentHash;
    rawQuote.updated_at = now;
    this.quotations.set(quote.id, rawQuote);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase
          .from('quotations')
          .update({
            status: 'APPROVED',
            approved_at: now,
            approved_document_hash: documentHash,
            updated_at: now,
          })
          .eq('id', quote.id);

        await supabase
          .from('quotation_signatures')
          .insert({
            quotation_id: quote.id,
            signer_name: approverName,
            signer_email: quote.customer?.email || 'admin@quoteflow.local',
            signer_company: quote.customer?.company_name || null,
            signature_data_url: sig.signature_data_url,
            signature_type: 'TYPED',
            signed_at: now,
            document_hash: documentHash,
          });

        await supabase
          .from('quotation_events')
          .insert({
            organization_id: quote.organization_id,
            quotation_id: quote.id,
            actor_type: 'USER',
            actor_name: approverName,
            event_type: 'APPROVED',
            metadata: {
              approved_by: approverName,
              document_hash: documentHash,
            },
            created_at: now,
          });
      }
    } catch (err) {
      console.error('Failed to sync admin approval to Supabase:', err);
    }

    this.logEvent(quote.organization_id, quote.id, 'USER', 'APPROVED', {
      approved_by: approverName,
    });

    return {
      ...rawQuote,
      signature: sig,
      items: quote.items,
      customer: quote.customer,
      organization: quote.organization,
    };
  }

  // --- PAYMENT WORKFLOW (PAID / UNPAID STATUS TRACKING & ADVANCE PAYMENTS) ---
  public async updateQuotationPayment(
    id: string,
    paymentData: {
      is_paid?: boolean;
      paid_amount?: number;
      balance_amount?: number;
      advance_percentage?: number | null;
      payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
      payment_confirmed_by_company?: boolean;
      paid_at?: string | null;
      payment_method?: string | null;
      payment_notes?: string | null;
      confirmed_by?: string | null;
    },
    orgId?: string
  ): Promise<Quotation> {
    let quote = this.quotations.get(id);
    if (!quote) {
      quote = (await this.getQuotationById(id, orgId || DEFAULT_ORG_ID)) || undefined;
    }
    if (!quote) throw new Error('Quotation not found');

    if (orgId && quote.organization_id !== orgId) {
      throw new Error('Unauthorized to modify quotation from another organization');
    }

    const now = new Date().toISOString();
    const grandTotal = Number(quote.grand_total) || 0;

    let isPaid = Boolean(paymentData.is_paid);
    let paidAmount = 0;
    let balanceAmount = grandTotal;
    let advancePct = paymentData.advance_percentage ?? null;

    if (paymentData.paid_amount !== undefined) {
      paidAmount = Math.max(0, Math.min(grandTotal, Number(paymentData.paid_amount) || 0));
      balanceAmount = Math.max(0, grandTotal - paidAmount);
      isPaid = balanceAmount <= 0 && paidAmount > 0;
      if (advancePct === null || advancePct === undefined) {
        advancePct = grandTotal > 0 ? Math.round((paidAmount / grandTotal) * 100) : 0;
      }
    } else if (paymentData.is_paid !== undefined) {
      if (paymentData.is_paid) {
        paidAmount = grandTotal;
        balanceAmount = 0;
        advancePct = 100;
        isPaid = true;
      } else {
        paidAmount = 0;
        balanceAmount = grandTotal;
        advancePct = 0;
        isPaid = false;
      }
    } else {
      paidAmount = quote.paid_amount ?? (quote.is_paid ? grandTotal : 0);
      balanceAmount = quote.balance_amount ?? (quote.is_paid ? 0 : grandTotal);
      isPaid = balanceAmount <= 0 && paidAmount > 0;
    }

    const paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = isPaid
      ? 'PAID'
      : paidAmount > 0
        ? 'PARTIALLY_PAID'
        : 'UNPAID';

    const confirmed = paymentStatus !== 'UNPAID'
      ? (paymentData.payment_confirmed_by_company ?? true)
      : false;

    const paidAt = paymentStatus !== 'UNPAID'
      ? (paymentData.paid_at || quote.paid_at || now)
      : null;

    quote.is_paid = isPaid;
    quote.paid_amount = paidAmount;
    quote.balance_amount = balanceAmount;
    quote.advance_percentage = advancePct;
    quote.payment_status = paymentStatus;
    quote.payment_confirmed_by_company = confirmed;
    quote.payment_confirmed_at = confirmed ? (quote.payment_confirmed_at || now) : null;
    quote.payment_confirmed_by = confirmed ? (paymentData.confirmed_by || 'Company Finance Team') : null;
    quote.paid_at = paidAt;
    quote.payment_method = paymentStatus !== 'UNPAID' ? (paymentData.payment_method ?? quote.payment_method ?? null) : null;
    quote.payment_notes = paymentStatus !== 'UNPAID' ? (paymentData.payment_notes ?? quote.payment_notes ?? null) : null;
    quote.updated_at = now;

    if (confirmed) {
      // Automatically purge payment proof screenshots upon company confirmation
      const qEvents = this.events.get(id) || [];
      let updatedLocal = false;
      for (const ev of qEvents) {
        if (ev.event_type === 'CHAT_MESSAGE' && ev.metadata?.attachment) {
          const att = ev.metadata.attachment;
          if (att.is_payment_proof || att.type?.startsWith('image/')) {
            ev.metadata.attachment = {
              ...att,
              url: '',
              deleted_at: now,
              deleted_reason: 'Payment verified by company - screenshot automatically purged for privacy & security',
            };
            updatedLocal = true;
          }
        }
      }
      if (updatedLocal) {
        this.events.set(id, qEvents);
      }

      try {
        const supabase = createAdminClient();
        if (supabase) {
          const { data: dbEvents } = await supabase
            .from('quotation_events')
            .select('*')
            .eq('quotation_id', id)
            .eq('event_type', 'CHAT_MESSAGE');

          if (dbEvents && dbEvents.length > 0) {
            for (const ev of dbEvents) {
              if (ev.metadata?.attachment) {
                const att = ev.metadata.attachment;
                if (att.is_payment_proof || att.type?.startsWith('image/')) {
                  const updatedMetadata = {
                    ...ev.metadata,
                    attachment: {
                      ...att,
                      url: '',
                      deleted_at: now,
                      deleted_reason: 'Payment verified by company - screenshot automatically purged for privacy & security',
                    },
                  };
                  await supabase
                    .from('quotation_events')
                    .update({ metadata: updatedMetadata })
                    .eq('id', ev.id);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error purging payment attachments in Supabase:', err);
      }
    }

    const org = await this.getOrganization(quote.organization_id);
    const requireFullPayment = org?.require_full_payment_for_invoice ?? true;

    if (quote.is_paid) {
      if (['APPROVED', 'SENT', 'VIEWED', 'PENDING', 'PENDING_APPROVAL'].includes(quote.status)) {
        quote.status = 'PAYMENT_COMPLETED';
      }
      try {
        await this.ensureInvoiceForQuotation(quote);
      } catch (e) {
        console.warn('Auto invoice generation on payment failed:', e);
      }
    } else {
      if (quote.status === 'PAYMENT_COMPLETED') {
        quote.status = 'APPROVED';
      }
      if (!requireFullPayment && quote.paid_amount && quote.paid_amount > 0) {
        try {
          await this.ensureInvoiceForQuotation(quote);
        } catch (e) {
          console.warn('Auto advance invoice generation failed:', e);
        }
      }
    }

    this.quotations.set(id, quote);

    // Save to local file storage for rock-solid persistence
    this.savePaymentToFile(id, {
      is_paid: quote.is_paid,
      paid_at: quote.paid_at,
      payment_method: quote.payment_method,
      payment_notes: quote.payment_notes,
      paid_amount: quote.paid_amount,
      balance_amount: quote.balance_amount,
      advance_percentage: quote.advance_percentage,
      payment_status: quote.payment_status,
      payment_confirmed_by_company: quote.payment_confirmed_by_company,
      payment_confirmed_at: quote.payment_confirmed_at,
    });

    // Audit Log Event
    this.logEvent(
      quote.organization_id,
      id,
      'USER',
      quote.is_paid
        ? 'MARKED_PAID'
        : quote.payment_status === 'PARTIALLY_PAID'
          ? 'ADVANCE_PAID'
          : 'MARKED_UNPAID',
      {
        is_paid: quote.is_paid,
        paid_amount: quote.paid_amount,
        balance_amount: quote.balance_amount,
        advance_percentage: quote.advance_percentage,
        payment_status: quote.payment_status,
        payment_confirmed_by_company: quote.payment_confirmed_by_company,
        paid_at: quote.paid_at,
        payment_method: quote.payment_method,
        payment_notes: quote.payment_notes,
        status: quote.status,
      }
    );

    // Sync to Supabase
    try {
      const supabase = createAdminClient();
      if (supabase) {
        // Persist payment state in quotation_events table in Supabase
        await supabase
          .from('quotation_events')
          .insert({
            organization_id: quote.organization_id,
            quotation_id: id,
            actor_type: 'USER',
            actor_name: 'Business User',
            event_type: quote.is_paid
              ? 'MARKED_PAID'
              : quote.payment_status === 'PARTIALLY_PAID'
                ? 'ADVANCE_PAID'
                : 'MARKED_UNPAID',
            metadata: {
              is_paid: quote.is_paid,
              paid_amount: quote.paid_amount,
              balance_amount: quote.balance_amount,
              advance_percentage: quote.advance_percentage,
              payment_status: quote.payment_status,
              payment_confirmed_by_company: quote.payment_confirmed_by_company,
              paid_at: quote.paid_at,
              payment_method: quote.payment_method,
              payment_notes: quote.payment_notes,
              status: quote.status,
            },
            created_at: now,
          });

        // Touch quotation updated_at in Supabase (avoid enum error on custom status)
        await supabase
          .from('quotations')
          .update({
            updated_at: now,
          })
          .eq('id', id);
      }
    } catch (err) {
      console.warn('Failed to sync quotation payment update to Supabase:', err);
    }

    return {
      ...quote,
      items: this.quotationItems.get(id) || quote.items || [],
      customer: this.customers.get(quote.customer_id) || quote.customer,
      organization: this.organizations.get(quote.organization_id) || quote.organization,
      signature: this.signatures.get(id) || quote.signature || null,
      events: this.events.get(id) || quote.events || [],
    };
  }

  public async updateQuotationPaymentDetails(
    id: string,
    data: {
      confirmed?: boolean;
      confirmed_by?: string;
      paid_amount?: number;
      payment_method?: string;
      payment_notes?: string;
      is_paid?: boolean;
      advance_percentage?: number | null;
      payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    },
    orgId?: string
  ): Promise<Quotation> {
    return this.updateQuotationPayment(
      id,
      {
        payment_confirmed_by_company: data.confirmed,
        confirmed_by: data.confirmed_by,
        paid_amount: data.paid_amount,
        payment_method: data.payment_method,
        payment_notes: data.payment_notes,
        is_paid: data.is_paid,
        advance_percentage: data.advance_percentage,
        payment_status: data.payment_status || (data.confirmed ? 'PAID' : undefined),
      },
      orgId
    );
  }

  // --- MARK AS COMPLETED WORKFLOW ---
  public async markQuotationCompleted(
    id: string,
    orgId?: string,
    user: string = 'Business User',
    options?: { unpaid?: boolean; reason?: string }
  ): Promise<Quotation> {
    let quote = this.quotations.get(id);
    if (!quote) {
      quote = (await this.getQuotationById(id, orgId || DEFAULT_ORG_ID)) || undefined;
    }
    if (!quote) throw new Error('Quotation not found');

    if (orgId && quote.organization_id !== orgId) {
      throw new Error('Unauthorized to modify quotation from another organization');
    }

    const now = new Date().toISOString();
    const isUnpaid = options?.unpaid !== undefined ? Boolean(options.unpaid) : !Boolean(quote.is_paid);

    quote.status = 'COMPLETED';
    quote.completed_at = now;
    quote.completed_unpaid = isUnpaid;
    if (isUnpaid) {
      quote.is_paid = false;
      quote.paid_at = null;
    } else {
      quote.is_paid = true;
      if (!quote.paid_at) {
        quote.paid_at = now;
      }
      try {
        await this.ensureInvoiceForQuotation(quote);
      } catch (e) {
        console.warn('Auto invoice on completion failed:', e);
      }
    }
    quote.updated_at = now;

    this.quotations.set(id, quote);

    // Audit Log Event
    this.logEvent(quote.organization_id, id, 'USER', 'COMPLETED', {
      completed_by: user,
      completed_at: now,
      unpaid: isUnpaid,
      reason: options?.reason || null,
    });

    try {
      const supabase = createAdminClient();
      if (supabase) {
        // Record COMPLETED event in quotation_events table in Supabase
        await supabase
          .from('quotation_events')
          .insert({
            organization_id: quote.organization_id,
            quotation_id: id,
            actor_type: 'USER',
            actor_name: user,
            event_type: 'COMPLETED',
            metadata: {
              completed_at: now,
              is_paid: !isUnpaid,
              unpaid: isUnpaid,
              reason: options?.reason || null,
            },
            created_at: now,
          });

        // Touch quotation updated_at without Postgres enum conflict
        await supabase
          .from('quotations')
          .update({
            updated_at: now,
          })
          .eq('id', id);
      }
    } catch (err) {
      console.warn('Failed to sync quotation completed status to Supabase:', err);
    }

    return {
      ...quote,
      items: this.quotationItems.get(id) || quote.items || [],
      customer: this.customers.get(quote.customer_id) || quote.customer,
      organization: this.organizations.get(quote.organization_id) || quote.organization,
      signature: this.signatures.get(id) || quote.signature || null,
      events: this.events.get(id) || quote.events || [],
    };
  }

  // --- MULTI-QUOTE CUSTOMER PORTAL RESOLVER ---
  public async getCustomerPortalQuotationsByToken(token: string): Promise<{
    activeQuotation: Quotation | null;
    allQuotations: Quotation[];
  }> {
    const activeQuotation = await this.getQuotationByPublicToken(token);
    if (!activeQuotation) {
      return { activeQuotation: null, allQuotations: [] };
    }

    const orgId = activeQuotation.organization_id;
    const customerId = activeQuotation.customer_id;
    const allOrgQuotes = await this.getQuotations(orgId, { customerId });

    // Filter quotes for this customer, excluding drafts
    const customerQuotes = allOrgQuotes
      .filter((q) => q.customer_id === customerId && q.status !== 'DRAFT' && q.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Make sure active quotation is present in customerQuotes
    if (!customerQuotes.some((q) => q.id === activeQuotation.id)) {
      customerQuotes.unshift(activeQuotation);
    }

    return {
      activeQuotation,
      allQuotations: customerQuotes,
    };
  }

  // --- INVOICES CRUD MODULE ---
  public async getInvoices(
    orgId: string = DEFAULT_ORG_ID,
    filters?: { status?: string; search?: string; customerId?: string }
  ): Promise<Invoice[]> {
    // 0. Ensure quotations are loaded so auto-sync sees approved/completed paid quotes
    if (this.quotations.size === 0) {
      await this.getQuotations(orgId);
    }

    // 1. Load from Supabase templates
    await this.loadInvoicesFromSupabase(orgId);

    // 2. Also check file invoices fallback
    const saved = this.loadInvoicesFromFile();
    for (const inv of saved) {
      if (!this.invoices.has(inv.id)) {
        this.invoices.set(inv.id, inv);
        if (inv.items) {
          this.invoiceItems.set(inv.id, inv.items);
        }
      }
    }

    // 3. Auto-sync approved & paid quotes for this org into invoices
    const quotes = Array.from(this.quotations.values()).filter(
      (q) =>
        q.organization_id === orgId &&
        (q.status === 'APPROVED' || q.status === 'PAYMENT_COMPLETED' || q.status === 'COMPLETED') &&
        Boolean(q.is_paid)
    );
    for (const q of quotes) {
      const hasInv = Array.from(this.invoices.values()).some((inv) => inv.quotation_id === q.id);
      if (!hasInv) {
        try {
          await this.ensureInvoiceForQuotation(q);
        } catch {}
      }
    }

    let list = Array.from(this.invoices.values()).filter((inv) => inv.organization_id === orgId);

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((inv) => inv.status === filters.status);
    }

    if (filters?.customerId) {
      list = list.filter((inv) => inv.customer_id === filters.customerId);
    }

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      list = list.filter((inv) => {
        const cust = inv.customer || this.customers.get(inv.customer_id);
        return (
          inv.invoice_number.toLowerCase().includes(s) ||
          (inv.po_number && inv.po_number.toLowerCase().includes(s)) ||
          (cust && (cust.name.toLowerCase().includes(s) || (cust.company_name && cust.company_name.toLowerCase().includes(s))))
        );
      });
    }

    return list
      .map((inv) => ({
        ...inv,
        customer: inv.customer || this.customers.get(inv.customer_id),
        organization: inv.organization || this.organizations.get(inv.organization_id),
        items: inv.items || this.invoiceItems.get(inv.id) || [],
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getInvoiceById(id: string, orgId: string = DEFAULT_ORG_ID): Promise<Invoice | null> {
    let inv = this.invoices.get(id);

    if (!inv) {
      await this.loadInvoicesFromSupabase(orgId);
      inv = this.invoices.get(id);
    }

    if (!inv) {
      const saved = this.loadInvoicesFromFile();
      for (const s of saved) {
        this.invoices.set(s.id, s);
        if (s.items) this.invoiceItems.set(s.id, s.items);
      }
      inv = this.invoices.get(id);
    }

    if (!inv) return null;

    return {
      ...inv,
      customer: inv.customer || this.customers.get(inv.customer_id),
      organization: inv.organization || (await this.getOrganization(inv.organization_id)) || this.organizations.get(inv.organization_id),
      items: inv.items || this.invoiceItems.get(inv.id) || [],
    };
  }

  public async ensureInvoiceForQuotation(
    quotation: Quotation,
    customInvoiceNumber?: string
  ): Promise<Invoice> {
    // 1. Check in-memory map
    const existing = Array.from(this.invoices.values()).find(
      (inv) => inv.quotation_id === quotation.id
    );
    if (existing) {
      return existing;
    }

    // 2. Check Supabase templates
    const loaded = await this.loadInvoicesFromSupabase(quotation.organization_id);
    const existingInDb = loaded.find((inv) => inv.quotation_id === quotation.id);
    if (existingInDb) {
      return existingInDb;
    }

    const org = await this.getOrganization(quotation.organization_id);
    const requireFullPayment = org?.require_full_payment_for_invoice ?? true;
    if (requireFullPayment && !quotation.is_paid) {
      return null as any;
    }

    // 3. Create fresh invoice from quote
    const invoiceNumber =
      customInvoiceNumber || `INV-${quotation.quotation_number.replace(/^Q-/, '')}`;
    const invoiceItems = (quotation.items || []).map((item, idx) => ({
      product_id: item.product_id || null,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || 'unit',
      unit_price: item.unit_price,
      discount_type: item.discount_type || 'PERCENTAGE',
      discount_value: item.discount_value || 0,
      discount_amount: item.discount_amount || 0,
      tax_rate: item.tax_rate || 0,
      tax_amount: item.tax_amount || 0,
      line_total: item.line_total || 0,
      sort_order: idx + 1,
      item_type: item.item_type || 'GOODS',
      classification_type: item.classification_type || null,
      classification_code: item.classification_code || null,
      cgst_rate: item.cgst_rate,
      cgst_amount: item.cgst_amount,
      sgst_rate: item.sgst_rate,
      sgst_amount: item.sgst_amount,
      igst_rate: item.igst_rate,
      igst_amount: item.igst_amount,
      tax_category: item.tax_category || null,
    }));

    const status: InvoiceStatus = quotation.is_paid ? 'PAID' : 'ISSUED';

    const invoice = await this.createInvoice({
      organization_id: quotation.organization_id,
      customer_id: quotation.customer_id,
      quotation_id: quotation.id,
      invoice_number: invoiceNumber,
      status,
      issue_date: quotation.issue_date || new Date().toISOString().split('T')[0],
      due_date: quotation.valid_until || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      currency: quotation.currency,
      discount_type: quotation.discount_type,
      discount_value: quotation.discount_value,
      tax_rate: quotation.tax_rate,
      notes: 'Thank you for your business. Please remit payment according to the agreed terms.',
      terms_conditions: [
        '1. Payment is due within agreed terms from the date of invoice.',
        '2. Please quote the invoice number when making remittance.',
        '3. Overdue payments may be subject to interest as permitted by applicable law.',
        '4. Goods/services provided in accordance with approved scope are non-refundable.',
      ].join('\n'),
      payment_terms: 'Net 30 Days',
      items: invoiceItems,
      attachments: (quotation.attachments || []) as any,
      paid_amount: quotation.paid_amount,
      balance_amount: quotation.balance_amount,
      payment_confirmed_by_company: quotation.payment_confirmed_by_company,
      payment_method: quotation.payment_method,
      payment_notes: quotation.payment_notes,
      paid_at: quotation.paid_at,
    });

    return invoice;
  }

  public async createInvoice(data: {
    organization_id?: string;
    customer_id: string;
    quotation_id?: string | null;
    invoice_number?: string;
    po_number?: string | null;
    status?: InvoiceStatus;
    issue_date: string;
    due_date: string;
    currency: any;
    notes?: string | null;
    terms_conditions?: string | null;
    payment_terms?: string | null;
    items: Array<any>;
    attachments?: AttachmentItem[];
    tax_breakdown?: any[];
    discount_type?: any;
    discount_value?: number;
    tax_rate?: number;
    created_by?: string;
    paid_amount?: number;
    balance_amount?: number;
    payment_confirmed_by_company?: boolean;
    payment_method?: string | null;
    payment_notes?: string | null;
    paid_at?: string | null;
  }): Promise<Invoice> {
    const orgId = data.organization_id || DEFAULT_ORG_ID;
    const invId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Auto generate invoice number if not provided
    let invoiceNumber = data.invoice_number;
    if (!invoiceNumber) {
      const count = this.invoices.size + 1;
      invoiceNumber = `INV-${String(count).padStart(6, '0')}`;
    }

    // If quotation_id is provided, check if an invoice already exists and update it to keep everything in sync
    if (data.quotation_id) {
      await this.loadInvoicesFromSupabase(orgId);
      const existing = Array.from(this.invoices.values()).find(
        (inv) => inv.quotation_id === data.quotation_id
      );
      if (existing) {
        return await this.updateInvoice(
          existing.id,
          {
            ...data,
            invoice_number: invoiceNumber || existing.invoice_number,
          },
          orgId
        );
      }
    }

    const calculated = calculateQuotationTotals({
      items: data.items,
      discount_type: data.discount_type || 'PERCENTAGE',
      discount_value: data.discount_value || 0,
      tax_rate: data.tax_rate || 0,
    });

    const invoiceItems: InvoiceItem[] = (data.items || []).map((item, idx) => ({
      id: item.id || `inv_item_${Date.now()}_${idx}`,
      invoice_id: invId,
      product_id: item.product_id || null,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'unit',
      unit_price: Number(item.unit_price) || 0,
      discount_type: item.discount_type || 'PERCENTAGE',
      discount_value: Number(item.discount_value) || 0,
      discount_amount: Number(item.discount_amount) || 0,
      tax_rate: Number(item.tax_rate) || 0,
      tax_amount: Number(item.tax_amount) || 0,
      line_total: Number(item.line_total) || 0,
      sort_order: idx + 1,
      item_type: item.item_type || 'GOODS',
      classification_type: item.classification_type || null,
      classification_code: item.classification_code || null,
      cgst_rate: item.cgst_rate,
      cgst_amount: item.cgst_amount,
      sgst_rate: item.sgst_rate,
      sgst_amount: item.sgst_amount,
      igst_rate: item.igst_rate,
      igst_amount: item.igst_amount,
      tax_category: item.tax_category || null,
      created_at: new Date().toISOString(),
    }));

    const status: InvoiceStatus = data.status || 'ISSUED';
    const isPaid = status === 'PAID';

    const defaultInvoiceTerms = [
      '1. Payment is due within agreed terms from the date of invoice.',
      '2. Please quote the invoice number when making remittance.',
      '3. Overdue payments may be subject to interest as permitted by applicable law.',
      '4. Goods/services provided in accordance with approved scope are non-refundable.',
    ].join('\n');
    const defaultInvoiceNotes = 'Thank you for your business. Please remit payment according to the agreed terms.';

    let resolvedTerms = data.terms_conditions;
    if (!resolvedTerms || resolvedTerms.includes('Quotation valid for 30 days') || resolvedTerms.includes('50% advance required')) {
      resolvedTerms = defaultInvoiceTerms;
    }
    let resolvedNotes = data.notes;
    if (!resolvedNotes || resolvedNotes.includes('Payment within 30 days of completion')) {
      resolvedNotes = defaultInvoiceNotes;
    }

    const newInvoice: Invoice = {
      id: invId,
      organization_id: orgId,
      customer_id: data.customer_id,
      quotation_id: data.quotation_id || null,
      invoice_number: invoiceNumber,
      po_number: data.po_number || null,
      status,
      issue_date: data.issue_date,
      due_date: data.due_date,
      currency: data.currency,
      subtotal: calculated.subtotal,
      discount_type: data.discount_type || 'PERCENTAGE',
      discount_value: data.discount_value || 0,
      discount_amount: calculated.discount_amount,
      tax_rate: data.tax_rate || calculated.tax_rate || 0,
      tax_amount: calculated.tax_amount,
      grand_total: calculated.grand_total,
      tax_breakdown: data.tax_breakdown || [],
      notes: resolvedNotes,
      terms_conditions: resolvedTerms,
      payment_terms: data.payment_terms || 'Net 30 Days',
      payment_method: data.payment_method ?? (isPaid ? 'BANK_TRANSFER' : null),
      is_paid: isPaid,
      paid_at: data.paid_at ?? (isPaid ? new Date().toISOString() : null),
      payment_notes: data.payment_notes ?? null,
      paid_amount: data.paid_amount !== undefined ? data.paid_amount : (isPaid ? calculated.grand_total : 0),
      balance_amount: data.balance_amount !== undefined ? data.balance_amount : (isPaid ? 0 : calculated.grand_total),
      payment_confirmed_by_company: data.payment_confirmed_by_company ?? isPaid,
      attachments: data.attachments || [],
      created_by: data.created_by || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: invoiceItems,
      audit_history: [
        {
          id: `inv_audit_${Date.now()}_0`,
          user_name: data.created_by || 'Admin User',
          user_role: 'ADMIN',
          action: 'CREATED',
          details: status === 'PAID' ? 'Invoice created as PAID' : 'Invoice created and issued',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    this.invoices.set(invId, newInvoice);
    this.invoiceItems.set(invId, invoiceItems);
    this.saveInvoicesToFile();
    await this.persistInvoiceToSupabase(newInvoice);

    const org = await this.getOrganization(orgId);
    const customer = this.customers.get(data.customer_id);

    return {
      ...newInvoice,
      organization: org || undefined,
      customer: customer || undefined,
    };
  }

  public async updateInvoice(
    id: string,
    data: Partial<Invoice>,
    orgId: string = DEFAULT_ORG_ID,
    actor?: { name?: string; role?: string }
  ): Promise<Invoice> {
    const inv = await this.getInvoiceById(id, orgId);
    if (!inv) throw new Error('Invoice not found');

    const now = new Date().toISOString();
    const existingAudit = inv.audit_history || [];
    let changeDetails = 'Invoice particulars and settings updated';
    if (data.status && data.status !== inv.status) {
      changeDetails = `Status updated from ${inv.status} to ${data.status}`;
    } else if (data.items) {
      changeDetails = `Line items and calculation rates updated (${data.items.length} items)`;
    } else if (data.payment_terms) {
      changeDetails = `Payment terms updated to: ${data.payment_terms}`;
    } else if (data.notes) {
      changeDetails = 'Invoice notes and terms updated';
    }

    const auditItem: InvoiceAuditEvent = {
      id: `inv_audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_name: actor?.name || inv.created_by || 'Admin User',
      user_role: actor?.role || 'ADMIN',
      action: 'UPDATED',
      details: changeDetails,
      timestamp: now,
    };

    const updated: Invoice = {
      ...inv,
      ...data,
      id,
      audit_history: [auditItem, ...existingAudit],
      updated_at: now,
    };

    if (data.items) {
      updated.items = data.items;
      this.invoiceItems.set(id, data.items);
    }

    this.invoices.set(id, updated);
    this.saveInvoicesToFile();
    await this.persistInvoiceToSupabase(updated);

    return updated;
  }

  public async updateInvoiceStatus(
    id: string,
    orgId: string = DEFAULT_ORG_ID,
    status: InvoiceStatus,
    paymentDetails?: { payment_method?: string; payment_notes?: string },
    actor?: { name?: string; role?: string }
  ): Promise<Invoice> {
    const inv = await this.getInvoiceById(id, orgId);
    if (!inv) throw new Error('Invoice not found');

    const now = new Date().toISOString();
    const isPaid = status === 'PAID';

    inv.status = status;
    inv.is_paid = isPaid;
    inv.paid_at = isPaid ? now : null;
    if (paymentDetails?.payment_method) {
      inv.payment_method = paymentDetails.payment_method as any;
    }
    if (paymentDetails?.payment_notes) {
      inv.payment_notes = paymentDetails.payment_notes;
    }
    inv.updated_at = now;

    const auditItem: InvoiceAuditEvent = {
      id: `inv_audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_name: actor?.name || 'Admin User',
      user_role: actor?.role || 'ADMIN',
      action: 'STATUS_CHANGED',
      details: `Invoice status changed to ${status}${isPaid ? ' (Payment recorded)' : ''}`,
      timestamp: now,
    };
    inv.audit_history = [auditItem, ...(inv.audit_history || [])];

    this.invoices.set(id, inv);
    this.saveInvoicesToFile();
    await this.persistInvoiceToSupabase(inv);

    return inv;
  }

  public async deleteInvoice(id: string, orgId: string = DEFAULT_ORG_ID): Promise<boolean> {
    this.invoices.delete(id);
    this.invoiceItems.delete(id);
    this.saveInvoicesToFile();

    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase.from('templates').delete().eq('name', `INVOICE:${id}`);
      }
    } catch {}

    return true;
  }

  // --- REJECTION WORKFLOW ---
  public async rejectQuotation(params: {
    token: string;
    reason: string;
    comments: string;
  }): Promise<Quotation> {
    const quote = await this.getQuotationByPublicToken(params.token);
    if (!quote) throw new Error('Quotation not found');

    if (quote.status === 'APPROVED') {
      throw new Error('An approved quotation cannot be rejected.');
    }

    const now = new Date().toISOString();
    const rawQuote = this.quotations.get(quote.id) || quote;
    rawQuote.status = 'REJECTED';
    rawQuote.rejected_at = now;
    rawQuote.rejection_reason = params.reason;
    rawQuote.rejection_comments = params.comments;
    rawQuote.updated_at = now;
    this.quotations.set(quote.id, rawQuote);

    // Log Audit Event
    this.logEvent(quote.organization_id, quote.id, 'CUSTOMER', 'REJECTED', {
      reason: params.reason,
      comments: params.comments,
    });

    // Create Notification
    this.createNotification(
      quote.organization_id,
      quote.id,
      `Quotation ${quote.quotation_number} Rejected`,
      `Customer rejected reason: "${params.reason}". Feedback: ${params.comments}`,
      'REJECTED'
    );

    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase
          .from('quotations')
          .update({
            status: 'REJECTED',
            rejected_at: now,
            rejection_reason: params.reason,
            rejection_comments: params.comments,
            updated_at: now,
          })
          .eq('id', quote.id);

        await supabase
          .from('quotation_events')
          .insert({
            organization_id: quote.organization_id,
            quotation_id: quote.id,
            actor_type: 'CUSTOMER',
            actor_name: quote.customer?.name || 'Customer',
            event_type: 'REJECTED',
            metadata: {
              reason: params.reason,
              comments: params.comments,
            },
            created_at: now,
          });
      }
    } catch (err) {
      console.error('Failed to sync rejection to Supabase:', err);
    }

    return {
      ...rawQuote,
      items: quote.items,
      customer: quote.customer,
      organization: quote.organization,
    };
  }

  // --- NOTIFICATIONS ---
  public async getNotifications(orgId: string = DEFAULT_ORG_ID): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async markNotificationRead(id: string): Promise<void> {
    const notif = this.notifications.get(id);
    if (notif) {
      notif.is_read = true;
      this.notifications.set(id, notif);
    }
  }

  public async markAllNotificationsRead(orgId: string = DEFAULT_ORG_ID): Promise<void> {
    for (const notif of this.notifications.values()) {
      if (notif.organization_id === orgId) {
        notif.is_read = true;
      }
    }
  }

  private createNotification(
    orgId: string,
    quotationId: string,
    title: string,
    message: string,
    type: 'VIEWED' | 'APPROVED' | 'REJECTED' | 'EXPIRING'
  ) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const notif: Notification = {
      id,
      organization_id: orgId,
      quotation_id: quotationId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.notifications.set(id, notif);
  }

  // --- VALIDITY DATE & CHAT HELPERS ---
  public isPastEndOfValidityDate(validUntil?: string | null): boolean {
    if (!validUntil) return false;
    const datePart = String(validUntil).split('T')[0];
    const parts = datePart.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const endOfDay = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      return Date.now() > endOfDay.getTime();
    }
    const d = new Date(validUntil);
    if (isNaN(d.getTime())) return false;
    d.setHours(23, 59, 59, 999);
    return Date.now() > d.getTime();
  }

  private computeChatStatsFromEvents(events: any[]): { chatCount: number; unreadChatCount: number } {
    if (!events || events.length === 0) return { chatCount: 0, unreadChatCount: 0 };
    const sorted = [...events].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let lastReadAt: string | null = null;
    const messages: Array<{ senderRole: string; createdAt: string }> = [];

    for (const ev of sorted) {
      if (ev.event_type === 'CHAT_MESSAGE') {
        const senderRole = ev.metadata?.sender_role || (ev.actor_type === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF');
        messages.push({ senderRole, createdAt: ev.created_at });
        if (senderRole === 'STAFF') {
          lastReadAt = ev.created_at;
        }
      } else if (ev.event_type === 'CHAT_READ') {
        lastReadAt = ev.created_at;
      }
    }

    const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    const unreadChatCount = messages.filter(
      (m) => m.senderRole === 'CUSTOMER' && new Date(m.createdAt).getTime() > lastReadTime
    ).length;

    return { chatCount: messages.length, unreadChatCount };
  }

  private mapEventsToChatMessages(events: any[]): QuotationChatMessage[] {
    if (!events || events.length === 0) return [];
    const sorted = [...events].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let lastStaffReadTime = 0;
    let lastCustomerReadTime = 0;

    for (const ev of sorted) {
      const t = new Date(ev.created_at).getTime();
      if (ev.event_type === 'CHAT_READ') {
        if (t > lastStaffReadTime) lastStaffReadTime = t;
      } else if (ev.event_type === 'CUSTOMER_CHAT_READ') {
        if (t > lastCustomerReadTime) lastCustomerReadTime = t;
      } else if (ev.event_type === 'CHAT_MESSAGE') {
        const role = ev.metadata?.sender_role || (ev.actor_type === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF');
        if (role === 'STAFF' && t > lastStaffReadTime) {
          lastStaffReadTime = t;
        } else if (role === 'CUSTOMER' && t > lastCustomerReadTime) {
          lastCustomerReadTime = t;
        }
      }
    }

    return sorted
      .filter((ev) => ev.event_type === 'CHAT_MESSAGE')
      .map((ev) => {
        const senderRole: 'CUSTOMER' | 'STAFF' =
          ev.metadata?.sender_role || (ev.actor_type === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF');
        const msgTime = new Date(ev.created_at).getTime();
        const isRead =
          senderRole === 'CUSTOMER'
            ? lastStaffReadTime >= msgTime && lastStaffReadTime > 0
            : lastCustomerReadTime >= msgTime && lastCustomerReadTime > 0;

        return {
          id: ev.id,
          quotation_id: ev.quotation_id,
          sender_role: senderRole,
          sender_name:
            ev.metadata?.sender_name ||
            ev.actor_name ||
            (senderRole === 'CUSTOMER' ? 'Customer' : 'Team'),
          message: ev.metadata?.message || '',
          created_at: ev.created_at,
          is_read: isRead,
          attachment: ev.metadata?.attachment || null,
        };
      });
  }

  public async getQuotationChatMessages(quotationId: string): Promise<QuotationChatMessage[]> {
    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('quotation_events')
          .select('*')
          .eq('quotation_id', quotationId)
          .in('event_type', ['CHAT_MESSAGE', 'CHAT_READ', 'CUSTOMER_CHAT_READ'])
          .order('created_at', { ascending: true });

        if (!error && data) {
          return this.mapEventsToChatMessages(data);
        }
      }
    } catch (err) {
      console.warn('Error fetching chat messages from Supabase:', err);
    }

    const localEvents = (this.events.get(quotationId) || []).filter((ev) =>
      ['CHAT_MESSAGE', 'CHAT_READ', 'CUSTOMER_CHAT_READ'].includes(ev.event_type)
    );
    return this.mapEventsToChatMessages(localEvents);
  }

  public async addQuotationChatMessage(params: {
    quotationId: string;
    organizationId: string;
    senderRole: 'CUSTOMER' | 'STAFF';
    senderName: string;
    message: string;
    attachment?: ChatAttachment | null;
  }): Promise<QuotationChatMessage> {
    const now = new Date().toISOString();
    const trimmedMessage = params.message.trim();
    const eventId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const list = this.events.get(params.quotationId) || [];
    const localEvt: QuotationEvent = {
      id: eventId,
      organization_id: params.organizationId,
      quotation_id: params.quotationId,
      actor_type: params.senderRole === 'CUSTOMER' ? 'CUSTOMER' : 'USER',
      actor_name: params.senderName,
      event_type: 'CHAT_MESSAGE',
      metadata: {
        sender_role: params.senderRole,
        sender_name: params.senderName,
        message: trimmedMessage,
        attachment: params.attachment || null,
      },
      created_at: now,
    };
    list.push(localEvt);
    this.events.set(params.quotationId, list);

    const existingQuote = this.quotations.get(params.quotationId);
    if (existingQuote) {
      existingQuote.chat_count = (existingQuote.chat_count || 0) + 1;
      if (params.senderRole === 'CUSTOMER') {
        existingQuote.unread_chat_count = (existingQuote.unread_chat_count || 0) + 1;
        existingQuote.has_unread_chat = true;
      } else {
        existingQuote.unread_chat_count = 0;
        existingQuote.has_unread_chat = false;
      }
      this.quotations.set(params.quotationId, existingQuote);
    }

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data } = await supabase
          .from('quotation_events')
          .insert({
            organization_id: params.organizationId,
            quotation_id: params.quotationId,
            actor_type: params.senderRole === 'CUSTOMER' ? 'CUSTOMER' : 'USER',
            actor_name: params.senderName,
            event_type: 'CHAT_MESSAGE',
            metadata: {
              sender_role: params.senderRole,
              sender_name: params.senderName,
              message: trimmedMessage,
              attachment: params.attachment || null,
            },
            created_at: now,
          })
          .select('*')
          .maybeSingle();

        if (data?.id) {
          return {
            id: data.id,
            quotation_id: params.quotationId,
            sender_role: params.senderRole,
            sender_name: params.senderName,
            message: trimmedMessage,
            created_at: data.created_at || now,
            is_read: false,
            attachment: params.attachment || null,
          };
        }
      }
    } catch (err) {
      console.warn('Error saving chat message to Supabase:', err);
    }

    return {
      id: eventId,
      quotation_id: params.quotationId,
      sender_role: params.senderRole,
      sender_name: params.senderName,
      message: trimmedMessage,
      created_at: now,
      is_read: false,
      attachment: params.attachment || null,
    };
  }

  public async markQuotationChatRead(
    quotationId: string,
    organizationId: string,
    readerName: string = 'Staff'
  ): Promise<void> {
    const now = new Date().toISOString();

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: events } = await supabase
          .from('quotation_events')
          .select('actor_type, event_type, metadata, created_at')
          .eq('quotation_id', quotationId)
          .in('event_type', ['CHAT_MESSAGE', 'CHAT_READ'])
          .order('created_at', { ascending: true });

        const stats = this.computeChatStatsFromEvents(events || []);
        if (stats.unreadChatCount > 0) {
          await supabase.from('quotation_events').insert({
            organization_id: organizationId,
            quotation_id: quotationId,
            actor_type: 'USER',
            actor_name: readerName,
            event_type: 'CHAT_READ',
            metadata: { read_by: readerName, read_at: now },
            created_at: now,
          });
        }
      }
    } catch (err) {
      console.warn('Error marking quotation chat read in Supabase:', err);
    }

    const list = this.events.get(quotationId) || [];
    list.push({
      id: `chat_read_${Date.now()}`,
      organization_id: organizationId,
      quotation_id: quotationId,
      actor_type: 'USER',
      actor_name: readerName,
      event_type: 'CHAT_READ',
      metadata: { read_by: readerName, read_at: now },
      created_at: now,
    });
    this.events.set(quotationId, list);

    const existingQuote = this.quotations.get(quotationId);
    if (existingQuote) {
      existingQuote.unread_chat_count = 0;
      existingQuote.has_unread_chat = false;
      this.quotations.set(quotationId, existingQuote);
    }
  }

  public async markCustomerChatRead(
    quotationId: string,
    organizationId: string,
    customerName: string = 'Customer'
  ): Promise<void> {
    const now = new Date().toISOString();

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: events } = await supabase
          .from('quotation_events')
          .select('*')
          .eq('quotation_id', quotationId)
          .in('event_type', ['CHAT_MESSAGE', 'CHAT_READ', 'CUSTOMER_CHAT_READ'])
          .order('created_at', { ascending: true });

        const msgs = this.mapEventsToChatMessages(events || []);
        const unreadStaffMsgs = msgs.filter((m) => m.sender_role === 'STAFF' && !m.is_read);

        if (unreadStaffMsgs.length > 0) {
          await supabase.from('quotation_events').insert({
            organization_id: organizationId,
            quotation_id: quotationId,
            actor_type: 'CUSTOMER',
            actor_name: customerName,
            event_type: 'CUSTOMER_CHAT_READ',
            metadata: { read_by: customerName, read_at: now },
            created_at: now,
          });
        }
      }
    } catch (err) {
      console.warn('Error marking customer chat read in Supabase:', err);
    }

    const list = this.events.get(quotationId) || [];
    list.push({
      id: `cust_chat_read_${Date.now()}`,
      organization_id: organizationId,
      quotation_id: quotationId,
      actor_type: 'CUSTOMER',
      actor_name: customerName,
      event_type: 'CUSTOMER_CHAT_READ',
      metadata: { read_by: customerName, read_at: now },
      created_at: now,
    });
    this.events.set(quotationId, list);
  }

  // --- AUDIT LOG EVENT HELPER ---
  private logEvent(
    orgId: string,
    quotationId: string,
    actorType: 'USER' | 'CUSTOMER' | 'SYSTEM',
    eventType: string,
    metadata: Record<string, any>
  ) {
    const list = this.events.get(quotationId) || [];
    const event: QuotationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organization_id: orgId,
      quotation_id: quotationId,
      actor_type: actorType,
      actor_name: actorType === 'CUSTOMER' ? 'Customer' : 'Business User',
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString(),
    };
    list.push(event);
    this.events.set(quotationId, list);
  }

  // --- ANALYTICS ---
  public async getDashboardAnalytics(orgId: string = DEFAULT_ORG_ID) {
    const quotes = await this.getQuotations(orgId);

    const totalCount = quotes.length;
    const draftCount = quotes.filter((q) => q.status === 'DRAFT').length;
    const pendingCount = quotes.filter((q) => ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status)).length;
    const approvedCount = quotes.filter((q) => q.status === 'APPROVED').length;
    const rejectedCount = quotes.filter((q) => q.status === 'REJECTED').length;
    const expiredCount = quotes.filter((q) => q.status === 'EXPIRED').length;

    const totalValue = quotes.reduce((sum, q) => sum + q.grand_total, 0);
    const approvedValue = quotes.filter((q) => q.status === 'APPROVED').reduce((sum, q) => sum + q.grand_total, 0);
    const pendingValue = quotes
      .filter((q) => ['SENT', 'VIEWED', 'PENDING_APPROVAL'].includes(q.status))
      .reduce((sum, q) => sum + q.grand_total, 0);

    const totalViews = quotes.reduce((sum, q) => sum + (q.view_count || 0), 0);
    const winRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

    // Monthly chart data: computed dynamically for the last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyData = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const monthIdx = d.getMonth();

      const monthQuotes = quotes.filter((q) => {
        const qDate = new Date(q.created_at || q.issue_date);
        return qDate.getFullYear() === year && qDate.getMonth() === monthIdx;
      });

      const mTotal = monthQuotes.reduce((sum, q) => sum + q.grand_total, 0);
      const mApproved = monthQuotes.filter((q) => q.status === 'APPROVED').reduce((sum, q) => sum + q.grand_total, 0);

      monthlyData.push({
        month: mName,
        value: mTotal,
        approved: mApproved,
        count: monthQuotes.length,
      });
    }

    return {
      totalCount,
      draftCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      expiredCount,
      totalValue,
      approvedValue,
      pendingValue,
      totalViews,
      winRate,
      monthlyData,
    };
  }
}

// Global Singleton Instance
declare global {
  var __quoteflow_store__: QuoteFlowStore | undefined;
}

export const store: QuoteFlowStore = global.__quoteflow_store__ || new QuoteFlowStore();
if (process.env.NODE_ENV !== 'production') {
  global.__quoteflow_store__ = store;
}

export function getDataStore(): QuoteFlowStore {
  return store;
}
