import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentProvider } from './payment-provider.js';

test('pending provider rejects a missing idempotency key', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  await assert.rejects(
    () => provider.createCheckout({ orderId: 'o1', amount: '1000.00', currency: 'JPY', metadata: { orderId: 'o1' } }),
    /checkout_idempotency_key_required/
  );
});

test('pending provider rejects mismatched order metadata', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  await assert.rejects(
    () => provider.createCheckout({
      orderId: 'o1',
      amount: '1000.00',
      currency: 'JPY',
      idempotencyKey: 'order:o1',
      metadata: { orderId: 'o2' },
    }),
    /checkout_order_mismatch/
  );
});
