-- Milestone 321: reconcile the payment ledger with the earlier 006 migration.
--
-- 006_payment_ledger.sql is historical and may already have created `payments`.
-- Do not rely on CREATE TABLE IF NOT EXISTS to change its shape: PostgreSQL
-- correctly leaves an existing table untouched. Add the fields required by the
-- current payment model explicitly and backfill them from the canonical order.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE payments p
SET user_id = o.buyer_id
FROM orders o
WHERE p.order_id = o.id
  AND p.user_id IS NULL;

UPDATE payments
SET idempotency_key = provider || ':' || provider_payment_id
WHERE idempotency_key IS NULL
  AND provider_payment_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM payments WHERE user_id IS NULL) THEN
    RAISE EXCEPTION 'cannot finalize payments.user_id: an existing payment has no matching order buyer';
  END IF;

  IF EXISTS (SELECT 1 FROM payments WHERE idempotency_key IS NULL) THEN
    RAISE EXCEPTION 'cannot finalize payments.idempotency_key: provider payment identity is missing';
  END IF;
END $$;

ALTER TABLE payments
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_idempotency_idx
  ON payments(provider, idempotency_key);

CREATE INDEX IF NOT EXISTS payments_order_created_idx
  ON payments(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payments_user_created_idx
  ON payments(user_id, created_at DESC);
