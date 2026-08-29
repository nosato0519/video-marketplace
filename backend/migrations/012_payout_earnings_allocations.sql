-- Milestone 465: auditable payout-to-earnings allocations
-- Records exactly which seller-earnings rows are consumed by each payout.

CREATE TABLE IF NOT EXISTS payout_earnings_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE RESTRICT,
  seller_earning_id UUID NOT NULL REFERENCES seller_earnings(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payout_id, seller_earning_id)
);

CREATE INDEX IF NOT EXISTS payout_earnings_allocations_payout_idx
  ON payout_earnings_allocations(payout_id);
CREATE INDEX IF NOT EXISTS payout_earnings_allocations_earning_idx
  ON payout_earnings_allocations(seller_earning_id);

ALTER TABLE payout_earnings_allocations
  DROP CONSTRAINT IF EXISTS payout_earnings_allocations_amount_check;

ALTER TABLE payout_earnings_allocations
  ADD CONSTRAINT payout_earnings_allocations_amount_check CHECK (amount > 0);
