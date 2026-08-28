import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sellerPayoutRoute = fs.readFileSync(path.join(here, 'payout-routes.js'), 'utf8');
const adminPayoutRoute = fs.readFileSync(path.join(here, '..', 'admin', 'payout-routes.js'), 'utf8');
const payoutMigration = fs.readFileSync(path.join(here, '..', '..', 'migrations', '004_payouts_audit.sql'), 'utf8');
const sellerProfileMigration = fs.readFileSync(path.join(here, '..', '..', 'migrations', '010_seller_profile.sql'), 'utf8');
const sellerEarningsMigration = fs.readFileSync(path.join(here, '..', '..', 'migrations', '011_seller_earnings.sql'), 'utf8');

function assertCanonicalPayoutRoute(source, label) {
  assert.match(source, /\bFROM payouts\b|\bINSERT INTO payouts\b|\bUPDATE payouts\b/, `${label} must use the migrated payouts table`);
  assert.doesNotMatch(source, /seller_payout_requests/, `${label} must not depend on an unmigrated seller_payout_requests table`);
}

test('seller and admin payout routes use the migrated payouts contract', () => {
  assertCanonicalPayoutRoute(sellerPayoutRoute, 'seller payout route');
  assertCanonicalPayoutRoute(adminPayoutRoute, 'admin payout route');
});

test('seller payout identity remains users.id and profile identity is user keyed', () => {
  assert.match(payoutMigration, /seller_id UUID NOT NULL REFERENCES users\(id\)/);
  assert.match(sellerProfileMigration, /user_id UUID PRIMARY KEY REFERENCES users\(id\)/);
  assert.match(sellerEarningsMigration, /seller_id UUID NOT NULL REFERENCES users\(id\)/);
});

test('payout lifecycle is shared by the migration and route policy', () => {
  const statuses = ['requested', 'reviewing', 'approved', 'processing', 'paid', 'failed', 'cancelled'];
  for (const status of statuses) assert.match(payoutMigration, new RegExp(`'${status}'`));
  for (const status of statuses) assert.match(adminPayoutRoute, new RegExp(status));
});

test('available balance source is seller earnings', () => {
  assert.match(sellerPayoutRoute, /FROM seller_earnings/);
  assert.match(sellerPayoutRoute, /status = 'available'/);
});
