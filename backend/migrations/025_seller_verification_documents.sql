-- Milestone 376: store private seller identity verification documents.

CREATE TABLE IF NOT EXISTS seller_verification_documents (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS seller_verification_documents_user_idx
  ON seller_verification_documents (user_id);
