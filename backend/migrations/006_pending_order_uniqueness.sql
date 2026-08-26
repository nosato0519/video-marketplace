-- Milestone 292: enforce one pending order per buyer/product pair.
-- This closes the race where concurrent purchase requests both pass the lookup.

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_pending_per_buyer_product_idx
  ON orders(buyer_id, product_id)
  WHERE status = 'pending';
