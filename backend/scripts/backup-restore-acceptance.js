import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const parsed = new URL(databaseUrl);
const databaseEnv = {
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || '5432',
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  PGDATABASE: parsed.pathname.replace(/^\//, '')
};

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'video-marketplace-backup-'));
const dump = path.join(tmp, 'round-trip.dump');
const marker = `backup-restore-${Date.now()}`;

const run = (command, args, env = databaseEnv) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} failed (${code}): ${stderr}`)));
});

try {
  await run('psql', ['-v', 'ON_ERROR_STOP=1', '-c', 'CREATE TABLE IF NOT EXISTS backup_restore_acceptance_marker (id integer PRIMARY KEY, value text NOT NULL); TRUNCATE backup_restore_acceptance_marker;']);
  await run('psql', ['-v', 'ON_ERROR_STOP=1', '-c', `INSERT INTO backup_restore_acceptance_marker (id, value) VALUES (1, '${marker}');`]);

  await run('pg_dump', ['--format=custom', '--no-owner', '--file', dump]);
  const stat = await fs.stat(dump);
  if (stat.size === 0) throw new Error('round-trip dump is empty');

  await run('psql', ['-v', 'ON_ERROR_STOP=1', '-c', 'UPDATE backup_restore_acceptance_marker SET value = \'mutated-after-backup\' WHERE id = 1;']);
  await run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--dbname', parsed.toString(), dump], databaseEnv);

  const result = await run('psql', ['-At', '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT value FROM backup_restore_acceptance_marker WHERE id = 1;']);
  if (result.stdout.trim() !== marker) throw new Error(`restore verification failed: expected ${marker}, got ${result.stdout.trim()}`);

  console.log('backup/restore round-trip acceptance: PASS');
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
