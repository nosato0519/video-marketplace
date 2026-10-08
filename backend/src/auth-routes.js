import crypto from 'node:crypto';
import { query, withTransaction } from './db.js';
import { createSessionToken, hashSessionToken, sessionCookieOptions, sessionExpiry } from './auth/session.js';
import { requireAuth } from './auth/require-auth.js';
import { adminSetupRateLimit, authLoginRateLimit, authRegisterRateLimit } from './rate-limit.js';

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

function validSetupToken(providedToken) {
  const configuredToken = process.env.ADMIN_SETUP_TOKEN;
  if (!configuredToken || typeof providedToken !== 'string' || !providedToken) return false;

  const expected = crypto.createHash('sha256').update(configuredToken).digest();
  const actual = crypto.createHash('sha256').update(providedToken).digest();
  return crypto.timingSafeEqual(expected, actual);
}

async function createAdminUser(email, password) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [7139422]);

    const existingAdmin = await client.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    if (existingAdmin.rows.length) {
      const error = new Error('Initial operator setup has already been completed');
      error.code = 'ADMIN_SETUP_COMPLETED';
      throw error;
    }

    const result = await client.query(
      `INSERT INTO users (email, email_normalized, password_hash, role, status)
       VALUES ($1, $2, $3, 'admin', 'active')
       RETURNING id, email, role, status`,
      [email, email, hashPassword(password)]
    );

    return result.rows[0];
  });
}

export function registerAuthRoutes(app) {
  app.post('/api/auth/register', authRegisterRateLimit, async (req, res, next) => {
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

  app.post('/api/auth/admin-setup', adminSetupRateLimit, async (req, res, next) => {
    try {
      if (!process.env.ADMIN_SETUP_TOKEN) {
        return res.status(503).json({
          error: {
            code: 'ADMIN_SETUP_NOT_CONFIGURED',
            message: 'Initial operator setup is not configured',
          },
        });
      }

      const email = normalizeEmail(req.body?.email);
      const password = req.body?.password;
      const passwordConfirm = req.body?.passwordConfirm;
      const setupToken = req.body?.setupToken;

      if (!validEmail(email) || !validPassword(password) || password !== passwordConfirm) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ADMIN_SETUP_INPUT',
            message: 'A valid email and matching password of 12-256 characters are required',
          },
        });
      }

      if (!validSetupToken(setupToken)) {
        return res.status(403).json({
          error: {
            code: 'INVALID_ADMIN_SETUP_TOKEN',
            message: 'Invalid setup key',
          },
        });
      }

      const user = await createAdminUser(email, password);
      await createSession(res, user.id);
      return res.status(201).json({ user });
    } catch (error) {
      if (error.code === 'ADMIN_SETUP_COMPLETED') {
        return res.status(409).json({
          error: {
            code: error.code,
            message: 'Initial operator setup has already been completed',
          },
        });
      }
      if (error.code === '23505') {
        return res.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'Email is already registered',
          },
        });
      }
      return next(error);
    }
  });
  app.post('/api/auth/login', authLoginRateLimit, async (req, res, next) => {
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

  app.get('/api/auth/verify-email', async (req, res, next) => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      if (!token || token.length < 20 || token.length > 200) {
        return res.status(400).json({ error: { code: 'INVALID_EMAIL_VERIFICATION_TOKEN', message: 'Invalid email verification link' } });
      }
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const result = await withTransaction(async (client) => {
        const tokenResult = await client.query(
          `SELECT id, user_id
             FROM email_verification_tokens
            WHERE token_hash = $1
              AND consumed_at IS NULL
              AND expires_at > NOW()
            FOR UPDATE`,
          [tokenHash]
        );
        const tokenRow = tokenResult.rows[0];
        if (!tokenRow) return null;

        const userResult = await client.query(
          `UPDATE users
              SET email_verified_at = COALESCE(email_verified_at, NOW())
            WHERE id = $1 AND role = 'seller' AND status = 'active'
            RETURNING id, email, email_verified_at`,
          [tokenRow.user_id]
        );
        if (!userResult.rows[0]) return null;

        await client.query(
          `UPDATE email_verification_tokens SET consumed_at = NOW() WHERE id = $1`,
          [tokenRow.id]
        );
        const settingResult = await client.query(
          `SELECT setting_value->>'value' AS method FROM platform_settings WHERE setting_key = 'seller_verification_method' LIMIT 1`
        );
        if (settingResult.rows[0]?.method === 'email') {
          await client.query(
            `UPDATE seller_profiles
                SET verification_status = 'verified', verified_at = COALESCE(verified_at, NOW()), submitted_at = COALESCE(submitted_at, NOW()), updated_at = NOW()
              WHERE user_id = $1`,
            [tokenRow.user_id]
          );
        }
        return userResult.rows[0];
      });

      if (!result) {
        return res.status(400).json({ error: { code: 'INVALID_EMAIL_VERIFICATION_TOKEN', message: 'This email verification link is invalid or expired' } });
      }
      return res.json({ verified: true, user: result });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.post('/api/auth/logout', async (req, res, next) => {
    try {
      const token = readSessionToken(req);
      if (token) await query(`UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, [hashSessionToken(token)]);
      res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: 0 });
      return res.json({ ok: true });
    } catch (error) { return next(error); }
  });
}
