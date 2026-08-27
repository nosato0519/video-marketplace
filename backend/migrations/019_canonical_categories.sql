-- Milestone 407: canonical product categories
--
-- The catalog read model already exposes an optional category slug, but the
-- canonical products schema did not yet provide the referenced table/column.
-- Keep category assignment nullable so existing products remain valid.

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (length(trim(slug)) > 0),
  CHECK (length(trim(name)) > 0)
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx
  ON products(category_id);
