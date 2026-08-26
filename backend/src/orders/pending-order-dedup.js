export function isPendingOrderUniqueViolation(error) {
  return error?.code === '23505' && error?.constraint === 'orders_pending_buyer_product_idx';
}
