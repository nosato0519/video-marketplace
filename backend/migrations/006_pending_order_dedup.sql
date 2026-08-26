-- Milestone 285: prevent duplicate pending orders for the same buyer/product.
-- Existing paid/refunded history remains untouched.

CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_buyer_product_idx
  ON orders(buyer_id, product_id)
  WHERE status = 'pending';
