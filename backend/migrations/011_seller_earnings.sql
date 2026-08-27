-- Milestone 375: seller earnings ledger
-- One immutable earning row per successful payment/order line.

CREATE TABLE IF NOT EXISTS seller_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('pending','available','paid','refunded','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  UNIQUE(order_id, product_id)
);

CREATE INDEX IF NOT EXISTS seller_earnings_seller_created_idx
  ON seller_earnings(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS seller_earnings_seller_status_idx
  ON seller_earnings(seller_id, status);
CREATE INDEX IF NOT EXISTS seller_earnings_order_idx
  ON seller_earnings(order_id);
