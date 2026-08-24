-- Video Marketplace relational schema v0.1
-- PostgreSQL-oriented. Monetary amounts use NUMERIC to avoid floating-point errors.

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer','seller','admin')),
  status TEXT NOT NULL DEFAULT 'active',
  locale TEXT NOT NULL DEFAULT 'en',
  country_code CHAR(2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  payout_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES categories(id),
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),
  category_id UUID REFERENCES categories(id),
  status TEXT NOT NULL DEFAULT 'draft',
  content_rating TEXT NOT NULL DEFAULT 'general',
  price_amount NUMERIC(18,2) NOT NULL CHECK (price_amount >= 0),
  price_currency CHAR(3) NOT NULL,
  streaming_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  download_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  download_limit INTEGER,
  download_expiry_seconds BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE TABLE product_translations (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  UNIQUE(product_id, locale)
);

CREATE INDEX idx_products_status_published ON products(status, published_at DESC);
CREATE INDEX idx_products_category ON products(category_id, status);
CREATE INDEX idx_product_translations_locale ON product_translations(locale);
