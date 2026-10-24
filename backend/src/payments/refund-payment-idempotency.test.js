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
  const provider = 'test';
  const providerPaymentId = `pay_${suffix}`;
  const eventId = `evt_refund_${suffix}`;
  const fullEventId = `evt_refund_full_${suffix}`;
  const payloadHash = `hash_${suffix}`;
  const fullPayloadHash = `hash_full_${suffix}`;
  let userId, productId, orderId, secondOrderId, earningId, payoutId;
  try {
    userId = (await pool.query(`INSERT INTO users (email,email_normalized,role) VALUES ($1,$1,'buyer') RETURNING id`, [email])).rows[0].id;
    productId = (await pool.query(`INSERT INTO products (seller_id,status,price_amount,price_currency,title,description) VALUES ($1,'published',1000,'JPY',$2,'refund fixture') RETURNING id`, [userId, suffix])).rows[0].id;
    orderId = (await pool.query(`INSERT INTO orders (buyer_id,product_id,amount,currency,status,provider,provider_payment_id,paid_at) VALUES ($1,$2,1000,'JPY','paid',$3,$4,NOW()) RETURNING id`, [userId, productId, provider, providerPaymentId])).rows[0].id;
    await pool.query(`INSERT INTO payments (order_id,user_id,provider,provider_payment_id,amount,currency,status,succeeded_at,idempotency_key) VALUES ($1,$2,$3,$4,1000,'JPY','succeeded',NOW(),$5)`, [orderId, userId, provider, providerPaymentId, `${provider}:${providerPaymentId}`]);
    await pool.query(`INSERT INTO entitlements (user_id,product_id,order_id,status) VALUES ($1,$2,$3,'active')`, [userId,productId,orderId]);
    earningId = (await pool.query(
      `INSERT INTO seller_earnings
         (seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status, paid_at)
       VALUES ($1,$2,$3,1000,100,900,'JPY','paid',NOW()) RETURNING id`,
      [userId, orderId, productId]
    )).rows[0].id;
    payoutId = (await pool.query(
      `INSERT INTO payouts (seller_id, amount, currency, status, paid_at)
       VALUES ($1,900,'JPY','paid',NOW()) RETURNING id`,
      [userId]
    )).rows[0].id;
    await pool.query(
      `INSERT INTO payout_earnings_allocations (payout_id, seller_earning_id, amount)
       VALUES ($1,$2,900)`,
      [payoutId, earningId]
    );

    secondOrderId = (await pool.query(
      `INSERT INTO orders (buyer_id,product_id,amount,currency,status,provider,provider_payment_id,paid_at)
       VALUES ($1,$2,1000,'JPY','paid',$3,$4,NOW() + INTERVAL '1 second') RETURNING id`,
      [userId, productId, provider, `${providerPaymentId}_second`]
    )).rows[0].id;
    await pool.query(
      `INSERT INTO payments (order_id,user_id,provider,provider_payment_id,amount,currency,status,succeeded_at,idempotency_key)
       VALUES ($1,$2,$3,$4,1000,'JPY','succeeded',NOW(),$5)`,
      [secondOrderId, userId, provider, `${providerPaymentId}_second`, `${provider}:${providerPaymentId}_second`]
    );
    await pool.query(`INSERT INTO payment_events (provider,event_id,event_type,provider_payment_id,payload_hash,status,order_id) VALUES ($1,$2,'payment_refunded',$3,$4,'received',$5)`, [provider,eventId,providerPaymentId,payloadHash,orderId]);

    const first = await refundPayment({
      eventId, provider, providerPaymentId, orderId, payloadHash,
      refundAmount: 200, refundCurrency: 'JPY',
    });
    assert.equal(first.duplicate, false);
    assert.equal(first.partial, true);
    assert.equal(first.refundedAmount, 200);
    let state = await pool.query(
      `SELECT o.status AS order_status, p.status AS payment_status, p.refunded_amount
         FROM orders o JOIN payments p ON p.order_id = o.id WHERE o.id = $1`,
      [orderId]
    );
    assert.equal(state.rows[0].order_status, 'paid');
    assert.equal(state.rows[0].payment_status, 'succeeded');
    assert.equal(Number(state.rows[0].refunded_amount), 200);
    const partialRecovery = await pool.query(
      `SELECT amount_due, amount_recovered FROM seller_earning_recoveries WHERE seller_earning_id = $1`,
      [earningId]
    );
    assert.equal(partialRecovery.rowCount, 1);
    assert.equal(Number(partialRecovery.rows[0].amount_due), 180);
    assert.equal(Number(partialRecovery.rows[0].amount_recovered), 0);
    let activeEntitlement = await pool.query(
      `SELECT order_id, status FROM entitlements WHERE user_id = $1 AND product_id = $2 AND status = 'active'`,
      [userId, productId]
    );
    assert.equal(activeEntitlement.rowCount, 1);
    assert.equal(activeEntitlement.rows[0].order_id, orderId);

    await pool.query(
      `INSERT INTO payment_events (provider,event_id,event_type,provider_payment_id,payload_hash,status,order_id)
       VALUES ($1,$2,'payment_refunded',$3,$4,'received',$5)`,
      [provider, fullEventId, providerPaymentId, fullPayloadHash, orderId]
    );
    const full = await refundPayment({
      eventId: fullEventId, provider, providerPaymentId, orderId, payloadHash: fullPayloadHash,
      refundAmount: 800, refundCurrency: 'JPY',
    });
    assert.equal(full.duplicate, false);
    assert.equal(full.order.status, 'refunded');
    assert.equal(full.entitlement.status, 'active');
    assert.equal(full.entitlement.order_id, secondOrderId);
    const fullRecovery = await pool.query(
      `SELECT amount_due, amount_recovered FROM seller_earning_recoveries WHERE seller_earning_id = $1`,
      [earningId]
    );
    assert.equal(Number(fullRecovery.rows[0].amount_due), 900);
    assert.equal(Number(fullRecovery.rows[0].amount_recovered), 0);
    activeEntitlement = await pool.query(
      `SELECT order_id, status FROM entitlements WHERE user_id = $1 AND product_id = $2 AND status = 'active'`,
      [userId, productId]
    );
    assert.equal(activeEntitlement.rowCount, 1);
    assert.equal(activeEntitlement.rows[0].order_id, secondOrderId);

    const second = await refundPayment({ eventId, provider, providerPaymentId, orderId, payloadHash });
    assert.equal(second.duplicate, true);
  } finally {
    if (orderId) {
      await pool.query('DELETE FROM seller_earning_recovery_offsets WHERE payout_id = $1',[payoutId]).catch(()=>{});
      await pool.query('DELETE FROM seller_earning_recoveries WHERE seller_earning_id = $1',[earningId]).catch(()=>{});
      await pool.query('DELETE FROM payout_earnings_allocations WHERE payout_id = $1',[payoutId]).catch(()=>{});
      await pool.query('DELETE FROM payouts WHERE id = $1',[payoutId]).catch(()=>{});
      await pool.query('DELETE FROM seller_earnings WHERE order_id = ANY($1::uuid[])',[ [orderId, secondOrderId].filter(Boolean) ]).catch(()=>{});
      await pool.query('DELETE FROM entitlements WHERE order_id = ANY($1::uuid[])',[ [orderId, secondOrderId].filter(Boolean) ]).catch(()=>{});
      await pool.query('DELETE FROM payment_events WHERE order_id=$1',[orderId]).catch(()=>{});
      await pool.query('DELETE FROM payments WHERE order_id = ANY($1::uuid[])',[ [orderId, secondOrderId].filter(Boolean) ]).catch(()=>{});
      if (secondOrderId) await pool.query('DELETE FROM orders WHERE id=$1',[secondOrderId]).catch(()=>{});
      await pool.query('DELETE FROM orders WHERE id=$1',[orderId]).catch(()=>{});
    }
    if (productId) await pool.query('DELETE FROM products WHERE id=$1',[productId]).catch(()=>{});
    if (userId) await pool.query('DELETE FROM users WHERE id=$1',[userId]).catch(()=>{});
    await pool.end();
  }
});

