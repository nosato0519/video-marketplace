import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrReusePendingOrder, isPendingOrderConflict } from './purchase-flow-race.js';

test('recognizes only the pending buyer-product uniqueness conflict', () => {
  assert.equal(isPendingOrderConflict({ code: '23505', constraint: 'orders_pending_buyer_product_idx' }), true);
  assert.equal(isPendingOrderConflict({ code: '23505', constraint: 'orders_provider_payment_id_idx' }), false);
  assert.equal(isPendingOrderConflict({ code: '23503', constraint: 'orders_pending_buyer_product_idx' }), false);
});

test('reuses the existing pending order after a uniqueness race', async () => {
  const existing = { id: 'order-1', status: 'pending' };
  let lookupCount = 0;
  const result = await createOrReusePendingOrder({
    createOrder: async () => {
      throw { code: '23505', constraint: 'orders_pending_buyer_product_idx' };
    },
    findPendingOrder: async () => {
      lookupCount += 1;
      return existing;
    },
  });

  assert.deepEqual(result, existing);
  assert.equal(lookupCount, 1);
});

test('does not hide unrelated database errors', async () => {
  await assert.rejects(
    () => createOrReusePendingOrder({
      createOrder: async () => {
        throw { code: '23503', constraint: 'orders_pending_buyer_product_idx' };
      },
      findPendingOrder: async () => null,
    }),
    (error) => error.code === '23503'
  );
});

test('fails closed if the conflict cannot be resolved', async () => {
  await assert.rejects(
    () => createOrReusePendingOrder({
      createOrder: async () => {
        throw { code: '23505', constraint: 'orders_pending_buyer_product_idx' };
      },
      findPendingOrder: async () => null,
    }),
    /pending_order_conflict_unresolved/
  );
});
