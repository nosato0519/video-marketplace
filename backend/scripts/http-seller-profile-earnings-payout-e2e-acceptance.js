import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is required');

async function request(url, options = {}) {
  const response = await fetch(`${baseUrl}${url}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { response, body };
}

async function query(text, params = []) {
  const result = spawn('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-X', '-A', '-t', '-F', '\t', '-c', text, '--', ...params.map(String)], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  result.stdout.on('data', (chunk) => { stdout += chunk; });
  result.stderr.on('data', (chunk) => { stderr += chunk; });
  const code = await new Promise((resolve) => result.on('close', resolve));
  if (code !== 0) throw new Error(`psql failed (${code}): ${stderr}`);
  return { rows: stdout.trim() ? stdout.trim().split('\n').map((line) => line.split('\t')) : [] };
}

// ... existing setup and request helpers omitted for brevity ...

// The settlement contract distinguishes historical allocation rows from
// effective allocation rows. Cancelled/failed payout allocations remain in
// the audit trail but must not count toward earning settlement.
const allocationTotals = await query(`
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE payout_id = $1), 0) AS first_paid,
    COALESCE(SUM(amount) FILTER (WHERE payout_id = $2), 0) AS second_paid,
    COALESCE(SUM(amount), 0) AS all_allocations,
    COALESCE(SUM(amount) FILTER (
      WHERE payout_id IN (
        SELECT id FROM payouts WHERE status NOT IN ('failed', 'cancelled')
      )
    ), 0) AS effective_allocations
  FROM payout_earnings_allocations
  WHERE seller_earning_id = $3
`, [payoutId, fullPayoutId, initialAllocation.rows[0].seller_earning_id]);

assert.equal(Number(allocationTotals.rows[0][0]), 1000);
assert.equal(Number(allocationTotals.rows[0][1]), 4000);
assert.equal(Number(allocationTotals.rows[0][2]), 7500);
assert.equal(Number(allocationTotals.rows[0][3]), 5000);

// ... remaining existing audit and seller-payout assertions ...
console.log('http-seller-profile-earnings-payout-e2e-acceptance: PASS');
