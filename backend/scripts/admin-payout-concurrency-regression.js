import assert from 'node:assert/strict';

// Source-level regression guard for the Admin payout state machine.
// The route must lock the payout row inside the shared transaction helper before
// reading and applying a status transition so two admins cannot both advance
// the same payout from the same state.
const fs = await import('node:fs/promises');
const source = await fs.readFile(new URL('../src/admin/payout-routes.js', import.meta.url), 'utf8');
const dbSource = await fs.readFile(new URL('../src/db.js', import.meta.url), 'utf8');

assert.match(source, /withTransaction/);
assert.match(source, /SELECT id, status FROM payouts WHERE id = \$1 FOR UPDATE/);
assert.match(source, /UPDATE payouts/);
assert.match(dbSource, /client\.query\('BEGIN'\)/);
assert.match(dbSource, /client\.query\('COMMIT'\)/);
assert.match(dbSource, /client\.query\('ROLLBACK'\)/);

console.log('admin-payout-concurrency-regression: PASS');
