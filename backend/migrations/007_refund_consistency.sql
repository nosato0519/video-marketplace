CREATE TABLE IF NOT EXISTS seller_earning_adjustments (
  id BIGSERIAL PRIMARY KEY,
  seller_earning_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  adjustment_type TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  reference TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (adjustment_type IN ('refund')),
  CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS seller_earning_adjustments_reference_unique
  ON seller_earning_adjustments (reference);

CREATE INDEX IF NOT EXISTS seller_earning_adjustments_earning_idx
  ON seller_earning_adjustments (seller_earning_id);
