import crypto from 'node:crypto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry(now = Date.now()) {
  return new Date(now + SESSION_TTL_MS);
}

export function sessionCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}
