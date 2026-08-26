-- Milestone 317: canonical payment ledger for provider settlement

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_id_idx
  ON payments(provider, provider_payment_id);

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
