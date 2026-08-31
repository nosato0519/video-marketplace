const buckets = new Map();

function now() {
  return Date.now();
}

function clientKey(req, scope, identity = '') {
  return `${scope}:${identity || req.ip || req.socket?.remoteAddress || 'unknown'}`;
}

function pruneExpired(current) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= current) buckets.delete(key);
  }
}

export function createRateLimiter({ windowMs, max, scope, keyGenerator = (req) => req.ip || req.socket?.remoteAddress || 'unknown' }) {
  if (!Number.isInteger(windowMs) || windowMs <= 0) throw new Error('rate_limit_invalid_window');
  if (!Number.isInteger(max) || max <= 0) throw new Error('rate_limit_invalid_max');
  if (!scope) throw new Error('rate_limit_scope_required');

  return (req, res, next) => {
    const current = now();
    if (buckets.size > 10000) pruneExpired(current);

    const identity = String(keyGenerator(req) || 'unknown');
    const key = clientKey(req, scope, identity);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= current) {
      bucket = { count: 0, resetAt: current + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - current) / 1000));

    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }

    return next();
  };
}

export const authRegisterRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  scope: 'auth-register',
});

export const authLoginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  scope: 'auth-login',
});

export const checkoutRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  scope: 'checkout',
  keyGenerator: (req) => req.user?.id ? `user:${req.user.id}` : (req.ip || req.socket?.remoteAddress || 'unknown'),
});
