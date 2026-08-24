-- Milestone 100: idempotent payment webhook event ledger

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','failed')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_code TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_idx
  ON payment_events(provider, event_id);

CREATE INDEX IF NOT EXISTS payment_events_payment_idx
  ON payment_events(provider, provider_payment_id);

CREATE INDEX IF NOT EXISTS payment_events_received_at_idx
  ON payment_events(received_at);
