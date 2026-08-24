const LOGIN_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function validateLoginInput({ email, password }) {
  if (typeof email !== 'string' || !email.trim()) throw new Error('invalid_email');
  if (typeof password !== 'string' || password.length < 8) throw new Error('invalid_password');
  if (password.length > 256) throw new Error('invalid_password');
  return { email: email.trim().toLowerCase(), password };
}

export function shouldThrottleLogin({ attempts = [], now = Date.now() }) {
  const recent = attempts.filter((timestamp) => now - Number(timestamp) < WINDOW_MS);
  return recent.length >= LOGIN_LIMIT;
}

export function buildSessionPolicy({ userId, sessionId, expiresAt }) {
  if (!userId || !sessionId || !expiresAt) throw new Error('invalid_session');
  return {
    userId,
    sessionId,
    expiresAt,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    },
  };
}
