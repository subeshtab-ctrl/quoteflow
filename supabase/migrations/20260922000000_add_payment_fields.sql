-- Add payment tracking fields to quotations table
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create index on payment status for fast querying & export
CREATE INDEX IF NOT EXISTS idx_quotations_is_paid ON quotations(organization_id, is_paid);
