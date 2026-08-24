-- Media and delivery foundation v0.1

CREATE TABLE media_assets (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('video','thumbnail','preview','subtitle')),
  storage_provider TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT CHECK (file_size_bytes >= 0),
  duration_seconds INTEGER CHECK (duration_seconds >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','blocked','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE media_variants (
  id UUID PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  width INTEGER,
  height INTEGER,
  bitrate_kbps INTEGER,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','blocked','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(media_asset_id, variant_key)
);

CREATE TABLE media_access_events (
  id UUID PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  user_id UUID REFERENCES users(id),
  order_item_id UUID REFERENCES order_items(id),
  action TEXT NOT NULL CHECK (action IN ('stream','download','preview')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_product_status ON media_assets(product_id, status);
CREATE INDEX idx_media_variants_asset_status ON media_variants(media_asset_id, status);
CREATE INDEX idx_media_access_user_created ON media_access_events(user_id, created_at DESC);
