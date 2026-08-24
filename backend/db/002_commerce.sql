-- Commerce foundation v0.1

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending','paid','refunded','cancelled','disputed')),
  currency CHAR(3) NOT NULL,
  subtotal_amount NUMERIC(18,2) NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(18,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_amount NUMERIC(18,2) NOT NULL CHECK (unit_amount >= 0),
  currency CHAR(3) NOT NULL,
  platform_fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (platform_fee_amount >= 0),
  seller_net_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (seller_net_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','authorized','paid','failed','refunded','disputed')),
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_events (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE seller_settlements (
  id UUID PRIMARY KEY,
  order_item_id UUID NOT NULL UNIQUE REFERENCES order_items(id),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  gross_amount NUMERIC(18,2) NOT NULL CHECK (gross_amount >= 0),
  platform_fee_amount NUMERIC(18,2) NOT NULL CHECK (platform_fee_amount >= 0),
  net_amount NUMERIC(18,2) NOT NULL CHECK (net_amount >= 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','available','paid','reversed','held')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer_created ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_order_items_seller_created ON order_items(seller_id, created_at DESC);
CREATE INDEX idx_settlements_seller_status ON seller_settlements(seller_id, status);
