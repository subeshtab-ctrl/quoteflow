-- ==============================================================================
-- QuoteFlow Migration: Test Mode and Live Invoice Protection
-- Migration: 20260927000000_test_mode_and_invoice_protection.sql
-- ==============================================================================

-- 1. Organizations: Mode and separate test counters
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'test' CHECK (mode IN ('test', 'live')),
ADD COLUMN IF NOT EXISTS current_test_quotation_counter INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_test_invoice_counter INT DEFAULT 0;

-- 2. Quotations: Environment tracking
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'test' CHECK (environment IN ('test', 'live'));

-- 3. Invoices table (if table exists) - Add environment and cancellation columns
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'test' CHECK (environment IN ('test', 'live')),
        ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
        ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
        ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT;
    END IF;
END $$;

-- 4. Immutable Invoice Audit Logs Table
CREATE TABLE IF NOT EXISTS invoice_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_invoice_id ON invoice_audit_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_org_id ON invoice_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_environment ON quotations(organization_id, environment);

-- 5. Row-Level Security for invoice_audit_logs (Immutable & Append-Only)
ALTER TABLE invoice_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Members can view invoice audit logs" ON invoice_audit_logs;
    CREATE POLICY "Members can view invoice audit logs" ON invoice_audit_logs
        FOR SELECT
        USING (is_member_of(organization_id));
EXCEPTION
    WHEN undefined_function THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Members can insert invoice audit logs" ON invoice_audit_logs;
    CREATE POLICY "Members can insert invoice audit logs" ON invoice_audit_logs
        FOR INSERT
        WITH CHECK (is_member_of(organization_id));
EXCEPTION
    WHEN undefined_function THEN null;
END $$;

-- Explicitly NO UPDATE or DELETE policies on invoice_audit_logs ensures immutability!

-- 6. Live Invoice Delete Protection (if invoices table exists)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices') THEN
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Prevent delete of live invoices" ON invoices;
        CREATE POLICY "Prevent delete of live invoices" ON invoices
            FOR DELETE
            USING (
                environment = 'test' 
                AND is_member_of(organization_id) 
                AND get_user_role(organization_id) IN ('OWNER', 'ADMIN')
            );
    END IF;
EXCEPTION
    WHEN undefined_function THEN null;
END $$;
