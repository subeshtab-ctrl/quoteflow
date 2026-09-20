-- ==============================================================================
-- QuoteFlow SaaS Database Schema & Row-Level Security
-- Production-Ready Multi-Tenant Architecture
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUMS & DOMAINS
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

-- 2. ORGANIZATIONS (TENANTS)
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

-- 3. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORGANIZATION MEMBERS (Role-Based Access)
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

-- 5. CUSTOMERS
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

-- 6. PRODUCTS & SERVICES
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

-- 7. QUOTATIONS
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

-- 8. QUOTATION ITEMS
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

-- 9. QUOTATION SIGNATURES
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

-- 10. QUOTATION VIEWS
CREATE TABLE IF NOT EXISTS quotation_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    viewed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. QUOTATION EVENTS (AUDIT TRAIL)
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

-- 12. ATTACHMENTS
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

-- 13. NOTIFICATIONS
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

-- 14. TEMPLATES
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
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
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
-- DATABASE FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Atomic sequential quotation number generation per organization
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

-- Automatic updated_at timestamp trigger
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
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

-- PROFILES
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ORGANIZATIONS
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT TO authenticated
    USING (is_member_of(id));

CREATE POLICY "Owners and Admins can update organization" ON organizations
    FOR UPDATE TO authenticated
    USING (get_user_role(id) IN ('OWNER', 'ADMIN'));

-- ORGANIZATION MEMBERS
CREATE POLICY "Users can view members of their organization" ON organization_members
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Owners and Admins can manage members" ON organization_members
    FOR ALL TO authenticated
    USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

-- CUSTOMERS
CREATE POLICY "Users can view their organization customers" ON customers
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can create customers" ON customers
    FOR INSERT TO authenticated
    WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Users can update customers" ON customers
    FOR UPDATE TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Admins/Owners can delete customers" ON customers
    FOR DELETE TO authenticated
    USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

-- PRODUCTS
CREATE POLICY "Users can view organization products" ON products
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can manage products" ON products
    FOR ALL TO authenticated
    USING (is_member_of(organization_id));

-- QUOTATIONS
CREATE POLICY "Users can view organization quotations" ON quotations
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can insert quotations" ON quotations
    FOR INSERT TO authenticated
    WITH CHECK (is_member_of(organization_id));

CREATE POLICY "Users can update quotations" ON quotations
    FOR UPDATE TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Owners/Admins can delete quotations" ON quotations
    FOR DELETE TO authenticated
    USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));

-- QUOTATION ITEMS
CREATE POLICY "Users can view quotation items" ON quotation_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_items.quotation_id
              AND is_member_of(q.organization_id)
        )
    );

CREATE POLICY "Users can manage quotation items" ON quotation_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_items.quotation_id
              AND is_member_of(q.organization_id)
        )
    );

-- QUOTATION SIGNATURES, VIEWS, EVENTS
CREATE POLICY "Users can view quotation signatures" ON quotation_signatures
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_signatures.quotation_id
              AND is_member_of(q.organization_id)
        )
    );

CREATE POLICY "Users can view quotation views" ON quotation_views
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quotations q
            WHERE q.id = quotation_views.quotation_id
              AND is_member_of(q.organization_id)
        )
    );

CREATE POLICY "Users can view quotation events" ON quotation_events
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can view quotation attachments" ON quotation_attachments
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can manage quotation attachments" ON quotation_attachments
    FOR ALL TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can update notifications" ON notifications
    FOR UPDATE TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Users can view templates" ON templates
    FOR SELECT TO authenticated
    USING (is_member_of(organization_id));

CREATE POLICY "Admins/Owners can manage templates" ON templates
    FOR ALL TO authenticated
    USING (get_user_role(organization_id) IN ('OWNER', 'ADMIN'));
