import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { settleSuccessfulPayment } from './payment-settlement.js';
import { settlePaymentWebhook } from './payment-webhook-settlement.js';

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

test('records seller earnings once and rejects stale success after refund', { skip: !hasDatabase }, async () => {
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
  let secondOrderId;

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
       VALUES ($1, $2, 'test', $3, 1500, 'JPY', 'pending', $4)
       RETURNING id`,
      [orderId, buyerId, `${providerPaymentId}-initial`, `test:settlement:${suffix}`]
    );
    const paymentId = payment.rows[0].id;

    const result = await settleSuccessfulPayment({ paymentId, orderId, providerPaymentId });
    assert.equal(result.status, 'settled');

    const earnings = await pool.query(
      `SELECT seller_id, gross_amount, net_amount, currency, status
         FROM seller_earnings WHERE order_id = $1`,
      [orderId]
    );
    assert.equal(earnings.rowCount, 1);
    assert.equal(earnings.rows[0].seller_id, sellerId);
    assert.equal(Number(earnings.rows[0].gross_amount), 1500);
    assert.equal(Number(earnings.rows[0].net_amount), 1500);
    assert.equal(earnings.rows[0].currency.trim(), 'JPY');
    assert.equal(earnings.rows[0].status, 'available');

    await settleSuccessfulPayment({ paymentId, orderId, providerPaymentId });
    const afterRetry = await pool.query(
      'SELECT COUNT(*)::int AS count FROM seller_earnings WHERE order_id = $1',
      [orderId]
    );
    assert.equal(afterRetry.rows[0].count, 1);

    const secondOrder = await pool.query(
      `INSERT INTO orders (buyer_id, product_id, amount, currency, status)
       VALUES ($1, $2, 1500, 'JPY', 'pending') RETURNING id`,
      [buyerId, productId]
    );
    secondOrderId = secondOrder.rows[0].id;
    const secondPayment = await pool.query(
      `INSERT INTO payments
        (order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
       VALUES ($1, $2, 'test', $3, 1500, 'JPY', 'pending', $4)
       RETURNING id`,
      [secondOrderId, buyerId, `${providerPaymentId}-second`, `test:settlement:second:${suffix}`]
    );
    await settleSuccessfulPayment({
      paymentId: secondPayment.rows[0].id,
      orderId: secondOrderId,
      providerPaymentId: `${providerPaymentId}-second`,
    });

    const activeEntitlement = await pool.query(
      `SELECT order_id FROM entitlements
        WHERE user_id = $1 AND product_id = $2 AND status = 'active'`,
      [buyerId, productId]
    );
    assert.equal(activeEntitlement.rowCount, 1);
    assert.equal(activeEntitlement.rows[0].order_id, orderId);

    await pool.query("UPDATE orders SET status = 'refunded' WHERE id = $1", [orderId]);
    await pool.query("UPDATE payments SET status = 'refunded' WHERE id = $1", [paymentId]);
    await pool.query(
      "UPDATE entitlements SET status = 'revoked', revoked_at = NOW() WHERE order_id = $1",
      [orderId]
    );
    await pool.query(
      "UPDATE seller_earnings SET status = 'refunded' WHERE order_id = $1",
      [orderId]
    );

    await assert.rejects(
      settleSuccessfulPayment({ paymentId, orderId, providerPaymentId }),
      /payment_order_not_settleable/
    );

    const protectedState = await pool.query(
      `SELECT o.status AS order_status, p.status AS payment_status,
              e.status AS entitlement_status, se.status AS earnings_status
         FROM orders o
         JOIN payments p ON p.order_id = o.id
         JOIN entitlements e ON e.order_id = o.id
         JOIN seller_earnings se ON se.order_id = o.id AND se.product_id = o.product_id
        WHERE o.id = $1`,
      [orderId]
    );
    assert.equal(protectedState.rows[0].order_status, 'refunded');
    assert.equal(protectedState.rows[0].payment_status, 'refunded');
    assert.equal(protectedState.rows[0].entitlement_status, 'revoked');
    assert.equal(protectedState.rows[0].earnings_status, 'refunded');
  } finally {
    if (secondOrderId) {
      await pool.query('DELETE FROM seller_earnings WHERE order_id = $1', [secondOrderId]).catch(() => {});
      await pool.query('DELETE FROM payments WHERE order_id = $1', [secondOrderId]).catch(() => {});
      await pool.query('DELETE FROM orders WHERE id = $1', [secondOrderId]).catch(() => {});
    }
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


test('rejects successful Stripe webhook events without payment identifiers before settlement', async () => {
  const base = {
    id: 'evt_validation',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_validation',
        metadata: { paymentId: 'payment_validation', orderId: 'order_validation' },
      },
    },
  };

  await assert.rejects(
    settlePaymentWebhook({ event: { ...base, id: ' ' } }),
    /payment_webhook_event_required/
  );
  await assert.rejects(
    settlePaymentWebhook({
      event: {
        ...base,
        data: { object: { ...base.data.object, metadata: { paymentId: ' ', orderId: 'order_validation' } } },
      },
    }),
    /payment_webhook_metadata_missing/
  );
  await assert.rejects(
    settlePaymentWebhook({
      event: {
        ...base,
        data: { object: { id: '', metadata: base.data.object.metadata } },
      },
    }),
    /payment_provider_id_required/
  );
});


test('ignores unsupported Stripe webhook event types without attempting settlement', async () => {
  const result = await settlePaymentWebhook({
    event: {
      id: 'evt_unsupported',
      type: 'customer.updated',
      data: { object: { id: 'cus_1', metadata: {} } },
    },
  });
  assert.deepEqual(result, { handled: false, eventId: 'evt_unsupported' });
});

test('does not settle Checkout Sessions that Stripe has not marked paid', async () => {
  const result = await settlePaymentWebhook({
    event: {
      id: 'evt_unpaid_checkout',
      type: 'checkout.session.completed',
      data: {
        object: {
          payment_status: 'unpaid',
          payment_intent: 'pi_unpaid',
          metadata: { paymentId: 'payment_1', orderId: 'order_1' },
        },
      },
    },
  });
  assert.deepEqual(result, {
    handled: false,
    eventId: 'evt_unpaid_checkout',
    reason: 'payment_not_paid',
  });
});
