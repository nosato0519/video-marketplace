-- Milestone 375: allow seller verification review to use the full workflow.

ALTER TABLE seller_profiles
  DROP CONSTRAINT IF EXISTS seller_profiles_verification_status_check;

ALTER TABLE seller_profiles
  ADD CONSTRAINT seller_profiles_verification_status_check
  CHECK (verification_status IN ('not_started','submitted','under_review','request_changes','verified','rejected'));
