import crypto from 'node:crypto';
import { getPool } from '../src/db.js';
import { completePaidOrder } from '../src/orders/complete-order.js';
import { refundPaidOrder } from '../src/orders/refund-order.js';
import { getOrderHistory } from '../src/orders/order-history.js';
import { hasActiveVideoAccess } from '../src/orders/check-video-access.js';
import { getProtectedMediaForUser } from '../src/media/protected-media-repository.js';
import { authorizeProtectedMedia } from '../src/media/protected-access.js';

const pool = getPool();

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function getLibraryItems(userId) {
  const result = await pool.query(
    `SELECT e.id AS entitlement_id,
            e.product_id,
            e.order_id,
            e.status AS entitlement_status,
            p.title,
            p.description,
            p.price_amount,
            p.price_currency,
            p.streaming_enabled,
            p.download_enabled,
            e.created_at AS purchased_at
       FROM entitlements e
       JOIN products p ON p.id = e.product_id
      WHERE e.user_id = $1
        AND e.status = 'active'
        AND e.revoked_at IS NULL
        AND p.status = 'published'
        AND NOT EXISTS (
          SELECT 1
            FROM content_reviews cr
           WHERE cr.product_id = p.id
             AND cr.status = 'blocked'
        )
      ORDER BY e.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function main() {
  const ids = {
    seller: crypto.randomUUID(),
    buyer: crypto.randomUUID(),
    nonBuyer: crypto.randomUUID(),
    media: crypto.randomUUID(),
    product: crypto.randomUUID(),
    order: crypto.randomUUID(),
    review: crypto.randomUUID(),
  };

  try {
    await pool.query(
      `INSERT INTO users (id, email, email_normalized, role, status)
       VALUES ($1, $2, $2, 'seller', 'active'),
              ($3, $4, $4, 'buyer', 'active'),
              ($5, $6, $6, 'buyer', 'active')`,
      [
        ids.seller, `seller-${ids.seller}@acceptance.test`,
        ids.buyer, `buyer-${ids.buyer}@acceptance.test`,
        ids.nonBuyer, `nonbuyer-${ids.nonBuyer}@acceptance.test`,
      ]
    );

    await pool.query(
      `INSERT INTO media_assets (id, owner_user_id, storage_key, mime_type, byte_size, status)
       VALUES ($1, $2, $3, 'video/mp4', 1024, 'ready')`,
      [ids.media, ids.seller, `acceptance/${ids.media}.mp4`]
    );

    await pool.query(
      `INSERT INTO products
         (id, seller_id, media_asset_id, status, price_amount, price_currency,
          title, description, streaming_enabled, download_enabled, published_at)
       VALUES ($1, $2, $3, 'published', 1500, 'JPY',
               'Commerce acceptance product', 'Acceptance product', TRUE, TRUE, NOW())`,
      [ids.product, ids.seller, ids.media]
    );

    await pool.query(
      `INSERT INTO orders
         (id, buyer_id, product_id, amount, currency, status, created_at, updated_at)
       VALUES ($1, $2, $3, 1500, 'JPY', 'pending', NOW(), NOW())`,
      [ids.order, ids.buyer, ids.product]
    );

    const completed = await completePaidOrder({
      orderId: ids.order,
      paymentReference: `acceptance-payment-${ids.order}`,
    });
    assert(completed.order.status === 'paid', 'order becomes paid');
    assert(completed.entitlement.status === 'active', 'paid order grants an active entitlement');

    const orderRow = await pool.query(
      `SELECT buyer_id, product_id, amount, currency, status, payment_reference
         FROM orders WHERE id = $1`,
      [ids.order]
    );
    assert(orderRow.rowCount === 1, 'paid order exists');
    assert(orderRow.rows[0].buyer_id === ids.buyer, 'order belongs to buyer');
    assert(orderRow.rows[0].amount === '1500.00', 'order amount is canonical');
    assert(orderRow.rows[0].payment_reference === `acceptance-payment-${ids.order}`, 'payment reference is stored');

    const history = await getOrderHistory(ids.buyer);
    assert(history.some(row => row.id === ids.order && row.status === 'paid'), 'buyer order history contains the paid order');

    const libraryBeforeBlock = await getLibraryItems(ids.buyer);
    assert(libraryBeforeBlock.length === 1, 'buyer Library shows the purchased published product');
    assert(libraryBeforeBlock[0].product_id === ids.product, 'Library item points to the purchased product');
    assert(libraryBeforeBlock[0].download_enabled === true, 'Library exposes download capability');

    const nonBuyerLibrary = await getLibraryItems(ids.nonBuyer);
    assert(nonBuyerLibrary.length === 0, 'non-buyer Library is empty');
    assert(!(await hasActiveVideoAccess(ids.nonBuyer, ids.product)), 'non-buyer has no video access');

    const protectedBeforeBlock = await getProtectedMediaForUser({
      userId: ids.buyer,
      productId: ids.product,
    });
    assert(Boolean(protectedBeforeBlock), 'buyer protected-media context exists');
    const allowedBeforeBlock = authorizeProtectedMedia({
      user: { id: ids.buyer },
      entitlement: protectedBeforeBlock.entitlement,
      product: protectedBeforeBlock.product,
      asset: protectedBeforeBlock.asset,
    });
    assert(allowedBeforeBlock.allowed === true, 'buyer can access purchased media before takedown');

    await pool.query(
      `INSERT INTO content_reviews
         (id, product_id, reviewer_id, status, reason_code, notes, resolved_at)
       VALUES ($1, $2, $3, 'blocked', 'admin_takedown', 'Commerce acceptance takedown', NOW())`,
      [ids.review, ids.product, ids.seller]
    );

    const libraryAfterBlock = await getLibraryItems(ids.buyer);
    assert(libraryAfterBlock.length === 0, 'blocked product disappears from buyer Library');

    const protectedAfterBlock = await getProtectedMediaForUser({
      userId: ids.buyer,
      productId: ids.product,
    });
    const deniedByBlock = authorizeProtectedMedia({
      user: { id: ids.buyer },
      entitlement: protectedAfterBlock.entitlement,
      product: protectedAfterBlock.product,
      asset: protectedAfterBlock.asset,
    });
    assert(deniedByBlock.allowed === false && deniedByBlock.status === 404, 'blocked product denies protected-media access');

    await pool.query(`DELETE FROM content_reviews WHERE id = $1`, [ids.review]);

    const refunded = await refundPaidOrder({
      orderId: ids.order,
      refundReference: `acceptance-refund-${ids.order}`,
    });
    assert(refunded.status === 'refunded', 'paid order becomes refunded');

    const revoked = await pool.query(
      `SELECT status, revoked_at FROM entitlements WHERE order_id = $1`,
      [ids.order]
    );
    assert(revoked.rowCount === 1, 'entitlement remains linked to refunded order');
    assert(revoked.rows[0].status === 'revoked', 'refund revokes entitlement');
    assert(revoked.rows[0].revoked_at !== null, 'refund records entitlement revocation time');
    assert(!(await hasActiveVideoAccess(ids.buyer, ids.product)), 'refunded buyer loses video access');

    const historyAfterRefund = await getOrderHistory(ids.buyer);
    const refundedHistory = historyAfterRefund.find(row => row.id === ids.order);
    assert(refundedHistory?.status === 'refunded', 'order history shows refunded status');

    const libraryAfterRefund = await getLibraryItems(ids.buyer);
    assert(libraryAfterRefund.length === 0, 'refunded product is removed from buyer Library');

    const finalOrder = await pool.query(
      `SELECT status, payment_reference, refund_reference, paid_at, refunded_at
         FROM orders WHERE id = $1`,
      [ids.order]
    );
    assert(finalOrder.rows[0].refund_reference === `acceptance-refund-${ids.order}`, 'refund reference is stored');
    assert(finalOrder.rows[0].paid_at !== null, 'paid timestamp is stored');
    assert(finalOrder.rows[0].refunded_at !== null, 'refunded timestamp is stored');

    console.log('commerce-db-acceptance: PASS');
  } finally {
    await pool.query(`DELETE FROM content_reviews WHERE id = $1`, [ids.review]).catch(() => {});
    await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [ids.order]).catch(() => {});
    await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
    await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
    await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.buyer, ids.nonBuyer]]).catch(() => {});
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
