import crypto from 'node:crypto';
import { getPool } from '../src/db.js';

const pool = getPool();

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function main() {
  const client = await pool.connect();
  const ids = {
    seller: crypto.randomUUID(),
    reporter: crypto.randomUUID(),
    media: crypto.randomUUID(),
    product: crypto.randomUUID(),
    report: crypto.randomUUID(),
    duplicateReport: crypto.randomUUID(),
    review: crypto.randomUUID()
  };

  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO users (id, email) VALUES ($1, $2), ($3, $4)`,
      [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.reporter, `reporter-${ids.reporter}@acceptance.test`]
    );
    await client.query(
      `INSERT INTO media_assets (id, owner_user_id, storage_key, mime_type, byte_size, status)
       VALUES ($1, $2, $3, 'video/mp4', 1, 'ready')`,
      [ids.media, ids.seller, `acceptance/${ids.media}`]
    );
    await client.query(
      `INSERT INTO products (id, seller_id, media_asset_id, status, price_amount, title)
       VALUES ($1, $2, $3, 'published', 100, 'Acceptance product')`,
      [ids.product, ids.seller, ids.media]
    );

    const report = await client.query(
      `INSERT INTO content_reports (id, product_id, reporter_id, reason_code, description, status)
       VALUES ($1, $2, $3, 'copyright', 'Acceptance report description', 'open')
       RETURNING status`,
      [ids.report, ids.product, ids.reporter]
    );
    assert(report.rows[0].status === 'open', 'report starts open');

    let duplicateRejected = false;
    try {
      await client.query(
        `INSERT INTO content_reports (id, product_id, reporter_id, reason_code, description, status)
         VALUES ($1, $2, $3, 'copyright', 'Duplicate acceptance report', 'open')`,
        [ids.duplicateReport, ids.product, ids.reporter]
      );
    } catch (error) {
      duplicateRejected = error.code === '23505';
    }
    assert(duplicateRejected, 'duplicate open report is rejected by the database constraint');

    const duplicate = await client.query(
      `SELECT 1 FROM content_reports
       WHERE product_id = $1 AND reporter_id = $2 AND status IN ('open','reviewing')`,
      [ids.product, ids.reporter]
    );
    assert(duplicate.rowCount === 1, 'open report remains unique after duplicate attempt');

    await client.query(`UPDATE content_reports SET status = 'reviewing' WHERE id = $1`, [ids.report]);
    await client.query(
      `INSERT INTO content_reviews (id, product_id, reviewer_id, status, reason_code, notes, resolved_at)
       VALUES ($1, $2, $3, 'blocked', 'admin_takedown', 'Acceptance takedown', NOW())`,
      [ids.review, ids.product, ids.seller]
    );
    await client.query(`UPDATE content_reports SET status = 'resolved', resolved_at = NOW() WHERE id = $1`, [ids.report]);

    const blocked = await client.query(
      `SELECT 1 FROM content_reviews WHERE product_id = $1 AND status = 'blocked'`,
      [ids.product]
    );
    assert(blocked.rowCount === 1, 'takedown creates a blocked review');

    const visible = await client.query(
      `SELECT p.id
         FROM products p
        WHERE p.id = $1
          AND p.status = 'published'
          AND NOT EXISTS (
            SELECT 1 FROM content_reviews cr
             WHERE cr.product_id = p.id AND cr.status = 'blocked'
          )`,
      [ids.product]
    );
    assert(visible.rowCount === 0, 'blocked product is excluded from public visibility');

    const reportState = await client.query(`SELECT status FROM content_reports WHERE id = $1`, [ids.report]);
    assert(reportState.rows[0].status === 'resolved', 'report resolves after moderation');

    await client.query('ROLLBACK');
    console.log('moderation-db-acceptance: PASS');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await pool.end(); });