-- ==============================================================================
-- QuoteFlow Production SaaS Database Schema & Seed Data
-- Complete Setup Script for Supabase Project: qykxxxayympfhbymmnnw
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS & CUSTOM TYPES
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM (
        'DRAFT', 
        'SENT', 
        'VIEWED', 
        'PENDING_APPROVAL', 
        'APPROVED', 
        'REJECTED', 
        'EXPIRED', 
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE actor_type AS ENUM ('USER', 'CUSTOMER', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE signature_type AS ENUM ('DRAWN', 'TYPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- 2.1 Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    business_type TEXT DEFAULT 'General',
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    gst_vat_number TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    postal_code TEXT,
    logo_url TEXT,
    brand_color TEXT DEFAULT '#4f46e5',
    default_currency TEXT DEFAULT 'INR',
    default_tax_rate NUMERIC(5, 2) DEFAULT 18.00,
    default_validity_days INT DEFAULT 30,
    quotation_prefix TEXT DEFAULT 'Q-',
    quotation_start_number INT DEFAULT 1,
    current_quotation_counter INT DEFAULT 0,
    default_terms TEXT DEFAULT '1. Quotation valid for 30 days.\n2. 50% advance required to commence work.\n3. Taxes applicable as per local regulations.',
    invoice_footer TEXT DEFAULT 'Thank you for your business!',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Organization Members (Multi-Tenant RBAC)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role DEFAULT 'STAFF' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- 2.4 Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    alternate_phone TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    postal_code TEXT,
    tax_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Products & Services
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    unit TEXT DEFAULT 'unit',
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 Quotations (Main Lifecycle Entity)
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    quotation_number TEXT NOT NULL,
    revision_number INT DEFAULT 1 NOT NULL,
    original_quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status quotation_status DEFAULT 'DRAFT' NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    currency TEXT DEFAULT 'INR' NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_type discount_type DEFAULT 'PERCENTAGE' NOT NULL,
    discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    terms_conditions TEXT,
    public_token TEXT UNIQUE NOT NULL,
    public_token_hash TEXT UNIQUE NOT NULL,
    public_token_expires_at TIMESTAMPTZ,
    is_token_revoked BOOLEAN DEFAULT false NOT NULL,
    view_count INT DEFAULT 0 NOT NULL,
    first_viewed_at TIMESTAMPTZ,
    last_viewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejection_comments TEXT,
    approved_document_hash TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_org_quotation_number UNIQUE (organization_id, quotation_number, revision_number)
);

-- 2.7 Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'unit' NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_type discount_type DEFAULT 'PERCENTAGE' NOT NULL,
    discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sort_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.8 Signatures
CREATE TABLE IF NOT EXISTS quotation_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_company TEXT,
    signature_data_url TEXT NOT NULL,
    signature_type signature_type DEFAULT 'DRAWN' NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    signed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    document_hash TEXT NOT NULL
);

-- 2.9 Views
CREATE TABLE IF NOT EXISTS quotation_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    viewed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.10 Events (Audit Trail)
CREATE TABLE IF NOT EXISTS quotation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    actor_type actor_type DEFAULT 'USER' NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.11 Attachments
CREATE TABLE IF NOT EXISTS quotation_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.12 Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.13 Templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    layout_style TEXT DEFAULT 'MODERN' NOT NULL,
    accent_color TEXT DEFAULT '#4f46e5',
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_token_hash ON quotations(public_token_hash);
CREATE INDEX IF NOT EXISTS idx_quotations_public_token ON quotations(public_token);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_items_qid ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_events_qid ON quotation_events(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_views_qid ON quotation_views(quotation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id, is_read);

-- ==============================================================================
-- 4. FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 4.1 Atomic sequential quotation numbering per organization
CREATE OR REPLACE FUNCTION get_next_quotation_number(target_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    org_record RECORD;
    next_num INT;
    formatted_no TEXT;
BEGIN
    SELECT quotation_prefix, quotation_start_number, current_quotation_counter
    INTO org_record
    FROM organizations
    WHERE id = target_org_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found: %', target_org_id;
    END IF;

    IF org_record.current_quotation_counter = 0 THEN
        next_num := org_record.quotation_start_number;
    ELSE
        next_num := org_record.current_quotation_counter + 1;
    END IF;

    UPDATE organizations
    SET current_quotation_counter = next_num,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_org_id;

    formatted_no := COALESCE(org_record.quotation_prefix, 'Q-') || LPAD(next_num::TEXT, 6, '0');
    RETURN formatted_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Auto updated_at timestamp trigger
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_organizations ON organizations;
CREATE TRIGGER set_timestamp_organizations
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_profiles ON profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_customers ON customers;
CREATE TRIGGER set_timestamp_customers
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_products ON products;
CREATE TRIGGER set_timestamp_products
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_quotations ON quotations;
CREATE TRIGGER set_timestamp_quotations
BEFORE UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 4.3 Supabase Auth Trigger: Auto create profile & org membership on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_org UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    ) ON CONFLICT (id) DO NOTHING;

    -- Add to demo organization as OWNER if exists
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = default_org) THEN
        INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
        VALUES (default_org, NEW.id, 'OWNER', true)
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Helper: Check if auth.uid() belongs to given organization
CREATE OR REPLACE FUNCTION is_member_of(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
          AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Check user role in organization
CREATE OR REPLACE FUNCTION get_user_role(target_org_id UUID)
RETURNS user_role AS $$
DECLARE
    user_r user_role;
BEGIN
    SELECT role INTO user_r FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND is_active = true;
    RETURN user_r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS POLICIES (DROP EXISTING THEN RECREATE TO PREVENT DUPLICATES)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations FOR SELECT TO authenticated USING (is_member_of(id));

DROP POLICY IF EXISTS "Owners and Admins can update organization" ON organizations;
CREATE POLICY "Owners and Admins can update organization" ON organizations FOR UPDATE TO authenticated USING (get_user_role(id) IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS "Users can view members of their organization" ON organization_members;
CREATE POLICY "Users can view members of their organization" ON organization_members FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Owners and Admins can manage members" ON organization_members;
CREATE POLICY "Owners and Admins can manage members" ON organization_members FOR ALL TO authenticated USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS "Users can view their organization customers" ON customers;
CREATE POLICY "Users can view their organization customers" ON customers FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can create customers" ON customers;
CREATE POLICY "Users can create customers" ON customers FOR INSERT TO authenticated WITH CHECK (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can update customers" ON customers;
CREATE POLICY "Users can update customers" ON customers FOR UPDATE TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Admins/Owners can delete customers" ON customers;
CREATE POLICY "Admins/Owners can delete customers" ON customers FOR DELETE TO authenticated USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS "Users can view organization products" ON products;
CREATE POLICY "Users can view organization products" ON products FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can manage products" ON products;
CREATE POLICY "Users can manage products" ON products FOR ALL TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can view organization quotations" ON quotations;
CREATE POLICY "Users can view organization quotations" ON quotations FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can insert quotations" ON quotations;
CREATE POLICY "Users can insert quotations" ON quotations FOR INSERT TO authenticated WITH CHECK (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can update quotations" ON quotations;
CREATE POLICY "Users can update quotations" ON quotations FOR UPDATE TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Owners/Admins can delete quotations" ON quotations;
CREATE POLICY "Owners/Admins can delete quotations" ON quotations FOR DELETE TO authenticated USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

DROP POLICY IF EXISTS "Users can view quotation items" ON quotation_items;
CREATE POLICY "Users can view quotation items" ON quotation_items FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_member_of(q.organization_id))
);

DROP POLICY IF EXISTS "Users can manage quotation items" ON quotation_items;
CREATE POLICY "Users can manage quotation items" ON quotation_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_member_of(q.organization_id))
);

DROP POLICY IF EXISTS "Users can view quotation signatures" ON quotation_signatures;
CREATE POLICY "Users can view quotation signatures" ON quotation_signatures FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_signatures.quotation_id AND is_member_of(q.organization_id))
);

DROP POLICY IF EXISTS "Users can view quotation views" ON quotation_views;
CREATE POLICY "Users can view quotation views" ON quotation_views FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_views.quotation_id AND is_member_of(q.organization_id))
);

DROP POLICY IF EXISTS "Users can view quotation events" ON quotation_events;
CREATE POLICY "Users can view quotation events" ON quotation_events FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can view quotation attachments" ON quotation_attachments;
CREATE POLICY "Users can view quotation attachments" ON quotation_attachments FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can manage quotation attachments" ON quotation_attachments;
CREATE POLICY "Users can manage quotation attachments" ON quotation_attachments FOR ALL TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can update notifications" ON notifications;
CREATE POLICY "Users can update notifications" ON notifications FOR UPDATE TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Users can view templates" ON templates;
CREATE POLICY "Users can view templates" ON templates FOR SELECT TO authenticated USING (is_member_of(organization_id));

DROP POLICY IF EXISTS "Admins/Owners can manage templates" ON templates;
CREATE POLICY "Admins/Owners can manage templates" ON templates FOR ALL TO authenticated USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

-- ==============================================================================
-- 6. SEED DATA
-- ==============================================================================
DO $$
DECLARE
    demo_org_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    demo_cust_1 UUID := 'b0000000-0000-0000-0000-000000000001'::uuid;
    demo_cust_2 UUID := 'b0000000-0000-0000-0000-000000000002'::uuid;
    demo_cust_3 UUID := 'b0000000-0000-0000-0000-000000000003'::uuid;
    demo_prod_1 UUID := 'c0000000-0000-0000-0000-000000000001'::uuid;
    demo_prod_2 UUID := 'c0000000-0000-0000-0000-000000000002'::uuid;
    demo_prod_3 UUID := 'c0000000-0000-0000-0000-000000000003'::uuid;
    demo_prod_4 UUID := 'c0000000-0000-0000-0000-000000000004'::uuid;
    
    quote_1 UUID := 'd0000000-0000-0000-0000-000000000001'::uuid;
    quote_2 UUID := 'd0000000-0000-0000-0000-000000000002'::uuid;
    quote_3 UUID := 'd0000000-0000-0000-0000-000000000003'::uuid;
    quote_4 UUID := 'd0000000-0000-0000-0000-000000000004'::uuid;
BEGIN
    -- 6.1 Insert Demo Organization
    INSERT INTO organizations (
        id, name, slug, business_type, email, phone, website, gst_vat_number,
        address_line1, city, state, country, postal_code, brand_color,
        default_currency, default_tax_rate, quotation_prefix, quotation_start_number, current_quotation_counter
    ) VALUES (
        demo_org_id, 'Apex Technologies India', 'apex-tech', 'IT Services & Software',
        'contact@apextechnologies.io', '+91 98765 43210', 'https://apextechnologies.io', '29ABCDE1234F1Z5',
        'Tower B, 4th Floor, Tech Park, Indiranagar', 'Bengaluru', 'Karnataka', 'India', '560038', '#4f46e5',
        'INR', 18.00, 'Q-', 1, 4
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        current_quotation_counter = GREATEST(organizations.current_quotation_counter, EXCLUDED.current_quotation_counter);

    -- 6.2 Insert Customers
    INSERT INTO customers (id, organization_id, name, company_name, email, phone, city, state, country, tax_number)
    VALUES 
    (demo_cust_1, demo_org_id, 'Rajesh Sharma', 'ABC Private Limited', 'rajesh@abc.example.com', '+91 98111 22233', 'Mumbai', 'Maharashtra', 'India', '27AABCA1122B1Z8'),
    (demo_cust_2, demo_org_id, 'John Mathew', 'JM Architect Studio', 'john@mathew.example.com', '+91 98222 33344', 'Kochi', 'Kerala', 'India', '32AAAJM9988C1Z2'),
    (demo_cust_3, demo_org_id, 'Priya Sen', 'XYZ Technologies', 'priya@xyztech.example.com', '+91 98333 44455', 'Pune', 'Maharashtra', 'India', '27AAACX5544D1Z0')
    ON CONFLICT (id) DO NOTHING;

    -- 6.3 Insert Products
    INSERT INTO products (id, organization_id, name, sku, description, unit_price, unit, tax_rate, is_active)
    VALUES 
    (demo_prod_1, demo_org_id, 'Cloud Architecture Consulting', 'SRV-CONSULT', 'Advisory & cloud architecture assessment', 25000.00, 'days', 18.00, true),
    (demo_prod_2, demo_org_id, 'Hardware & Server Installation', 'SRV-INSTALL', 'On-premise / rack server deployment & setup', 12000.00, 'units', 18.00, true),
    (demo_prod_3, demo_org_id, 'Enterprise Software License', 'LIC-ENT-01', 'Annual license for SaaS platform (up to 50 users)', 65000.00, 'licenses', 18.00, true),
    (demo_prod_4, demo_org_id, 'Annual Maintenance Contract (AMC)', 'AMC-GOLD', '24/7 priority support and quarterly maintenance', 30000.00, 'year', 18.00, true)
    ON CONFLICT (id) DO NOTHING;

    -- 6.4 Quotation 1: Draft
    INSERT INTO quotations (
        id, organization_id, customer_id, quotation_number, revision_number, title, status,
        issue_date, valid_until, currency, subtotal, discount_type, discount_value, discount_amount,
        tax_rate, tax_amount, grand_total, notes, terms_conditions,
        public_token, public_token_hash
    ) VALUES (
        quote_1, demo_org_id, demo_cust_1, 'Q-000001', 1, 'Cloud Infrastructure Setup & Migration', 'DRAFT',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'INR', 50000.00, 'PERCENTAGE', 10.00, 5000.00,
        18.00, 8100.00, 53100.00, 'Initial draft for client review.', 'Standard 30 days payment term.',
        'tok_draft_demo_0001', encode(digest('tok_draft_demo_0001', 'sha256'), 'hex')
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit, unit_price, tax_rate, tax_amount, line_total, sort_order)
    VALUES 
    (quote_1, demo_prod_1, 'Cloud Architecture Consulting (2 Days)', 2, 'days', 25000.00, 18.00, 9000.00, 50000.00, 0)
    ON CONFLICT (id) DO NOTHING;

    -- 6.5 Quotation 2: Sent (Public Customer Approval Link Ready)
    INSERT INTO quotations (
        id, organization_id, customer_id, quotation_number, revision_number, title, status,
        issue_date, valid_until, currency, subtotal, discount_type, discount_value, discount_amount,
        tax_rate, tax_amount, grand_total, notes, terms_conditions,
        public_token, public_token_hash, view_count
    ) VALUES (
        quote_2, demo_org_id, demo_cust_2, 'Q-000002', 1, 'Enterprise Software & Deployment', 'SENT',
        CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'INR', 77000.00, 'FIXED', 2000.00, 2000.00,
        18.00, 13500.00, 88500.00, 'Special introductory bundle rate.', 'Valid for 14 calendar days.',
        'demo_token_sent_q002', encode(digest('demo_token_sent_q002', 'sha256'), 'hex'), 0
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit, unit_price, tax_rate, tax_amount, line_total, sort_order)
    VALUES 
    (quote_2, demo_prod_3, 'Enterprise Software License (1 Year)', 1, 'licenses', 65000.00, 18.00, 11700.00, 65000.00, 0),
    (quote_2, demo_prod_2, 'Server Setup & Config', 1, 'units', 12000.00, 18.00, 2160.00, 12000.00, 1)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_events (organization_id, quotation_id, actor_type, event_type, metadata)
    VALUES (demo_org_id, quote_2, 'USER', 'SENT', '{"method": "email", "recipient": "john@mathew.example.com"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 6.6 Quotation 3: Approved (Signed & Hashed)
    INSERT INTO quotations (
        id, organization_id, customer_id, quotation_number, revision_number, title, status,
        issue_date, valid_until, currency, subtotal, discount_type, discount_value, discount_amount,
        tax_rate, tax_amount, grand_total, notes, terms_conditions,
        public_token, public_token_hash, view_count, approved_at, approved_document_hash
    ) VALUES (
        quote_3, demo_org_id, demo_cust_3, 'Q-000003', 1, 'Annual Maintenance & Support Contract', 'APPROVED',
        CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'INR', 30000.00, 'PERCENTAGE', 0.00, 0.00,
        18.00, 5400.00, 35400.00, 'Includes 24/7 on-call engineering assistance.', 'Payment due on receipt.',
        'demo_token_approved_q003', encode(digest('demo_token_approved_q003', 'sha256'), 'hex'), 3,
        CURRENT_DATE - INTERVAL '2 days', 'sha256_mock_hash_approved_doc_3'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit, unit_price, tax_rate, tax_amount, line_total, sort_order)
    VALUES 
    (quote_3, demo_prod_4, 'Annual Maintenance Contract (AMC)', 1, 'year', 30000.00, 18.00, 5400.00, 30000.00, 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_signatures (
        quotation_id, signer_name, signer_email, signer_company, signature_data_url, signature_type, document_hash
    ) VALUES (
        quote_3, 'Priya Sen', 'priya@xyztech.example.com', 'XYZ Technologies',
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50"><text x="10" y="35" font-family="cursive" font-size="24">Priya Sen</text></svg>',
        'TYPED', 'sha256_mock_hash_approved_doc_3'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_events (organization_id, quotation_id, actor_type, event_type, metadata)
    VALUES 
    (demo_org_id, quote_3, 'USER', 'SENT', '{"method": "email"}'::jsonb),
    (demo_org_id, quote_3, 'CUSTOMER', 'VIEWED', '{"device": "desktop"}'::jsonb),
    (demo_org_id, quote_3, 'CUSTOMER', 'APPROVED', '{"signer": "Priya Sen", "email": "priya@xyztech.example.com"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 6.7 Quotation 4: Rejected
    INSERT INTO quotations (
        id, organization_id, customer_id, quotation_number, revision_number, title, status,
        issue_date, valid_until, currency, subtotal, discount_type, discount_value, discount_amount,
        tax_rate, tax_amount, grand_total, notes, terms_conditions,
        public_token, public_token_hash, view_count, rejected_at, rejection_reason, rejection_comments
    ) VALUES (
        quote_4, demo_org_id, demo_cust_1, 'Q-000004', 1, 'Hardware Upgrades & Installation', 'REJECTED',
        CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', 'INR', 36000.00, 'PERCENTAGE', 0.00, 0.00,
        18.00, 6480.00, 42480.00, 'Comprehensive server upgrade.', 'Terms apply.',
        'demo_token_rejected_q004', encode(digest('demo_token_rejected_q004', 'sha256'), 'hex'), 2,
        CURRENT_DATE - INTERVAL '1 day', 'Price too high', 'Budget for Q3 has been capped. Please offer an alternative or revise line items.'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit, unit_price, tax_rate, tax_amount, line_total, sort_order)
    VALUES 
    (quote_4, demo_prod_2, 'Hardware & Server Installation', 3, 'units', 12000.00, 18.00, 6480.00, 36000.00, 0)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO quotation_events (organization_id, quotation_id, actor_type, event_type, metadata)
    VALUES 
    (demo_org_id, quote_4, 'USER', 'SENT', '{"method": "email"}'::jsonb),
    (demo_org_id, quote_4, 'CUSTOMER', 'VIEWED', '{"device": "mobile"}'::jsonb),
    (demo_org_id, quote_4, 'CUSTOMER', 'REJECTED', '{"reason": "Price too high", "comments": "Budget for Q3 has been capped."}'::jsonb)
    ON CONFLICT DO NOTHING;

END $$;
