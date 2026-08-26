-- Milestone 368: document legacy purchase-flow schema deprecation
--
-- The canonical purchase model is orders + entitlements from 003_orders_entitlements.sql.
-- Older purchase-flow tables (for example video_entitlements) must not be used by
-- application code. They are intentionally not dropped here: production deployments
-- must first verify that no historical data depends on them.
--
-- Deployment rule:
-- 1. Apply migrations in order.
-- 2. Confirm application queries reference only canonical tables.
-- 3. Back up the database before any destructive cleanup of legacy tables.
-- 4. Remove legacy tables only in a separately reviewed migration after data retention
--    and rollback requirements have been satisfied.

DO $$
BEGIN
  IF to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'canonical orders table is missing; apply 003_orders_entitlements.sql first';
  END IF;

  IF to_regclass('public.entitlements') IS NULL THEN
    RAISE EXCEPTION 'canonical entitlements table is missing; apply 003_orders_entitlements.sql first';
  END IF;
END $$;
