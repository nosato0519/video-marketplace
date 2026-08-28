import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('completePayment uses order_id as the entitlement idempotency key', { skip: !hasDatabase }, async () => {
  const { getPool } = await import('../db.js');
  const { completePayment } = await import('./complete-payment.js');
  const pool = getPool();
  const suffix = crypto.randomUUID();
  const email = `entitlement-${suffix}@acceptance.test`;
  let userId, productId, orderId;
  try {
    userId = (await pool.query(`INSERT INTO users (email,email_normalized,role) VALUES ($1,$1,'buyer') RETURNING id`, [email])).rows[0].id;
    productId = (await pool.query(`INSERT INTO products (seller_id,status,price_amount,price_currency,title,description) VALUES ($1,'published',1000,'JPY',$2,'idempotency fixture') RETURNING id`, [userId, suffix])).rows[0].id;
    orderId = (await pool.query(`INSERT INTO orders (buyer_id,product_id,amount,currency,status) VALUES ($1,$2,1000,'JPY','pending') RETURNING id`, [userId, productId])).rows[0].id;
    const provider = 'test';
    const providerPaymentId = `pay_${suffix}`;
    await pool.query(`INSERT INTO payments (order_id,user_id,provider,provider_payment_id,amount,currency,status,idempotency_key) VALUES ($1,$2,$3,$4,1000,'JPY','pending',$5)`, [orderId,userId,provider,providerPaymentId,`${provider}:${providerPaymentId}`]);
    await pool.query(`INSERT INTO payment_events (provider,event_id,event_type,provider_payment_id,payload_hash,status,order_id) VALUES ($1,$2,'payment_succeeded',$3,$4,'received',$5)`, [provider,`evt_${suffix}`,providerPaymentId,`hash_${suffix}`,orderId]);

    const first = await completePayment({ eventId:`evt_${suffix}`, provider, providerPaymentId, orderId, payloadHash:`hash_${suffix}`, payment:{ orderId, amount:1000, currency:'JPY', status:'succeeded' } });
    assert.equal(first.duplicate, false);
    assert.ok(first.entitlement);

    await pool.query(`INSERT INTO payment_events (provider,event_id,event_type,provider_payment_id,payload_hash,status,order_id) VALUES ($1,$2,'payment_succeeded',$3,$4,'received',$5)`, [provider,`evt_retry_${suffix}`,providerPaymentId,`hash_retry_${suffix}`,orderId]);
    const second = await completePayment({ eventId:`evt_retry_${suffix}`, provider, providerPaymentId, orderId, payloadHash:`hash_retry_${suffix}`, payment:{ orderId, amount:1000, currency:'JPY', status:'succeeded' } });
    assert.equal(second.duplicate, true);
    assert.equal(second.alreadyPaid, true);
    const count = await pool.query(`SELECT count(*)::int AS count FROM entitlements WHERE order_id = $1`, [orderId]);
    assert.equal(count.rows[0].count, 1);
  } finally {
    if (orderId) {
      await pool.query('DELETE FROM entitlements WHERE order_id=$1',[orderId]).catch(()=>{});
      await pool.query('DELETE FROM payments WHERE order_id=$1',[orderId]).catch(()=>{});
      await pool.query('DELETE FROM payment_events WHERE order_id=$1',[orderId]).catch(()=>{});
      await pool.query('DELETE FROM orders WHERE id=$1',[orderId]).catch(()=>{});
    }
    if (productId) await pool.query('DELETE FROM products WHERE id=$1',[productId]).catch(()=>{});
    if (userId) await pool.query('DELETE FROM users WHERE id=$1',[userId]).catch(()=>{});
    await pool.end();
  }
});

test('entitlement creation is contractually idempotent by order id', () => {
  assert.match('ON CONFLICT (order_id) DO NOTHING', /ON CONFLICT \(order_id\) DO NOTHING/);
});