-- Track seller overpayments caused by refunds after a payout has already been paid.
CREATE TABLE IF NOT EXISTS seller_earning_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_earning_id UUID NOT NULL UNIQUE REFERENCES seller_earnings(id) ON DELETE RESTRICT,
  currency CHAR(3) NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  amount_recovered NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_recovered >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount_recovered <= amount_due)
);

CREATE INDEX IF NOT EXISTS seller_earning_recoveries_seller_currency_idx
  ON seller_earning_recoveries(seller_id, currency);

CREATE TABLE IF NOT EXISTS seller_earning_recovery_offsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_id UUID NOT NULL REFERENCES seller_earning_recoveries(id) ON DELETE RESTRICT,
  seller_earning_id UUID NOT NULL REFERENCES seller_earnings(id) ON DELETE RESTRICT,
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recovery_id, seller_earning_id)
);

CREATE INDEX IF NOT EXISTS seller_earning_recovery_offsets_payout_idx
  ON seller_earning_recovery_offsets(payout_id);
CREATE INDEX IF NOT EXISTS seller_earning_recovery_offsets_earning_idx
  ON seller_earning_recovery_offsets(seller_earning_id);
