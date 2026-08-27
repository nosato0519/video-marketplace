import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from '../src/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../migrations');
const pool = getPool();
const MIGRATION_LOCK_ID = 7139421;
const LEGACY_MIGRATIONS = new Set(['001_purchase_flow.sql']);
const ALLOW_LEGACY = process.env.ALLOW_LEGACY_PURCHASE_MIGRATION === 'true';

async function assertPurchaseSchemaBoundary(client, applied) {
  if (applied.has('003_orders_entitlements.sql')) return;

  const legacyOrders = await client.query(`
    SELECT c.data_type, c.udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'orders'
      AND c.column_name = 'id'
    LIMIT 1
  `);
  const legacyOrderId = legacyOrders.rows[0]?.udt_name === 'int8' || legacyOrders.rows[0]?.data_type === 'bigint';
  if (!legacyOrderId) return;

  if (ALLOW_LEGACY) {
    throw new Error(
      'legacy purchase schema detected: 001_purchase_flow.sql created BIGINT orders, but the canonical purchase schema in 003_orders_entitlements.sql uses UUID. No automatic conversion is implemented. Back up the installation and run a reviewed legacy-to-canonical migration before continuing.'
    );
  }

  throw new Error(
    'legacy purchase schema detected: orders.id is BIGINT and 003_orders_entitlements.sql is not applied. Automatic replay is blocked to prevent destructive schema/type conflicts. Set up a reviewed legacy-to-canonical migration before continuing.'
  );
}

async function main() {
  const lockClient = await pool.connect();
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await lockClient.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'applied',
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (status IN ('applied', 'skipped-legacy'))
      )
    `);

    await lockClient.query(`
      ALTER TABLE schema_migrations
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'applied'
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter(name => /^\d+_.+\.sql$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const applied = new Map(
      (await lockClient.query('SELECT version, status FROM schema_migrations'))
        .rows.map(row => [row.version, row.status])
    );

    await assertPurchaseSchemaBoundary(lockClient, applied);

    for (const file of files) {
      if (applied.has(file)) continue;

      if (LEGACY_MIGRATIONS.has(file) && !ALLOW_LEGACY) {
        await lockClient.query(
          `INSERT INTO schema_migrations(version, status)
           VALUES ($1, 'skipped-legacy')
           ON CONFLICT (version) DO NOTHING`,
          [file]
        );
        console.log(`skipped legacy ${file} (set ALLOW_LEGACY_PURCHASE_MIGRATION=true only for an explicitly reviewed legacy install)`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      try {
        await lockClient.query('BEGIN');
        await lockClient.query(sql);
        await lockClient.query(
          `INSERT INTO schema_migrations(version, status)
           VALUES ($1, 'applied')`,
          [file]
        );
        await lockClient.query('COMMIT');
        console.log(`applied ${file}`);
      } catch (error) {
        await lockClient.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
    lockClient.release();
  }
}

main()
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await pool.end(); });
