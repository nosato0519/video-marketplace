-- Milestone 396: explicitly quarantine the incompatible legacy purchase schema.
--
-- The historical 001_purchase_flow.sql migration created BIGINT purchase tables.
-- The canonical schema is the UUID-based orders/entitlements model from
-- 003_orders_entitlements.sql. Do not silently convert or drop production data.
--
-- This migration is intentionally non-destructive. It records the compatibility
-- boundary for installers and makes the required preflight check explicit.

DO $$
BEGIN
  IF to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'canonical purchase schema unavailable: orders is missing';
  END IF;

  IF to_regclass('public.entitlements') IS NULL THEN
    RAISE EXCEPTION 'canonical purchase schema unavailable: entitlements is missing';
  END IF;
END $$;
