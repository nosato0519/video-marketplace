CREATE TABLE seller_payment_provider_settings (
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'configured',
  secret_env TEXT NOT NULL,
  configured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, provider_id),
  CHECK (status IN ('configured')),
  CHECK (currency IS NULL OR currency = UPPER(currency))
);

CREATE INDEX seller_payment_provider_settings_owner_idx
  ON seller_payment_provider_settings (owner_id);
