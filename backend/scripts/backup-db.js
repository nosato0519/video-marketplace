import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const outputArg = process.argv[2] || `backup-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.dump`;
const outputPath = path.resolve(outputArg);
await fs.mkdir(path.dirname(outputPath), { recursive: true });

const child = spawn('pg_dump', ['--format=custom', '--no-owner', '--file', outputPath], {
  env: { ...process.env, PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || '15', DATABASE_URL: databaseUrl },
  stdio: ['ignore', 'inherit', 'inherit']
});

const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', code => resolve(code ?? 1));
});

if (exitCode !== 0) {
  await fs.rm(outputPath, { force: true });
  throw new Error(`pg_dump failed with exit code ${exitCode}`);
}

const stat = await fs.stat(outputPath);
if (stat.size === 0) {
  await fs.rm(outputPath, { force: true });
  throw new Error('backup file is empty');
}

console.log(`backup created: ${outputPath} (${stat.size} bytes)`);
