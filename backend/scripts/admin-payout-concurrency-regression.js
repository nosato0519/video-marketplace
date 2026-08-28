import assert from 'node:assert/strict';

// Source-level regression guard for the Admin payout state machine.
// The route must lock the payout row inside a transaction before reading
// and applying a status transition so two admins cannot both advance the
// same payout from the same state.
const fs = await import('node:fs/promises');
const source = await fs.readFile(new URL('../src/admin/payout-routes.js', import.meta.url), 'utf8');

assert.match(source, /BEGIN/);
assert.match(source, /SELECT id, status FROM payouts WHERE id = \$1 FOR UPDATE/);
assert.match(source, /COMMIT/);
assert.match(source, /ROLLBACK/);
assert.match(source, /UPDATE payouts/);

console.log('admin-payout-concurrency-regression: PASS');
