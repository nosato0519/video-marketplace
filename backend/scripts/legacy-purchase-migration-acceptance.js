import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pg from 'pg';

const { Pool } = pg;
const targetUrl = process.env.LEGACY_DATABASE_URL || process.env.DATABASE_URL;
if (!targetUrl) throw new Error('DATABASE_URL or LEGACY_DATABASE_URL is required');

function adminUrlFrom(target) {
  const url = new URL(target);
  url.pathname = '/postgres';
  return url.toString();
}

function runMigration() {
  const child = spawn(process.execPath, ['scripts/migrate.js'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: targetUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  return once(child, 'close').then(([code]) => ({ code, stdout, stderr }));
}

async function main() {
  const target = new URL(targetUrl);
  const dbName = target.pathname.slice(1);
  const adminPool = new Pool({ connectionString: adminUrlFrom(targetUrl) });
  const targetPool = new Pool({ connectionString: targetUrl });

  try {
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName.replaceAll('"', '""')}" WITH (FORCE)`);
    await adminPool.query(`CREATE DATABASE "${dbName.replaceAll('"', '""')}"`);

    await targetPool.query(`
      CREATE TABLE orders (
        id BIGINT PRIMARY KEY,
        buyer_id BIGINT NOT NULL,
        total_amount NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await targetPool.query(`
      INSERT INTO orders (id, buyer_id, total_amount)
      VALUES (9001, 42, 1234.56)
    `);

    const before = await targetPool.query(`
      SELECT id, buyer_id, total_amount::text AS total_amount
      FROM orders
      ORDER BY id
    `);
    const result = await runMigration();

    if (result.code === 0) {
      throw new Error('migration unexpectedly succeeded against legacy BIGINT purchase schema');
    }
    const combined = `${result.stdout}\n${result.stderr}`;
    if (!combined.includes('legacy purchase schema detected')) {
      throw new Error(`migration failed for an unexpected reason:\n${combined}`);
    }

    const after = await targetPool.query(`
      SELECT id, buyer_id, total_amount::text AS total_amount
      FROM orders
      ORDER BY id
    `);
    if (JSON.stringify(after.rows) !== JSON.stringify(before.rows)) {
      throw new Error(`legacy orders changed unexpectedly: before=${JSON.stringify(before.rows)} after=${JSON.stringify(after.rows)}`);
    }

    const migrations = await targetPool.query(`
      SELECT version, status
      FROM schema_migrations
      ORDER BY version
    `);
    if (migrations.rows.length !== 0) {
      throw new Error(`legacy safety test left migration records behind: ${JSON.stringify(migrations.rows)}`);
    }

    console.log('legacy purchase migration acceptance passed: BIGINT orders preserved, migration blocked, no migration records written');
  } finally {
    await targetPool.end();
    await adminPool.query(`DROP DATABASE IF EXISTS "${dbName.replaceAll('"', '""')}" WITH (FORCE)`);
    await adminPool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
