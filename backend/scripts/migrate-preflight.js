import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../migrations');

async function main() {
  const files = (await fs.readdir(migrationsDir))
    .filter(name => /^\d+_.+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (files.length === 0) throw new Error('No migration files found');

  let previousVersion = 0;
  for (const file of files) {
    const match = file.match(/^(\d+)_.+\.sql$/);
    const version = Number(match[1]);
    if (version < 1) throw new Error(`Invalid migration version: ${file}`);
    if (version < previousVersion) {
      throw new Error(`Migration ordering error: ${file}`);
    }
    previousVersion = version;

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    if (!sql.trim()) throw new Error(`Empty migration: ${file}`);
  }

  console.log(`migration preflight ok: ${files.length} migrations`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
