import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { settleSuccessfulPayment } from './payment-settlement.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('exports the payment settlement contract', () => {
  assert.equal(typeof settleSuccessfulPayment, 'function');
});

test('requires payment and order identifiers', async () => {
  await assert.rejects(
    settleSuccessfulPayment({}),
    /payment_settlement_identifiers_required/
  );
});

test('records seller earnings once for a successful webhook settlement', { skip: !hasDatabase }, async () => {
  const { getPool } = await import('../db.js');
  const pool = getPool();
  const suffix = crypto.randomUUID();
  const sellerEmail = `settlement-seller-${suffix}@acceptance.test`;
  const buyerEmail = `settlement-buyer-${suffix}@acceptance.test`;
  const providerPaymentId = `settlement-${suffix}`;
  let sellerId;
  let buyerId;
  let productId;
  let orderId;
  let paymentId;

  try {
    const seller = await pool.query(
      `INSERT INTO users (email, email_normalized, role)
       VALUES ($1, $2, 'seller') RETURNING id`,
      [sellerEmail, sellerEmail]
    );
    sellerId = seller.rows[0].id;

    const buyer = await pool.query(
      `INSERT INTO users (email, email_normalized, role)
       VALUES ($1, $2, 'buyer') RETURNING id`,
      [buyerEmail, buyerEmail]
    );
    buyerId = buyer.rows[0].id;

    const product = await pool.query(
      `INSERT INTO products (seller_id, status, price_amount, price_currency, title, description)
       VALUES ($1, 'published', 1500, 'JPY', $2, 'webhook settlement earnings fixture')
       RETURNING id`,
      [sellerId, `Settlement earnings fixture ${suffix}`]
    );
    productId = product.rows[0].id;

    const order = await pool.query(
      `INSERT INTO orders (buyer_id, product_id, amount, currency, status)
       VALUES ($1, $2, 1500, 'JPY', 'pending') RETURNING id`,
      [buyerId, productId]
    );
    orderId = order.rows[0].id;

    const payment = await pool.query(
      `INSERT INTO payments
        (order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
       VALUES ($1, $2, 'test', NULL, 1500, 'JPY', 'pending', $3)
       RETURNING id`,
      [orderId, buyerId, `test:settlement:${suffix}`]
    );
    paymentId = payment.rows[0].id;

    const result = await settleSuccessfulPayment({ paymentId, orderId, providerPaymentId });
    assert.equal(result.status, 'settled');

    const earnings = await pool.query(
      `SELECT seller_id, gross_amount, net_amount, currency, status
         FROM seller_earnings WHERE order_id = $1`,
      [orderId]
    );
    assert.equal(earnings.rowCount, 1);
    assert.equal(earnings.rows[0].seller_id, sellerId);
    assert.equal(earnings.rows[0].gross_amount, '1500.00');
    assert.equal(earnings.rows[0].net_amount, '1500.00');
    assert.equal(earnings.rows[0].currency.trim(), 'JPY');
    assert.equal(earnings.rows[0].status, 'available');

    await settleSuccessfulPayment({ paymentId, orderId, providerPaymentId });
    const afterRetry = await pool.query(
      'SELECT COUNT(*)::int AS count FROM seller_earnings WHERE order_id = $1',
      [orderId]
    );
    assert.equal(afterRetry.rows[0].count, 1);
  } finally {
    if (orderId) {
      await pool.query('DELETE FROM seller_earnings WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM entitlements WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
    }
    if (productId) await pool.query('DELETE FROM products WHERE id = $1', [productId]).catch(() => {});
    if (buyerId) await pool.query('DELETE FROM users WHERE id = $1', [buyerId]).catch(() => {});
    if (sellerId) await pool.query('DELETE FROM users WHERE id = $1', [sellerId]).catch(() => {});
  }
});
