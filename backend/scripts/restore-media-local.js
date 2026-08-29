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

const archivePath = path.resolve(archive);
const list = await new Promise((resolve, reject) => {
  const child = spawn('tar', ['-tvzf', archivePath], { stdio: ['ignore', 'pipe', 'inherit'] });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => { output += chunk; });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(`tar validation failed with exit code ${code ?? 1}`)));
});

for (const entry of list.split('\n').filter(Boolean)) {
  const normalized = path.posix.normalize(entry.replace(/^\.\//, ''));
  if (!normalized || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(entry)) {
    throw new Error(`Unsafe archive entry: ${entry}`);
  }

  // Only regular files and directories are allowed. Reject symlinks, hardlinks,
  // devices, FIFOs, and other special tar entries before extraction.
  const type = entry[0];
  if (type !== '-' && type !== 'd') {
    throw new Error(`Unsafe archive entry type: ${entry}`);
  }
  if (entry.includes(' -> ') || entry.includes(' link to ')) {
    throw new Error(`Unsafe archive link entry: ${entry}`);
  }
}

const child = spawn('tar', ['-xzf', archivePath, '--no-same-owner', '--no-same-permissions', '-C', target], { stdio: ['ignore', 'inherit', 'inherit'] });
const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('exit', code => resolve(code ?? 1));
});
if (exitCode !== 0) throw new Error(`tar restore failed with exit code ${exitCode}`);
console.log(`media restore completed into: ${target}`);
