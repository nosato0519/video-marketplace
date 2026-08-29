-- Milestone 465: payout-to-earnings allocation ledger
-- Links each payout to the seller earnings it consumes, allowing a payout
-- to span multiple earnings rows or partially consume one earnings row.

CREATE TABLE IF NOT EXISTS payout_earnings_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts(id) ON DELETE RESTRICT,
  seller_earning_id UUID NOT NULL REFERENCES seller_earnings(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payout_id, seller_earning_id)
);

CREATE INDEX IF NOT EXISTS payout_allocations_payout_idx
  ON payout_earnings_allocations(payout_id);
CREATE INDEX IF NOT EXISTS payout_allocations_earning_idx
  ON payout_earnings_allocations(seller_earning_id);
