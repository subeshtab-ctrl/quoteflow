-- ==============================================================================
-- QuoteFlow Development Seed Data
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
    -- 1. Insert Demo Organization
    INSERT INTO organizations (
        id, name, slug, business_type, email, phone, website, gst_vat_number,
        address_line1, city, state, country, postal_code, brand_color,
        default_currency, default_tax_rate, quotation_prefix, quotation_start_number, current_quotation_counter
    ) VALUES (
        demo_org_id, 'Apex Technologies India', 'apex-tech', 'IT Services & Software',
        'contact@apextechnologies.io', '+91 98765 43210', 'https://apextechnologies.io', '29ABCDE1234F1Z5',
        'Tower B, 4th Floor, Tech Park, Indiranagar', 'Bengaluru', 'Karnataka', 'India', '560038', '#4f46e5',
        'INR', 18.00, 'Q-', 1, 4
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Customers
    INSERT INTO customers (id, organization_id, name, company_name, email, phone, city, state, country, tax_number)
    VALUES 
    (demo_cust_1, demo_org_id, 'Rajesh Sharma', 'ABC Private Limited', 'rajesh@abc.example.com', '+91 98111 22233', 'Mumbai', 'Maharashtra', 'India', '27AABCA1122B1Z8'),
    (demo_cust_2, demo_org_id, 'John Mathew', 'JM Architect Studio', 'john@mathew.example.com', '+91 98222 33344', 'Kochi', 'Kerala', 'India', '32AAAJM9988C1Z2'),
    (demo_cust_3, demo_org_id, 'Priya Sen', 'XYZ Technologies', 'priya@xyztech.example.com', '+91 98333 44455', 'Pune', 'Maharashtra', 'India', '27AAACX5544D1Z0')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Products
    INSERT INTO products (id, organization_id, name, sku, description, unit_price, unit, tax_rate, is_active)
    VALUES 
    (demo_prod_1, demo_org_id, 'Cloud Architecture Consulting', 'SRV-CONSULT', 'Advisory & cloud architecture assessment', 25000.00, 'days', 18.00, true),
    (demo_prod_2, demo_org_id, 'Hardware & Server Installation', 'SRV-INSTALL', 'On-premise / rack server deployment & setup', 12000.00, 'units', 18.00, true),
    (demo_prod_3, demo_org_id, 'Enterprise Software License', 'LIC-ENT-01', 'Annual license for SaaS platform (up to 50 users)', 65000.00, 'licenses', 18.00, true),
    (demo_prod_4, demo_org_id, 'Annual Maintenance Contract (AMC)', 'AMC-GOLD', '24/7 priority support and quarterly maintenance', 30000.00, 'year', 18.00, true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Quotation 1: Draft
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

    -- 5. Quotation 2: Sent (Public Approval Link Ready)
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
    VALUES (demo_org_id, quote_2, 'USER', 'SENT', '{"method": "email", "recipient": "john@mathew.example.com"}'::jsonb);

    -- 6. Quotation 3: Approved
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
    (demo_org_id, quote_3, 'CUSTOMER', 'APPROVED', '{"signer": "Priya Sen", "email": "priya@xyztech.example.com"}'::jsonb);

    -- 7. Quotation 4: Rejected
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
    (demo_org_id, quote_4, 'CUSTOMER', 'REJECTED', '{"reason": "Price too high", "comments": "Budget for Q3 has been capped."}'::jsonb);

END $$;
