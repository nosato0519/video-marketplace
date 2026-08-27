import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createSessionToken, hashSessionToken, sessionExpiry } from '../src/auth/session.js';

const pool = getPool();

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

async function request(baseUrl, path, { token, method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.cookie = `video_marketplace_session=${encodeURIComponent(token)}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* keep raw text */ }
  return { response, data, text };
}

async function main() {
  const app = createApp();
  const server = createServer(app);
  const client = await pool.connect();
  const ids = {
    seller: crypto.randomUUID(),
    reporter: crypto.randomUUID(),
    admin: crypto.randomUUID(),
    product: crypto.randomUUID(),
    media: crypto.randomUUID()
  };
  const tokens = {
    reporter: createSessionToken(),
    admin: createSessionToken()
  };

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await client.query(
      `INSERT INTO users (id, email, role, status)
       VALUES ($1, $2, 'seller', 'active'),
              ($3, $4, 'buyer', 'active'),
              ($5, $6, 'admin', 'active')`,
      [
        ids.seller, `seller-${ids.seller}@acceptance.test`,
        ids.reporter, `reporter-${ids.reporter}@acceptance.test`,
        ids.admin, `admin-${ids.admin}@acceptance.test`
      ]
    );
    await client.query(
      `INSERT INTO user_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3), ($4, $5, $6)`,
      [
        ids.reporter, hashSessionToken(tokens.reporter), sessionExpiry(),
        ids.admin, hashSessionToken(tokens.admin), sessionExpiry()
      ]
    );
    await client.query(
      `INSERT INTO media_assets (id, owner_user_id, storage_key, mime_type, byte_size, status)
       VALUES ($1, $2, $3, 'video/mp4', 1, 'ready')`,
      [ids.media, ids.seller, `acceptance/${ids.media}`]
    );
    await client.query(
      `INSERT INTO products (id, seller_id, media_asset_id, status, price_amount, title)
       VALUES ($1, $2, $3, 'published', 100, 'HTTP Acceptance product')`,
      [ids.product, ids.seller, ids.media]
    );

    const unauthenticated = await request(baseUrl, `/api/products/${ids.product}/reports`, {
      method: 'POST', body: { reason_code: 'copyright', description: 'Valid acceptance report' }
    });
    assert(unauthenticated.response.status === 401, 'report API rejects unauthenticated users');

    const reportResponse = await request(baseUrl, `/api/products/${ids.product}/reports`, {
      token: tokens.reporter,
      method: 'POST',
      body: { reason_code: 'copyright', description: 'Valid acceptance report' }
    });
    assert(reportResponse.response.status === 201, 'authenticated buyer can create a report');
    const reportId = reportResponse.data?.report?.id;
    assert(reportId, 'report id is returned');

    const duplicateResponse = await request(baseUrl, `/api/products/${ids.product}/reports`, {
      token: tokens.reporter,
      method: 'POST',
      body: { reason_code: 'copyright', description: 'Duplicate acceptance report' }
    });
    assert(duplicateResponse.response.status === 409, 'duplicate report is rejected by the API');

    const forbidden = await request(baseUrl, '/api/admin/content/reports', { token: tokens.reporter });
    assert(forbidden.response.status === 403, 'buyer cannot access admin moderation API');

    const reports = await request(baseUrl, '/api/admin/content/reports?status=open', { token: tokens.admin });
    assert(reports.response.status === 200, 'admin can read the moderation queue');
    assert(reports.data.reports.some((report) => report.id === reportId), 'created report appears in admin queue');

    const reviewing = await request(baseUrl, `/api/admin/content/reports/${reportId}/status`, {
      token: tokens.admin,
      method: 'POST', body: { status: 'reviewing' }
    });
    assert(reviewing.response.status === 200, 'admin can move report to reviewing');

    const takedown = await request(baseUrl, `/api/admin/content/${ids.product}/takedown`, {
      token: tokens.admin,
      method: 'POST', body: { reason: 'Acceptance takedown verification' }
    });
    assert(takedown.response.status === 200, 'admin takedown succeeds');
    assert(takedown.data?.takedown?.status === 'blocked', 'takedown creates a blocked review');

    const blocked = await client.query(
      `SELECT 1 FROM content_reviews WHERE product_id = $1 AND status = 'blocked'`,
      [ids.product]
    );
    assert(blocked.rowCount === 1, 'blocked review exists in the database');

    const resolved = await request(baseUrl, `/api/admin/content/reports/${reportId}/status`, {
      token: tokens.admin,
      method: 'POST', body: { status: 'resolved' }
    });
    assert(resolved.response.status === 200, 'admin can resolve the report');

    const reportState = await client.query(`SELECT status FROM content_reports WHERE id = $1`, [reportId]);
    assert(reportState.rows[0].status === 'resolved', 'report is resolved in the database');

    await client.query('BEGIN');
    await client.query(`DELETE FROM audit_events WHERE actor_user_id = $1`, [ids.admin]);
    await client.query(`DELETE FROM content_reviews WHERE product_id = $1`, [ids.product]);
    await client.query(`DELETE FROM content_reports WHERE product_id = $1`, [ids.product]);
    await client.query(`DELETE FROM products WHERE id = $1`, [ids.product]);
    await client.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]);
    await client.query(`DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3)`, [ids.seller, ids.reporter, ids.admin]);
    await client.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [ids.seller, ids.reporter, ids.admin]);
    await client.query('COMMIT');

    console.log('moderation-http-acceptance: PASS');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* no active transaction */ }
    try {
      await client.query(`DELETE FROM audit_events WHERE actor_user_id = $1`, [ids.admin]);
      await client.query(`DELETE FROM content_reviews WHERE product_id = $1`, [ids.product]);
      await client.query(`DELETE FROM content_reports WHERE product_id = $1`, [ids.product]);
      await client.query(`DELETE FROM products WHERE id = $1`, [ids.product]);
      await client.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]);
      await client.query(`DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3)`, [ids.seller, ids.reporter, ids.admin]);
      await client.query(`DELETE FROM users WHERE id IN ($1, $2, $3)`, [ids.seller, ids.reporter, ids.admin]);
    } catch { /* preserve the original assertion/error */ }
    throw error;
  } finally {
    client.release();
    await new Promise((resolve) => server.close(resolve));
  }
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await pool.end(); });
