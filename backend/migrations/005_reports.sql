-- Milestone 90: user reports and moderation queue

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('product','user','media_asset','order')),
  resource_id UUID NOT NULL,
  reason_code TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_resource_idx ON reports(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at);
