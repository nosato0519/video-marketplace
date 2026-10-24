-- Each recovery can be offset against the same earning over multiple payouts.
ALTER TABLE seller_earning_recovery_offsets
  DROP CONSTRAINT IF EXISTS seller_earning_recovery_offsets_recovery_id_seller_earning_id_key;

ALTER TABLE seller_earning_recovery_offsets
  ADD CONSTRAINT seller_earning_recovery_offsets_recovery_earning_payout_key
  UNIQUE (recovery_id, seller_earning_id, payout_id);
