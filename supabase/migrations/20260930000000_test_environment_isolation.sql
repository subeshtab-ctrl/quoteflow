-- ==============================================================================
-- QuoteFlow Migration: Test Mode Isolation Phase 2
-- Migration: 20260930000000_test_environment_isolation.sql
-- ==============================================================================

-- 1. Customers: Add environment and demo fields
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'live' CHECK (environment IN ('test', 'live')),
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS demo_pin TEXT;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_customers_environment ON customers(organization_id, environment);

-- 2. Update quotations environment default to 'live' for existing records without one
-- (new records get their environment from the mode at creation time — already handled in code)
UPDATE quotations SET environment = 'live' WHERE environment IS NULL;

-- 3. Templates (invoices) — ensure environment column exists 
-- (templates table stores invoices as JSON blobs)
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'live';

-- 4. Organizations: Add test_daily_quota field (for future server-side enforcement)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS test_daily_quota INT DEFAULT 20;

-- 5. RLS: Update quotations policy to be environment-aware
-- (allow members to view their org's quotations regardless of environment)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Members can view test environment quotations" ON quotations;
    CREATE POLICY "Members can view their org quotations by environment" ON quotations
        FOR SELECT
        USING (
            organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN undefined_function THEN null;
    WHEN undefined_object THEN null;
END $$;

-- 6. RLS for customers: members can access all customers in their org
DO $$ BEGIN
    DROP POLICY IF EXISTS "Members can manage customers" ON customers;
    CREATE POLICY "Members can manage customers" ON customers
        FOR ALL
        USING (
            organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN undefined_function THEN null;
    WHEN undefined_object THEN null;
END $$;

-- Done.
COMMENT ON COLUMN customers.environment IS 'test = sandbox demo customer; live = real customer. Demo customers are never surfaced in live customer lists.';
COMMENT ON COLUMN customers.is_demo IS 'Pre-seeded demo customer for training/testing. Will not appear in live customer lists or reports.';
COMMENT ON COLUMN customers.demo_pin IS 'Demo PIN for portal access during testing. Default: 1234.';
