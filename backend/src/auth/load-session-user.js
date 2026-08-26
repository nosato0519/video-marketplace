import { query } from '../db.js';
import { hashSessionToken } from './session.js';

const SESSION_COOKIE = 'video_marketplace_session';

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      if (index === -1) return [part, ''];
      return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    })
  );
}

export async function loadSessionUser(req, _res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.user = null;
    if (!token) return next();

    const result = await query(
      `SELECT u.id, u.email, u.role, u.status
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
          AND u.status = 'active'
        LIMIT 1`,
      [hashSessionToken(token)]
    );

    if (result.rows.length) req.user = result.rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
}
