-- Product thumbnail and gallery images attached to seller-created products.
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL UNIQUE REFERENCES media_assets(id) ON DELETE RESTRICT,
  image_role TEXT NOT NULL CHECK (image_role IN ('thumbnail', 'gallery')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, image_role, sort_order)
);

CREATE INDEX IF NOT EXISTS product_images_product_order_idx
  ON product_images(product_id, image_role, sort_order);
