-- Milestone 408: align product detail/download policy fields with the canonical product schema.
-- Additive only: existing products keep safe defaults and legacy purchase tables are untouched.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS download_limit INTEGER,
  ADD COLUMN IF NOT EXISTS download_expiry_seconds INTEGER;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_download_limit_check;

ALTER TABLE products
  ADD CONSTRAINT products_download_limit_check
  CHECK (download_limit IS NULL OR download_limit > 0);

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_download_expiry_seconds_check;

ALTER TABLE products
  ADD CONSTRAINT products_download_expiry_seconds_check
  CHECK (download_expiry_seconds IS NULL OR download_expiry_seconds > 0);
