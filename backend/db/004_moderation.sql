-- Moderation and rights foundation v0.1

CREATE TABLE content_reviews (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','changes_requested','blocked')),
  reason_code TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE content_reports (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE rights_declarations (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  seller_confirmed_rights BOOLEAN NOT NULL DEFAULT FALSE,
  seller_confirmed_consent BOOLEAN NOT NULL DEFAULT FALSE,
  seller_confirmed_prohibited_content BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_reference TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_reviews_product_status ON content_reviews(product_id, status, created_at DESC);
CREATE INDEX idx_reports_status_created ON content_reports(status, created_at DESC);
