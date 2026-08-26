import test from 'node:test';
import assert from 'node:assert/strict';
import { settleSuccessfulPayment } from './payment-settlement.js';

test('exports the payment settlement contract', () => {
  assert.equal(typeof settleSuccessfulPayment, 'function');
});

test('requires payment and order identifiers', async () => {
  await assert.rejects(
    settleSuccessfulPayment({}),
    /payment_settlement_identifiers_required/
  );
});
