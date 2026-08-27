-- Milestone 382: allow an explicit request-changes state for seller verification.
-- Rejected is retained as the final rejection state; request_changes is a recoverable correction state.
DO $$
BEGIN
  ALTER TABLE seller_profiles DROP CONSTRAINT IF EXISTS seller_profiles_verification_status_check;
  ALTER TABLE seller_profiles ADD CONSTRAINT seller_profiles_verification_status_check
    CHECK (verification_status IN ('not_started','submitted','under_review','verified','rejected','request_changes'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS seller_profiles_review_queue_idx
  ON seller_profiles(verification_status, submitted_at DESC);
