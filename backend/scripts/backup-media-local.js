import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve(process.env.MEDIA_STORAGE_DIR || './media-data');
const outputArg = process.argv[2];
if (!outputArg) throw new Error('Usage: node scripts/backup-media-local.js <archive.tar.gz>');
const output = path.resolve(outputArg);

const stat = await fs.stat(source).catch(() => null);
if (!stat?.isDirectory()) throw new Error(`MEDIA_STORAGE_DIR is missing or not a directory: ${source}`);
await fs.mkdir(path.dirname(output), { recursive: true });

const child = spawn('tar', ['-czf', output, '-C', source, '.'], { stdio: ['ignore', 'inherit', 'inherit'] });
const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', code => resolve(code ?? 1));
});
if (exitCode !== 0) {
  await fs.rm(output, { force: true });
  throw new Error(`tar failed with exit code ${exitCode}`);
}
const archive = await fs.stat(output);
if (archive.size === 0) {
  await fs.rm(output, { force: true });
  throw new Error('media backup archive is empty');
}
console.log(`media backup created: ${output} (${archive.size} bytes)`);
