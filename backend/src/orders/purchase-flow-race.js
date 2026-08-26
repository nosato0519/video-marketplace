export function isPendingOrderConflict(error) {
  return error?.code === '23505' && error?.constraint === 'orders_pending_buyer_product_idx';
}

export async function createOrReusePendingOrder({ createOrder, findPendingOrder }) {
  try {
    return await createOrder();
  } catch (error) {
    if (!isPendingOrderConflict(error)) throw error;

    const existing = await findPendingOrder();
    if (!existing) throw new Error('pending_order_conflict_unresolved');
    return existing;
  }
}
