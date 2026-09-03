-- Milestone 521: align canonical product schema with protected-media moderation reads.
-- Additive only: existing products remain published/unblocked by default.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS content_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_moderation_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_moderation_status_check
  CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'changes_requested', 'blocked'));

CREATE INDEX IF NOT EXISTS products_moderation_status_idx
  ON products(moderation_status);
