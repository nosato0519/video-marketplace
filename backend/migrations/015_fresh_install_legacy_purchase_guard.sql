-- Milestone 395: guard fresh installs against the incompatible legacy purchase schema.
--
-- 001_purchase_flow.sql is retained as historical migration documentation.
-- The canonical purchase model is orders + entitlements from 003_orders_entitlements.sql.
-- A fresh-install guard must fail before application use if the legacy BIGINT
-- purchase tables are present with the incompatible shape.

DO $$
DECLARE
  orders_id_type TEXT;
  entitlements_id_type TEXT;
BEGIN
  IF to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'canonical orders table is missing';
  END IF;

  IF to_regclass('public.entitlements') IS NULL THEN
    RAISE EXCEPTION 'canonical entitlements table is missing';
  END IF;

  SELECT data_type
    INTO orders_id_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'orders'
     AND column_name = 'id';

  SELECT data_type
    INTO entitlements_id_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'entitlements'
     AND column_name = 'id';

  IF orders_id_type <> 'uuid' OR entitlements_id_type <> 'uuid' THEN
    RAISE EXCEPTION 'incompatible purchase schema detected: canonical orders.id and entitlements.id must be uuid';
  END IF;
END $$;
