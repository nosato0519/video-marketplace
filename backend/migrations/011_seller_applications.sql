-- Seller applications keep buyer identity unchanged until an admin approves the application.
CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','approved','rejected','withdrawn')),
  display_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  message TEXT,
  review_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_active_user_idx
  ON seller_applications(user_id)
  WHERE status IN ('pending','under_review');

CREATE INDEX IF NOT EXISTS seller_applications_status_idx
  ON seller_applications(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS seller_applications_user_idx
  ON seller_applications(user_id, created_at DESC);
