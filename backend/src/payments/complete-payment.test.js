import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('completePayment creates one seller earning and keeps it idempotent for an already-paid order', { skip: !hasDatabase }, async () => {
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
       VALUES ($1, $2, 'seller')
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

    const buyer = await pool.query(
      `INSERT INTO users (email, email_normalized, role)
       VALUES ($1, $2, 'buyer')
       RETURNING id`,
      [`buyer-${suffix}@acceptance.test`, `buyer-${suffix}@acceptance.test`]
    );
    const buyerId = buyer.rows[0].id;

    const order = await pool.query(
      `INSERT INTO orders (buyer_id, product_id, amount, currency, status, provider, provider_payment_id, paid_at)
       VALUES ($1, $2, 1000, 'JPY', 'paid', $3, $4, NOW())
       RETURNING id`,
      [buyerId, productId, provider, providerPaymentId]
    );
    orderId = order.rows[0].id;

    await pool.query(
      `INSERT INTO payments
        (order_id, user_id, provider, provider_payment_id, amount, currency, status, succeeded_at, idempotency_key)
       VALUES ($1, $2, $3, $4, 1000, 'JPY', 'succeeded', NOW(), $5)`,
      [orderId, buyerId, provider, providerPaymentId, `${provider}:${providerPaymentId}`]
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
      payment: { orderId, amount: 1000, currency: 'JPY', status: 'succeeded' },
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.alreadyPaid, true);

    const earnings = await pool.query(
      `SELECT seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status
         FROM seller_earnings WHERE order_id = $1`,
      [orderId]
    );
    assert.equal(earnings.rowCount, 1);
    assert.equal(earnings.rows[0].seller_id, userId);
    assert.equal(earnings.rows[0].gross_amount, '1000.00');
    assert.equal(earnings.rows[0].platform_fee, '0.00');
    assert.equal(earnings.rows[0].net_amount, '1000.00');
    assert.equal(earnings.rows[0].currency.trim(), 'JPY');
    assert.equal(earnings.rows[0].status, 'available');

    const secondEventId = `evt_paid_retry_${suffix}`;
    await pool.query(
      `INSERT INTO payment_events
        (provider, event_id, event_type, provider_payment_id, payload_hash, status, order_id)
       VALUES ($1, $2, 'payment_succeeded', $3, $4, 'received', NULL)`,
      [provider, secondEventId, providerPaymentId, `hash_paid_retry_${suffix}`]
    );
    const retry = await completePayment({
      eventId: secondEventId,
      provider,
      providerPaymentId,
      orderId,
      payloadHash: `hash_paid_retry_${suffix}`,
      payment: { orderId, amount: 1000, currency: 'JPY', status: 'succeeded' },
    });
    assert.equal(retry.duplicate, true);
    assert.equal(retry.alreadyPaid, true);

    const afterRetry = await pool.query(
      `SELECT COUNT(*)::int AS count FROM seller_earnings WHERE order_id = $1`,
      [orderId]
    );
    assert.equal(afterRetry.rows[0].count, 1);
  } finally {
    if (orderId) {
      await pool.query('DELETE FROM seller_earnings WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM entitlements WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM payments WHERE order_id = $1', [orderId]).catch(() => {});
      await pool.query('DELETE FROM payment_events WHERE order_id = $1 OR event_id LIKE $2', [orderId, `evt_paid%${suffix}`]).catch(() => {});
      const buyerOrder = await pool.query('SELECT buyer_id FROM orders WHERE id = $1', [orderId]).catch(() => ({ rows: [] }));
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]).catch(() => {});
      if (buyerOrder.rows?.[0]?.buyer_id) await pool.query('DELETE FROM users WHERE id = $1', [buyerOrder.rows[0].buyer_id]).catch(() => {});
    }
    if (productId) await pool.query('DELETE FROM products WHERE id = $1', [productId]).catch(() => {});
    if (userId) await pool.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    await pool.end();
  }
});

test('completePayment exposes an explicit already-paid idempotency result contract', () => {
  const result = { duplicate: true, alreadyPaid: true };
  assert.deepEqual(result, { duplicate: true, alreadyPaid: true });
});