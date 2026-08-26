-- Milestone 321: establish the canonical payment ledger.
-- The migration is idempotent so deploy/replay is safe.

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  UNIQUE (order_id, provider),
  UNIQUE (provider, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_idx
  ON payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_order_created_idx
  ON payments(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payments_user_created_idx
  ON payments(user_id, created_at DESC);
