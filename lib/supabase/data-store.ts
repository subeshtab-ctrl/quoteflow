import {
  Customer,
  Notification,
  Organization,
  Product,
  Quotation,
  QuotationEvent,
  QuotationItem,
  QuotationSignature,
  QuotationView,
} from '@/types/database';
import { calculateQuotationTotals } from '@/lib/quotations/calculations';
import { generateDocumentHash, generateSecureToken, hashToken } from '@/lib/quotations/tokens';
import { createAdminClient } from '@/lib/supabase/service-role';

// Default Demo Organization
const DEFAULT_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

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

  constructor() {
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
        name: 'My Company',
        slug: 'my-company',
        business_type: 'Services & Products',
        email: 'contact@example.com',
        brand_color: '#4f46e5',
        default_currency: 'INR',
        default_tax_rate: 18,
        default_validity_days: 30,
        quotation_prefix: 'Q-',
        quotation_start_number: 1,
        current_quotation_counter: 0,
        default_terms: '1. Quotation valid for 30 days.\n2. Payment terms as agreed.',
        invoice_footer: 'Thank you for your business!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  private seedInitialData() {
    // 1. Organization
    const demoOrg: Organization = {
      id: DEFAULT_ORG_ID,
      name: 'My Company',
      slug: 'my-company',
      business_type: 'Services & Products',
      email: 'contact@mycompany.com',
      phone: '+1 234 567 8900',
      website: '',
      gst_vat_number: '',
      address_line1: 'Business Center',
      city: 'Metropolis',
      state: 'State',
      country: 'USA',
      postal_code: '10001',
      brand_color: '#4f46e5',
      default_currency: 'USD',
      default_tax_rate: 0,
      default_validity_days: 30,
      quotation_prefix: 'Q-',
      quotation_start_number: 1,
      current_quotation_counter: 4,
      default_terms: '1. Quotation valid for 30 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.',
      invoice_footer: 'Thank you for your business!',
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
          this.organizations.set(data.id, data as Organization);
          return data as Organization;
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
      return cached;
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
    const updated: Organization = {
      ...org,
      ...data,
      invoice_footer: cleanFooter,
      updated_at: new Date().toISOString(),
    };
    this.organizations.set(orgId, updated);

    try {
      const supabase = createAdminClient();
      if (supabase) {
        const { data: saved, error } = await supabase
          .from('organizations')
          .upsert({
            ...updated,
            ...data,
            id: orgId,
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (error) {
          console.error('Supabase organization update error:', error);
        } else if (saved) {
          this.organizations.set(orgId, saved as Organization);
          return saved as Organization;
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

        if (filters?.status && filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }

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

          for (const q of data) {
            const existing = this.quotations.get(q.id);
            const merged: Quotation = {
              ...(existing || {}),
              ...q,
              is_paid: q.is_paid !== undefined && q.is_paid !== null ? Boolean(q.is_paid) : (existing?.is_paid ?? false),
              paid_at: q.paid_at !== undefined && q.paid_at !== null ? q.paid_at : (existing?.paid_at ?? null),
              payment_method: q.payment_method !== undefined && q.payment_method !== null ? q.payment_method : (existing?.payment_method ?? null),
              payment_notes: q.payment_notes !== undefined && q.payment_notes !== null ? q.payment_notes : (existing?.payment_notes ?? null),
            };
            this.quotations.set(q.id, merged);
            if (q.customer) {
              this.customers.set(q.customer.id, q.customer as Customer);
            }
            if (q.items) {
              this.quotationItems.set(q.id, q.items as QuotationItem[]);
            }
          }

          let results = data.map((q) => this.quotations.get(q.id) as Quotation);
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
          const merged: Quotation = {
            ...(existing || {}),
            ...data,
            is_paid: data.is_paid !== undefined && data.is_paid !== null ? Boolean(data.is_paid) : (existing?.is_paid ?? false),
            paid_at: data.paid_at !== undefined && data.paid_at !== null ? data.paid_at : (existing?.paid_at ?? null),
            payment_method: data.payment_method !== undefined && data.payment_method !== null ? data.payment_method : (existing?.payment_method ?? null),
            payment_notes: data.payment_notes !== undefined && data.payment_notes !== null ? data.payment_notes : (existing?.payment_notes ?? null),
          };
          this.quotations.set(data.id, merged);
          if (data.customer) {
            this.customers.set(data.customer.id, data.customer as Customer);
          }
          if (data.items) {
            this.quotationItems.set(data.id, data.items as QuotationItem[]);
          }

          // Fetch signature from Supabase
          const { data: sigData } = await supabase
            .from('quotation_signatures')
            .select('*')
            .eq('quotation_id', data.id)
            .order('signed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (sigData) {
            this.signatures.set(data.id, sigData as QuotationSignature);
          }

          // Fetch events from Supabase
          const { data: eventsData } = await supabase
            .from('quotation_events')
            .select('*')
            .eq('quotation_id', data.id)
            .order('created_at', { ascending: false });

          if (eventsData && eventsData.length > 0) {
            this.events.set(data.id, eventsData as QuotationEvent[]);
          }

          // Fetch views from Supabase
          const { data: viewsData } = await supabase
            .from('quotation_views')
            .select('*')
            .eq('quotation_id', data.id);

          if (viewsData && viewsData.length > 0) {
            this.views.set(data.id, viewsData as QuotationView[]);
          }

          return {
            ...data,
            organization: this.organizations.get(data.organization_id),
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

    return {
      ...quote,
      organization: this.organizations.get(quote.organization_id),
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
          this.quotations.set(data.id, data as Quotation);
          if (data.customer) {
            this.customers.set(data.customer.id, data.customer as Customer);
          }
          if (data.items) {
            this.quotationItems.set(data.id, data.items as QuotationItem[]);
          }

          // Fetch signature from Supabase
          const { data: sigData } = await supabase
            .from('quotation_signatures')
            .select('*')
            .eq('quotation_id', data.id)
            .order('signed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (sigData) {
            this.signatures.set(data.id, sigData as QuotationSignature);
          }

          return {
            ...data,
            organization: this.organizations.get(data.organization_id),
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

    return {
      ...quote,
      organization: this.organizations.get(quote.organization_id),
      customer: this.customers.get(quote.customer_id),
      items: (this.quotationItems.get(quote.id) || []).sort((a, b) => a.sort_order - b.sort_order),
      signature: this.signatures.get(quote.id) || null,
    };
  }

  public async createQuotation(data: {
    organization_id?: string;
    customer_id: string;
    title: string;
    issue_date: string;
    valid_until: string;
    currency: any;
    discount_type: any;
    discount_value: number;
    tax_rate: number;
    notes?: string;
    terms_conditions?: string;
    items: any[];
    status?: any;
  }): Promise<Quotation> {
    const orgId = data.organization_id || DEFAULT_ORG_ID;
    const org = await this.getOrganization(orgId);

    // Recalculate totals server-side
    const calculation = calculateQuotationTotals({
      items: data.items,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      tax_rate: data.tax_rate,
    });

    const quotationNumber = await this.generateNextQuotationNumber(orgId);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `d0000000-0000-0000-0000-${Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0')}`;
    const publicToken = generateSecureToken();
    const publicTokenHash = hashToken(publicToken);

    const newQuotation: Quotation = {
      id,
      organization_id: orgId,
      customer_id: data.customer_id,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.quotations.set(id, newQuotation);

    // Save items
    const savedItems: QuotationItem[] = calculation.items.map((item, idx) => ({
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
    }));
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
      customer: this.customers.get(data.customer_id),
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
      status?: any;
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

      newItems = calculation.items.map((item: any, idx: number) => ({
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
      }));
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
      status: data.status || existing.status,
      updated_at: new Date().toISOString(),
    };

    this.quotations.set(id, updated);

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
    meta: { ip?: string; userAgent?: string }
  ): Promise<{ quotation: Quotation; firstView: boolean }> {
    const quote = this.quotations.get(quotationId) || (await this.getQuotationById(quotationId));
    if (!quote) throw new Error('Quotation not found');

    const now = new Date().toISOString();
    const firstView = (quote.view_count || 0) === 0;

    quote.view_count = (quote.view_count || 0) + 1;
    if (!quote.first_viewed_at) {
      quote.first_viewed_at = now;
    }
    quote.last_viewed_at = now;

    // Transition SENT -> VIEWED
    if (quote.status === 'SENT') {
      quote.status = 'VIEWED';
    }

    quote.updated_at = now;
    this.quotations.set(quotationId, quote);

    // Record view log
    const viewList = this.views.get(quotationId) || [];
    viewList.push({
      id: `view_${Date.now()}`,
      quotation_id: quotationId,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
      viewed_at: now,
    });
    this.views.set(quotationId, viewList);

    // Audit Event
    this.logEvent(quote.organization_id, quotationId, 'CUSTOMER', 'VIEWED', {
      first_view: firstView,
      view_count: quote.view_count,
      user_agent: meta.userAgent,
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

    // Expiry Check
    const validUntilDate = new Date(quote.valid_until);
    if (validUntilDate.getTime() < new Date().setHours(0, 0, 0, 0)) {
      throw new Error(`This quotation expired on ${quote.valid_until}`);
    }

    if (quote.status === 'APPROVED') {
      throw new Error('This quotation has already been approved.');
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

  // --- PAYMENT WORKFLOW (PAID / UNPAID STATUS TRACKING) ---
  public async updateQuotationPayment(
    id: string,
    paymentData: {
      is_paid: boolean;
      paid_at?: string | null;
      payment_method?: string | null;
      payment_notes?: string | null;
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
    const paidAt = paymentData.is_paid
      ? (paymentData.paid_at || quote.paid_at || now)
      : null;

    quote.is_paid = paymentData.is_paid;
    quote.paid_at = paidAt;
    quote.payment_method = paymentData.is_paid ? (paymentData.payment_method ?? quote.payment_method ?? null) : null;
    quote.payment_notes = paymentData.is_paid ? (paymentData.payment_notes ?? quote.payment_notes ?? null) : null;
    quote.updated_at = now;

    this.quotations.set(id, quote);

    // Audit Log Event
    this.logEvent(
      quote.organization_id,
      id,
      'USER',
      paymentData.is_paid ? 'MARKED_PAID' : 'MARKED_UNPAID',
      {
        is_paid: quote.is_paid,
        paid_at: quote.paid_at,
        payment_method: quote.payment_method,
        payment_notes: quote.payment_notes,
      }
    );

    // Sync to Supabase
    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase
          .from('quotations')
          .update({
            is_paid: quote.is_paid,
            paid_at: quote.paid_at,
            payment_method: quote.payment_method,
            payment_notes: quote.payment_notes,
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
