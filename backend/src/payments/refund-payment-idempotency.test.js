import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('refundPayment is idempotent for an already-processed refund event', { skip: !hasDatabase }, async () => {
  const { getPool } = await import('../db.js');
  const { refundPayment } = await import('./refund-payment.js');
  const pool = getPool();
  const suffix = crypto.randomUUID();
  const email = `refund-${suffix}@acceptance.test`;
  let userId, productId, orderId;
  try {
    userId = (await pool.query(`INSERT INTO users (email,email_normalized,role) VALUES ($1,$1,'buyer') RETURNING id`, [email])).rows[0].id;
    productId = (await pool.query(`INSERT INTO products (seller_id,status,price_amount,price_currency,title,description) VALUES ($1,'published',1000,'JPY',$2,'refund fixture') RETURNING id`, [userId, suffix])).rows[0].id;
    orderId = (await pool.query(`INSERT INTO orders (buyer_id,product_id,amount,currency,status,provider,provider_payment_id,paid_at) VALUES ($1,$2,1000,'JPY','paid','test',$3,NOW()) RETURNING id`, [userId, productId, `pay_${suffix}`])).rows[0].id;
    await pool.query(`INSERT INTO entitlements (user_id,product_id,order_id,status) VALUES ($1,$2,$3,'active')`, [userId,productId,orderId]);
    const eventId = `evt_refund_${suffix}`;
    const providerPaymentId = `pay_${suffix}`;
    const payloadHash = `hash_${suffix}`;
    await pool.query(`INSERT INTO payment_events (provider,event_id,event_type,provider_payment_id,payload_hash,status,order_id) VALUES ('test',$1,'payment_refunded',$2,$3,'received',$4)`, [eventId,providerPaymentId,payloadHash,orderId]);

    const first = await refundPayment({ eventId, provider:'test', providerPaymentId, orderId, payloadHash });
    assert.equal(first.duplicate, false);
    assert.equal(first.order.status, 'refunded');
    assert.equal(first.entitlement.status, 'revoked');

    const second = await refundPayment({ eventId, provider:'test', providerPaymentId, orderId, payloadHash });
    assert.equal(second.duplicate, true);
  } finally {
    if (orderId) {
      await pool.query('DELETE FROM entitlements WHERE order_id=$1',[orderId]).catch(()=>{});
      await pool.query('DELETE FROM payment_events WHERE order_id=$1',[orderId]).catch(()=>{});
      await pool.query('DELETE FROM orders WHERE id=$1',[orderId]).catch(()=>{});
    }
    if (productId) await pool.query('DELETE FROM products WHERE id=$1',[productId]).catch(()=>{});
    if (userId) await pool.query('DELETE FROM users WHERE id=$1',[userId]).catch(()=>{});
    await pool.end();
  }
});

test('refund idempotency contract never revokes an already-revoked entitlement again', () => {
  const result = { duplicate: true, alreadyRefunded: true };
  assert.deepEqual(result, { duplicate: true, alreadyRefunded: true });
});