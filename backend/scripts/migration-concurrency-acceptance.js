import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { getPool } from '../src/db.js';

const RUNNERS = Number(process.env.MIGRATION_CONCURRENCY_RUNNERS || 4);
const pool = getPool();

function runMigration() {
  const child = spawn(process.execPath, ['scripts/migrate.js'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  return once(child, 'close').then(([code]) => ({ code, stdout, stderr }));
}

async function main() {
  const results = await Promise.all(Array.from({ length: RUNNERS }, runMigration));
  for (const [index, result] of results.entries()) {
    process.stdout.write(`runner ${index + 1}: exit=${result.code}\n${result.stdout}`);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.code !== 0) throw new Error(`migration runner ${index + 1} failed`);
  }

  const result = await pool.query(`
    SELECT version, status, COUNT(*) OVER (PARTITION BY version) AS version_count
    FROM schema_migrations
    ORDER BY version
  `);
  const duplicate = result.rows.find(row => Number(row.version_count) !== 1);
  if (duplicate) throw new Error(`duplicate schema_migrations row detected for ${duplicate.version}`);

  const skippedLegacy = result.rows.filter(row => row.status === 'skipped-legacy').map(row => row.version);
  if (!skippedLegacy.includes('001_purchase_flow.sql')) {
    throw new Error('expected 001_purchase_flow.sql to remain explicitly skipped as legacy');
  }

  console.log(`migration concurrency acceptance passed: ${RUNNERS} concurrent runners, ${result.rowCount} migration records, no duplicates`);
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await pool.end(); });
