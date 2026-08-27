-- Milestone 403: align fresh-install canonical commerce columns with current buyer flows.
-- Additive only: existing values are preserved and legacy purchase tables are untouched.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS streaming_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS download_enabled BOOLEAN NOT NULL DEFAULT TRUE;
