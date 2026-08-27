import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../migrations');

async function main() {
  const files = (await fs.readdir(migrationsDir))
    .filter(name => /^\d+_.+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const plan = files.map((file, index) => ({
    order: index + 1,
    version: file.match(/^\d+/)[0],
    file,
    policy: file === '001_purchase_flow.sql' ? 'legacy-history-review-required' : 'apply'
  }));

  console.log(JSON.stringify({
    migration_count: plan.length,
    canonical_purchase_schema: '003_orders_entitlements.sql',
    plan
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
