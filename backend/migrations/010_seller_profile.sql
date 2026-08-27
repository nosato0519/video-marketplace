-- Milestone 373: seller profile and verification state
-- Keep identity in users; this table stores seller-specific onboarding data.

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  legal_name TEXT NOT NULL DEFAULT '',
  country_code CHAR(2),
  verification_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (verification_status IN ('not_started','submitted','under_review','verified','rejected')),
  verification_note TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seller_profiles_verification_status_idx
  ON seller_profiles(verification_status);
