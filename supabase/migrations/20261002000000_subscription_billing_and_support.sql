-- ==============================================================================
-- QuoteFlow SaaS Subscription Billing, Razorpay Integration & Support System
-- Migration: 20261002000000_subscription_billing_and_support.sql
-- ==============================================================================

-- 1. SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    amount INTEGER NOT NULL DEFAULT 0, -- in paise (e.g. 19900 = ₹199)
    currency TEXT NOT NULL DEFAULT 'INR',
    billing_interval TEXT NOT NULL DEFAULT 'month',
    billing_interval_count INTEGER NOT NULL DEFAULT 1,
    trial_days INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_public BOOLEAN NOT NULL DEFAULT true,
    razorpay_plan_id TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROMOTIONS
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'FIXED',
    discount_value NUMERIC(10, 2) DEFAULT 0,
    promotional_price INTEGER NOT NULL DEFAULT 9900, -- in paise (₹99)
    currency TEXT NOT NULL DEFAULT 'INR',
    duration_months INTEGER NOT NULL DEFAULT 3,
    max_redemptions INTEGER,
    redemption_count INTEGER DEFAULT 0,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PROMOTION ASSIGNMENTS
CREATE TABLE IF NOT EXISTS promotion_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'eligible', -- eligible, redeemed, expired, revoked
    assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID,
    UNIQUE(promotion_id, business_id)
);

-- 4. BUSINESS SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'trialing', -- trialing, pending, active, past_due, grace_period, cancelled, expired, halted, failed
    provider TEXT NOT NULL DEFAULT 'razorpay',
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    razorpay_plan_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0, -- in paise
    currency TEXT NOT NULL DEFAULT 'INR',
    trial_start_at TIMESTAMPTZ,
    trial_end_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    next_charge_at TIMESTAMPTZ,
    promo_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
    promo_months_remaining INTEGER DEFAULT 0,
    promotional_cycles_completed INTEGER DEFAULT 0,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    grace_period_start_at TIMESTAMPTZ,
    grace_period_end_at TIMESTAMPTZ,
    last_payment_at TIMESTAMPTZ,
    last_payment_id TEXT,
    payment_failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. SUBSCRIPTION PAYMENTS
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES business_subscriptions(id) ON DELETE SET NULL,
    razorpay_payment_id TEXT NOT NULL,
    razorpay_subscription_id TEXT,
    razorpay_invoice_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0, -- in paise
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL, -- created, authorized, captured, failed, refunded
    payment_method TEXT,
    failure_reason TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. SUBSCRIPTION EVENTS (Idempotent Webhook Log)
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    razorpay_subscription_id TEXT,
    razorpay_payment_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN DEFAULT false,
    processing_error TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMPTZ
);

-- 7. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    category TEXT NOT NULL, -- Billing, Subscription, Quote, Invoice, Customer Portal, Payment, WhatsApp, Technical Issue, Bug Report, Feature Request, Other
    priority TEXT NOT NULL DEFAULT 'Normal', -- Low, Normal, High, Urgent
    status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, waiting_for_customer, resolved, closed
    description TEXT NOT NULL,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- 8. SUPPORT TICKET MESSAGES
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_user_id UUID,
    sender_type TEXT NOT NULL, -- business, developer, system
    sender_name TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. SUPPORT TICKET ATTACHMENTS
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    message_id UUID REFERENCES support_ticket_messages(id) ON DELETE SET NULL,
    uploaded_by_user_id UUID NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    admin_email TEXT,
    action TEXT NOT NULL, -- ASSIGN_PROMOTION, REVOKE_PROMOTION, CANCEL_SUBSCRIPTION, UPDATE_TICKET, CHANGE_SUBSCRIPTION_STATE
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM HIGH-SCALE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id ON business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_rzp_sub_id ON business_subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_sub_id ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_rzp_pay_id ON subscription_payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_id ON subscription_events(event_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_business_id ON support_tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_promotion_assignments_business_id ON promotion_assignments(business_id);
CREATE INDEX IF NOT EXISTS idx_promotion_assignments_promotion_id ON promotion_assignments(promotion_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. subscription_plans
CREATE POLICY "Public read active plans" ON subscription_plans
    FOR SELECT TO authenticated, anon USING (is_active = true);

-- 2. business_subscriptions
CREATE POLICY "Users view own business subscription" ON business_subscriptions
    FOR SELECT TO authenticated
    USING (
        business_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 3. subscription_payments
CREATE POLICY "Users view own business payments" ON subscription_payments
    FOR SELECT TO authenticated
    USING (
        business_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 4. promotions
CREATE POLICY "Public read active promotions" ON promotions
    FOR SELECT TO authenticated USING (is_active = true);

-- 5. promotion_assignments
CREATE POLICY "Users view own business promotion assignments" ON promotion_assignments
    FOR SELECT TO authenticated
    USING (
        business_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 6. support_tickets
CREATE POLICY "Users view and manage own business tickets" ON support_tickets
    FOR ALL TO authenticated
    USING (
        business_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- 7. support_ticket_messages
CREATE POLICY "Users view messages of own tickets" ON support_ticket_messages
    FOR ALL TO authenticated
    USING (
        ticket_id IN (
            SELECT st.id FROM support_tickets st
            JOIN organization_members om ON om.organization_id = st.business_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

-- 8. support_ticket_attachments
CREATE POLICY "Users view attachments of own tickets" ON support_ticket_attachments
    FOR ALL TO authenticated
    USING (
        ticket_id IN (
            SELECT st.id FROM support_tickets st
            JOIN organization_members om ON om.organization_id = st.business_id
            WHERE om.user_id = auth.uid() AND om.is_active = true
        )
    );

-- 9. admin_audit_logs & subscription_events: Service role and admin access only
-- (Default deny for normal public/authenticated users)

-- ==============================================================================
-- SEED INITIAL PLANS & PROMOTIONS
-- ==============================================================================
INSERT INTO subscription_plans (
    id, name, slug, description, amount, currency, billing_interval, billing_interval_count, trial_days, is_active, is_public
) VALUES 
(
    'e0000000-0000-0000-0000-000000000001',
    'QuoteFlow Free Trial',
    'free_trial',
    'Complete full-access 30-day free trial for new businesses.',
    0,
    'INR',
    'month',
    1,
    30,
    true,
    true
),
(
    'e0000000-0000-0000-0000-000000000002',
    'QuoteFlow Special Offer',
    'promo_99',
    'Promotional subscription at ₹99/month for the first 3 successful billing cycles, transitioning automatically to ₹199/month thereafter.',
    9900,
    'INR',
    'month',
    1,
    0,
    true,
    false
),
(
    'e0000000-0000-0000-0000-000000000003',
    'QuoteFlow Standard',
    'monthly_199',
    'Standard recurring monthly subscription with full access to estimates, quotes, invoicing, and client portal.',
    19900,
    'INR',
    'month',
    1,
    0,
    true,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    amount = EXCLUDED.amount,
    trial_days = EXCLUDED.trial_days;

-- Seed Welcome Promotion
INSERT INTO promotions (
    id, name, code, description, discount_type, discount_value, promotional_price, currency, duration_months, is_active
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    '₹99 for 3 Months Special Offer',
    'WELCOME99',
    'Exclusive introductory pricing: ₹99/month for 3 successful billing cycles, automatically transitioning to ₹199/month.',
    'FIXED',
    100.00,
    9900,
    'INR',
    3,
    true
)
ON CONFLICT (code) DO NOTHING;
