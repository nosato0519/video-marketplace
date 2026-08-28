import crypto from 'node:crypto';
import { query } from './db.js';
import { createSessionToken, hashSessionToken, sessionCookieOptions, sessionExpiry } from './auth/session.js';
import { requireAuth } from './auth/require-auth.js';

const SESSION_COOKIE = 'video_marketplace_session';
const PASSWORD_HASH_VERSION = 'scrypt-v1';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(email) {
  return email.length >= 3 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 256;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024,
  });
  return `${PASSWORD_HASH_VERSION}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

function verifyPassword(password, encoded) {
  try {
    const [version, saltText, hashText] = String(encoded || '').split('$');
    if (version !== PASSWORD_HASH_VERSION) return false;
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
    const actual = crypto.scryptSync(password, salt, expected.length, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function cookieOptions() {
  return sessionCookieOptions(process.env.NODE_ENV === 'production');
}

function readSessionToken(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  for (const part of cookies) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(index + 1));
  }
  return null;
}

async function createSession(res, userId) {
  const token = createSessionToken();
  await query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashSessionToken(token), sessionExpiry()]
  );
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;
      if (!validEmail(email) || !validPassword(password)) {
        return res.status(400).json({ error: { code: 'INVALID_CREDENTIALS_FORMAT', message: 'A valid email and a password of 12-256 characters are required' } });
      }
      const result = await query(
        `INSERT INTO users (email, email_normalized, password_hash, role, status)
         VALUES ($1, $2, $3, 'buyer', 'active')
         RETURNING id, email, role, status`,
        [email, email, hashPassword(password)]
      );
      const user = result.rows[0];
      await createSession(res, user.id);
      return res.status(201).json({ user });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'Email is already registered' } });
      return next(error);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;
      if (!validEmail(email) || !validPassword(password)) {
        return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      }
      const result = await query(
        `SELECT id, email, role, status, password_hash FROM users WHERE email_normalized = $1 LIMIT 1`,
        [email]
      );
      const user = result.rows[0];
      if (!user || user.status !== 'active' || !user.password_hash || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      }
      await createSession(res, user.id);
      return res.json({ user: { id: user.id, email: user.email, role: user.role, status: user.status } });
    } catch (error) { return next(error); }
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.post('/api/auth/logout', async (req, res, next) => {
    try {
      const token = readSessionToken(req);
      if (token) await query(`UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashSessionToken(token)]);
      return res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: 0 });
    } catch (error) { return next(error); }
  });
}
