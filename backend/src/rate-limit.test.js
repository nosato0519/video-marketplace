import assert from 'node:assert/strict';
import test from 'node:test';
import { createRateLimiter } from './rate-limit.js';

function mockResponse() {
  const headers = new Map();
  return {
    headers,
    statusCode: 200,
    body: null,
    set(name, value) {
      headers.set(name, value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('rate limiter allows up to max requests and returns 429 afterwards', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, scope: `test-basic-${crypto.randomUUID()}` });
  const req = { ip: '127.0.0.1' };
  let nextCalls = 0;

  const first = mockResponse();
  limiter(req, first, () => { nextCalls += 1; });
  assert.equal(first.statusCode, 200);
  assert.equal(nextCalls, 1);
  assert.equal(first.headers.get('RateLimit-Limit'), '2');
  assert.equal(first.headers.get('RateLimit-Remaining'), '1');

  const second = mockResponse();
  limiter(req, second, () => { nextCalls += 1; });
  assert.equal(second.statusCode, 200);
  assert.equal(nextCalls, 2);
  assert.equal(second.headers.get('RateLimit-Remaining'), '0');

  const third = mockResponse();
  limiter(req, third, () => { nextCalls += 1; });
  assert.equal(third.statusCode, 429);
  assert.equal(nextCalls, 2);
  assert.equal(third.headers.get('Retry-After') >= '1', true);
  assert.deepEqual(third.body, {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
  });
});

test('rate limiter isolates keys generated for different users', () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 1,
    scope: `test-user-${crypto.randomUUID()}`,
    keyGenerator: (req) => `user:${req.user.id}`,
  });

  const userA = { user: { id: 'user-a' }, ip: '127.0.0.1' };
  const userB = { user: { id: 'user-b' }, ip: '127.0.0.1' };

  const a1 = mockResponse();
  limiter(userA, a1, () => {});
  assert.equal(a1.statusCode, 200);

  const a2 = mockResponse();
  limiter(userA, a2, () => {});
  assert.equal(a2.statusCode, 429);

  const b1 = mockResponse();
  limiter(userB, b1, () => {});
  assert.equal(b1.statusCode, 200);
});
