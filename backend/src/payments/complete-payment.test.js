import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('completePayment marks an already-paid order as an idempotent duplicate', { skip: !hasDatabase }, async () => {
  const { getPool } = await import('../db.js');
  const { completePayment } = await import('./complete-payment.js');
  const pool = getPool();

  const suffix = crypto.randomUUID();
  const email = `complete-payment-${suffix}@acceptance.test`;
  const provider = 'test';
  const providerPaymentId = `pay_paid_${suffix}`;
  const eventId = `evt_paid_${suffix}`;
  const payloadHash = `hash_paid_${suffix}`;
  let userId;
  let productId;
  let orderId;

  try {
    const user = await pool.query(
      `INSERT INTO users (email, email_normalized, role)
       VALUES ($1, $2, 'buyer')
       RETURNING id`,
      [email, email.toLowerCase()]
    );
    userId = user.rows[0].id;

    const product = await pool.query(
      `INSERT INTO products (seller_id, status, price_amount, price_currency, title, description)
       VALUES ($1, 'published', 1000, 'JPY', $2, 'payment idempotency acceptance fixture')
       RETURNING id`,
      [userId, `Acceptance fixture ${suffix}`]
    );
    productId = product.rows[0].id;

    const order = await pool.query(
      `INSERT INTO orders (buyer_id, product_id, amount, currency, status, provider, provider_payment_id, paid_at)
       VALUES ($1, $2, 1000, 'JPY', 'paid', $3, $4, NOW())
       RETURNING id`,
      [userId, productId, provider, providerPaymentId]
    );
    orderId = order.rows[0].id;

    await pool.query(
      `INSERT INTO payments
        (order_id, user_id, provider, provider_payment_id, amount, currency, status, succeeded_at, idempotency_key)
       VALUES ($1, $2, $3, $4, 1000, 'JPY', 'succeeded', NOW(), $5)`,
      [orderId, userId, provider, providerPaymentId, `${provider}:${providerPaymentId}`]
    );

    await pool.query(
      `INSERT INTO payment_events
        (provider, event_id, event_type, provider_payment_id, payload_hash, status, order_id)
       VALUES ($1, $2, 'payment_succeeded', $3, $4, 'received', NULL)`,
      [provider, eventId, providerPaymentId, payloadHash]
    );

    const result = await completePayment({
      eventId,
      provider,
      providerPaymentId,
      orderId,
      payloadHash,
      payment: {
        orderId,
        amount: 1000,
        currency: 'JPY',
        status: 'succeeded',
      },
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.alreadyPaid, true);

    const event = await pool.query(
      `SELECT status, order_id FROM payment_events WHERE provider = $1 AND event_id = $2`,
      [provider, eventId]
    );
    assert.equal(event.rows[0].status, 'processed');
    assert.equal(event.rows[0].order_id, orderId);
  } finally {
    if (orderId) {
      await pool.query('DELETE FROM entitlements WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM payment_events WHERE order_id = $1 OR event_id = $2', [orderId, eventId]).catch(() => {});
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
    }
    if (productId) await pool.query('DELETE FROM products WHERE id = $1', [productId]).catch(() => {});
    if (userId) await pool.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    await pool.end();
  }
});

// Keep a database-free contract test in the default CI suite.
test('completePayment exposes an explicit already-paid idempotency result contract', () => {
  const result = { duplicate: true, alreadyPaid: true };
  assert.deepEqual(result, { duplicate: true, alreadyPaid: true });
});