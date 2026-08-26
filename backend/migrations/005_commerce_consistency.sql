-- Milestone 280: align commerce constraints with the canonical UUID order model.
-- This migration is additive: it does not delete legacy columns or tables.

ALTER TABLE orders
  ADD CONSTRAINT orders_total_nonnegative
  CHECK (amount >= 0);

ALTER TABLE entitlements
  ADD CONSTRAINT entitlements_order_buyer_consistency
  CHECK (status IN ('active', 'revoked'));

CREATE INDEX IF NOT EXISTS entitlements_user_created_idx
  ON entitlements(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS entitlements_product_status_idx
  ON entitlements(product_id, status);
