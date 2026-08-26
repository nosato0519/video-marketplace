CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  buyer_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_reference TEXT,
  refund_reference TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount NUMERIC(18, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

CREATE UNIQUE INDEX IF NOT EXISTS orders_buyer_product_unique
  ON orders (buyer_id, product_id)
  WHERE status IN ('pending', 'paid');

CREATE TABLE IF NOT EXISTS video_entitlements (
  id BIGSERIAL PRIMARY KEY,
  buyer_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS video_entitlements_buyer_product_unique
  ON video_entitlements (buyer_id, product_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  order_id BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_unique
  ON payment_events (provider, event_id);
