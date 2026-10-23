-- Cumulative amounts are needed to distinguish partial refunds from full reversals.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0);
ALTER TABLE seller_earnings ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0);
