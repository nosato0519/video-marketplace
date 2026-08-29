import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'video-marketplace-media-restore-security-'));
const source = path.join(tmp, 'source');
const target = path.join(tmp, 'target');
const symlinkArchive = path.join(tmp, 'symlink.tar.gz');
const hardlinkArchive = path.join(tmp, 'hardlink.tar.gz');

const run = (command, args, env = process.env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', reject);
  child.on('exit', code => resolve({ code: code ?? 1, stdout, stderr }));
});

const expectRestoreRejected = async (archive) => {
  const result = await run(process.execPath, ['scripts/restore-media-local.js', archive], {
    ...process.env,
    ALLOW_MEDIA_RESTORE: 'true',
    MEDIA_STORAGE_DIR: target
  });
  if (result.code === 0) throw new Error(`unsafe archive was accepted: ${archive}`);
  if (!result.stderr.includes('Unsafe archive entry')) {
    throw new Error(`unexpected restore failure for ${archive}: ${result.stderr}`);
  }
};

try {
  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(source, 'safe.txt'), 'safe');
  await fs.symlink('/tmp/video-marketplace-restore-outside', path.join(source, 'escape'));
  let result = await run('tar', ['-czf', symlinkArchive, '-C', source, '.']);
  if (result.code !== 0) throw new Error(`symlink archive creation failed: ${result.stderr}`);
  await expectRestoreRejected(symlinkArchive);

  await fs.rm(path.join(source, 'escape'));
  await fs.writeFile(path.join(source, 'original.txt'), 'hardlink target');
  await fs.link(path.join(source, 'original.txt'), path.join(source, 'hardlink.txt'));
  result = await run('tar', ['-czf', hardlinkArchive, '-C', source, '.']);
  if (result.code !== 0) throw new Error(`hardlink archive creation failed: ${result.stderr}`);
  await expectRestoreRejected(hardlinkArchive);

  console.log('media restore archive security acceptance: PASS');
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}
