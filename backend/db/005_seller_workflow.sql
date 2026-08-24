-- Seller workflow foundation v0.1

CREATE TABLE seller_products (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  workflow_status TEXT NOT NULL DEFAULT 'draft' CHECK (workflow_status IN ('draft','uploading','processing','needs_changes','under_review','approved','published','paused','rejected','blocked')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_drafts (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  draft_step TEXT NOT NULL DEFAULT 'basic' CHECK (draft_step IN ('basic','media','pricing','availability','rights','preview','review')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(seller_id, product_id)
);

CREATE TABLE seller_payout_requests (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency CHAR(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','reviewing','processing','paid','failed','cancelled')),
  provider_reference TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_seller_products_workflow ON seller_products(seller_id, workflow_status, updated_at DESC);
CREATE INDEX idx_seller_drafts_seller_updated ON seller_drafts(seller_id, updated_at DESC);
CREATE INDEX idx_payout_requests_seller_status ON seller_payout_requests(seller_id, status, requested_at DESC);
