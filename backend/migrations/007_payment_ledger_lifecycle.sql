-- Milestone 528: align the payment ledger with pending-to-settled lifecycle.
-- A payment row is created before the provider returns its payment identity, so
-- provider_payment_id must remain nullable until successful settlement.

ALTER TABLE payments
  ALTER COLUMN provider_payment_id DROP NOT NULL;
