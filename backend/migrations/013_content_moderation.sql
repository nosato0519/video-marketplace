-- Milestone 392: canonical content moderation/report tables
--
-- The moderation application code uses content_reviews and content_reports.
-- Keep the older reports table from 005_reports.sql untouched as legacy data.

CREATE TABLE IF NOT EXISTS content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','changes_requested','blocked')),
  reason_code TEXT NOT NULL DEFAULT 'review',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS content_reviews_product_idx
  ON content_reviews(product_id);
CREATE INDEX IF NOT EXISTS content_reviews_status_idx
  ON content_reviews(status);
CREATE INDEX IF NOT EXISTS content_reviews_created_at_idx
  ON content_reviews(created_at);

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS content_reports_product_idx
  ON content_reports(product_id);
CREATE INDEX IF NOT EXISTS content_reports_reporter_idx
  ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS content_reports_status_idx
  ON content_reports(status);
CREATE INDEX IF NOT EXISTS content_reports_created_at_idx
  ON content_reports(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS content_reports_open_product_reporter_idx
  ON content_reports(product_id, reporter_id)
  WHERE status IN ('open','reviewing') AND reporter_id IS NOT NULL;
