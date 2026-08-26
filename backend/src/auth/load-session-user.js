import { query } from '../db.js';
import { hashSessionToken } from './session.js';

export async function loadSessionUser(req, res, next) {
  try {
    const token = req.cookies?.session_token;
    req.user = null;

    if (!token) return next();

    const tokenHash = hashSessionToken(token);
    const result = await query(
      `SELECT u.id, u.email, u.role, u.status
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1
          AND s.expires_at > NOW()
          AND s.revoked_at IS NULL
          AND u.status = 'active'
        LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
