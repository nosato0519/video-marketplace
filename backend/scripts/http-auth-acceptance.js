import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'acceptance-only-payment-webhook-secret-0123456789abcdef';

const pool = getPool();
const server = createServer(createApp());
const email = `auth-${crypto.randomUUID()}@acceptance.test`;
const password = 'AcceptancePassword-1234';
let userId = null;
let cookie = null;

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { response, body };
}

function sessionCookie(response) {
  const raw = response.headers.get('set-cookie') || '';
  const match = raw.match(/video_marketplace_session=([^;]+)/);
  return match ? `video_marketplace_session=${match[1]}` : null;
}

try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  let result = await request(baseUrl, '/api/auth/register', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.user.email, email);
  userId = result.body.user.id;
  cookie = sessionCookie(result.response);
  assert.ok(cookie);

  result = await request(baseUrl, '/api/auth/me', { headers: { cookie } });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.user.id, userId);

  result = await request(baseUrl, '/api/auth/logout', { method: 'POST', headers: { cookie } });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  result = await request(baseUrl, '/api/auth/me', { headers: { cookie } });
  assert.equal(result.response.status, 401);

  result = await request(baseUrl, '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  cookie = sessionCookie(result.response);
  assert.ok(cookie);

  result = await request(baseUrl, '/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrong-password-1234' }),
  });
  assert.equal(result.response.status, 401);

  console.log('http-auth-acceptance: PASS');
} finally {
  if (userId) {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]).catch(() => {});
    await pool.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
  }
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
