-- Milestone 397: document and enforce the migration policy boundary.
--
-- Historical migrations remain immutable. Fresh installations use the current
-- canonical schema; existing installations must be assessed before replaying
-- historical purchase migrations against a populated database.

CREATE TABLE IF NOT EXISTS migration_policy (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO migration_policy(key, value)
VALUES
  ('canonical_purchase_schema', '003_orders_entitlements.sql'),
  ('legacy_purchase_migration', '001_purchase_flow.sql'),
  ('legacy_purchase_policy', 'historical-only-review-before-replay')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();
