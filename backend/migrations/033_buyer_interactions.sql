CREATE TABLE IF NOT EXISTS user_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_product_created_idx
  ON user_favorites(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_cart_items (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS user_cart_items_product_created_idx
  ON user_cart_items(product_id, created_at DESC);
