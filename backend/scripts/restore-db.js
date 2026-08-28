import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const databaseUrl = process.env.DATABASE_URL;
const backupPath = process.argv[2];

if (!databaseUrl) throw new Error('DATABASE_URL is required');
if (!backupPath) throw new Error('Usage: node scripts/restore-db.js <backup.dump>');

const stat = await fs.stat(backupPath).catch(() => null);
if (!stat?.isFile() || stat.size === 0) throw new Error(`Backup file is missing or empty: ${backupPath}`);

if (process.env.ALLOW_DB_RESTORE !== 'true') {
  throw new Error('Database restore is destructive. Set ALLOW_DB_RESTORE=true explicitly before running restore.');
}

const parsed = new URL(databaseUrl);
const databaseEnv = {
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || '5432',
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  PGDATABASE: parsed.pathname.replace(/^\//, '')
};

const child = spawn('pg_restore', [
  '--clean',
  '--if-exists',
  '--no-owner',
  backupPath
], { env: { ...process.env, ...databaseEnv }, stdio: ['ignore', 'inherit', 'inherit'] });

const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', code => resolve(code ?? 1));
});

if (exitCode !== 0) throw new Error(`pg_restore failed with exit code ${exitCode}`);
console.log(`restore completed from: ${backupPath}`);
