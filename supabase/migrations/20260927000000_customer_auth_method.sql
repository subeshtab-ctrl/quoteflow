-- Migration: Add client authentication method and separate country code
-- Date: 2026-09-27

ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'MOBILE';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+91';
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- Quotation signatures: support mobile signers
ALTER TABLE quotation_signatures ADD COLUMN IF NOT EXISTS signer_phone TEXT;
ALTER TABLE quotation_signatures ADD COLUMN IF NOT EXISTS phone_country_code TEXT;
ALTER TABLE quotation_signatures ALTER COLUMN signer_email DROP NOT NULL;
