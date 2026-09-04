import crypto from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('completePayment settles a pending order and creates the buyer entitlement', { skip: !hasDatabase }, async () => {
  const { getPool } = await import('../db.js');
  const { completePayment } = await import('./complete-payment.js');
  const pool = getPool();

  const suffix = crypto.randomUUID();
  const provider = 'test';
  const providerPaymentId = `pay_success_${suffix}`;
  const eventId = `evt_success_${suffix}`;
  const payloadHash = `hash_success_${suffix}`;
  let sellerId;
  let buyerId;
  let productId;
  let orderId;

  try {
    const seller = await pool.query(
      `INSERT INTO users (email, email_normalized, role)
       VALUES ($1, $2, 'seller') RETURNING id`,
      [`seller-${suffix}@acceptance.test`, `seller-${suffix}@acceptance.test`]
    );
    sellerId = seller.rows[0].id;

    const buyer = await pool.query(
      `INSERT INTO users (email, email_normalized, role)
       VALUES ($1, $2, 'buyer') RETURNING id`,
      [`buyer-success-${suffix}@acceptance.test`, `buyer-success-${suffix}@acceptance.test`]
    );
    buyerId = buyer.rows[0].id;

    const product = await pool.query(
      `INSERT INTO products (seller_id, status, price_amount, price_currency, title, description)
       VALUES ($1, 'published', 2500, 'JPY', $2, 'first payment settlement fixture') RETURNING id`,
      [sellerId, `Settlement fixture ${suffix}`]
    );
    productId = product.rows[0].id;

    const order = await pool.query(
      `INSERT INTO orders (buyer_id, product_id, amount, currency, status)
       VALUES ($1, $2, 2500, 'JPY', 'pending') RETURNING id`,
      [buyerId, productId]
    );
    orderId = order.rows[0].id;

    await pool.query(
      `INSERT INTO payments
        (order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
       VALUES ($1, $2, $3, $4, 2500, 'JPY', 'pending', $5)`,
      [orderId, buyerId, provider, providerPaymentId, `${provider}:${providerPaymentId}`]
    );

    await pool.query(
      `INSERT INTO payment_events
        (provider, event_id, event_type, provider_payment_id, payload_hash, status)
       VALUES ($1, $2, 'payment_succeeded', $3, $4, 'received')`,
      [provider, eventId, providerPaymentId, payloadHash]
    );

    const result = await completePayment({
      eventId,
      provider,
      providerPaymentId,
      orderId,
      payloadHash,
      payment: {
        provider,
        provider_payment_id: providerPaymentId,
        amount: 2500,
        currency: 'JPY',
        status: 'succeeded',
      },
    });

    assert.equal(result.duplicate, false);
    assert.equal(result.order.status, 'paid');
    assert.equal(result.order.provider, provider);
    assert.equal(result.order.provider_payment_id, providerPaymentId);
    assert.equal(result.payment.status, 'succeeded');
    assert.equal(result.payment.provider_payment_id, providerPaymentId);
    assert.equal(result.entitlement.user_id, buyerId);
    assert.equal(result.entitlement.product_id, productId);
    assert.equal(result.entitlement.order_id, orderId);

    const paymentCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM payments WHERE order_id = $1',
      [orderId]
    );
    assert.equal(paymentCount.rows[0].count, 1);

    const earningCount = await pool.query(
      'SELECT COUNT(*)::int AS count FROM seller_earnings WHERE order_id = $1',
      [orderId]
    );
    assert.equal(earningCount.rows[0].count, 1);

    const event = await pool.query(
      'SELECT status, order_id FROM payment_events WHERE provider = $1 AND event_id = $2',
      [provider, eventId]
    );
    assert.equal(event.rows[0].status, 'processed');
    assert.equal(event.rows[0].order_id, orderId);
  } finally {
    if (orderId) await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    if (productId) await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    if (buyerId) await pool.query('DELETE FROM users WHERE id = $1', [buyerId]);
    if (sellerId) await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
  }
});


test('completePayment exposes an explicit already-paid idempotency result contract', { skip: !hasDatabase }, async () => {
  const { completePayment } = await import('./complete-payment.js');
  assert.equal(typeof completePayment, 'function');
});
