-- Milestone 281: make commerce consistency migration idempotent.
-- This migration is additive and does not remove legacy commerce definitions.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'orders_total_nonnegative'
       AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_total_nonnegative
      CHECK (amount >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'entitlements_order_buyer_consistency'
       AND conrelid = 'entitlements'::regclass
  ) THEN
    ALTER TABLE entitlements
      ADD CONSTRAINT entitlements_order_buyer_consistency
      CHECK (status IN ('active', 'revoked'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS entitlements_user_created_idx
  ON entitlements(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS entitlements_product_status_idx
  ON entitlements(product_id, status);
