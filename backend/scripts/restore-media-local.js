import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const archive = process.argv[2];
const target = path.resolve(process.env.MEDIA_STORAGE_DIR || './media-data');
if (!archive) throw new Error('Usage: node scripts/restore-media-local.js <archive.tar.gz>');
if (process.env.ALLOW_MEDIA_RESTORE !== 'true') {
  throw new Error('Media restore is destructive. Set ALLOW_MEDIA_RESTORE=true explicitly before running restore.');
}
const stat = await fs.stat(archive).catch(() => null);
if (!stat?.isFile() || stat.size === 0) throw new Error(`Media backup is missing or empty: ${archive}`);
await fs.mkdir(target, { recursive: true });

const child = spawn('tar', ['-xzf', path.resolve(archive), '-C', target], { stdio: ['ignore', 'inherit', 'inherit'] });
const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', code => resolve(code ?? 1));
});
if (exitCode !== 0) throw new Error(`tar restore failed with exit code ${exitCode}`);
console.log(`media restore completed into: ${target}`);
