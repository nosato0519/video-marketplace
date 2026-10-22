-- Keep the provider-hosted checkout session separate from the eventual payment intent.
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS checkout_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_checkout_session_idx
  ON payments(provider, checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
