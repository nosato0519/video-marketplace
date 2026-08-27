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

  const versions = files.map(file => Number(file.match(/^\d+/)[0]));
  const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
  if (duplicates.length) throw new Error(`Duplicate migration versions: ${[...new Set(duplicates)].join(', ')}`);

  for (let i = 0; i < files.length; i++) {
    const expected = i + 1;
    if (versions[i] !== expected) {
      throw new Error(`Migration sequence gap: expected ${String(expected).padStart(3, '0')}, found ${files[i]}`);
    }
  }

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    if (!sql.trim()) throw new Error(`Empty migration: ${file}`);
  }

  console.log(`migration preflight ok: ${files.length} migrations`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
