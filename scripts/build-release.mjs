import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname, '..');
const distRoot = path.join(root, 'dist');
const staging = path.join(distRoot, 'vidora-commercial');
const archive = path.join(distRoot, 'vidora-commercial.zip');
const checkOnly = process.argv.includes('--check');

const include = [
  'app',
  'backend',
  'demo',
  '.github',
  '.devcontainer',
  'README.md',
  'COMMERCIAL_PACKAGE.md',
  'COMMERCIAL_LICENSE_TEMPLATE.md',
  'PRODUCT_VISION.md',
  'PROJECT_STATE.md',
  'RELEASE_READINESS.md',
  'PROGRESS_LOG.md',
  'package.json',
  'package-lock.json',
];

const forbiddenNames = new Set([
  '.env', '.env.local', '.env.production', '.env.development',
  'node_modules', 'dist', '.git', '.DS_Store',
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
  /(?:^|[^A-Z0-9_])sk_(?:live|test)_[A-Za-z0-9]+/i,
  /whsec_[A-Za-z0-9]+/i,
  /(?:^|[^A-Za-z0-9_])ghp_[A-Za-z0-9_]+/i,
  /github_pat_[A-Za-z0-9_]+/i,
  /GITHUB_CODESPACE_TOKEN\s*=\s*[^<\s]+/i,
];

function fail(message) {
  console.error(`RELEASE CHECK FAILED: ${message}`);
  process.exitCode = 1;
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (forbiddenNames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function copyEntry(entry) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) throw new Error(`Required release entry is missing: ${entry}`);
  const target = path.join(staging, entry);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, filter: (src) => {
    const relative = path.relative(root, src);
    return !relative.split(path.sep).some((part) => forbiddenNames.has(part));
  }});
}

function gitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return process.env.GITHUB_SHA || 'unknown';
  }
}

if (!fs.existsSync(distRoot)) fs.mkdirSync(distRoot, { recursive: true });
if (!checkOnly) fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

for (const entry of include) copyEntry(entry);

const files = walk(staging).sort();
const violations = [];
for (const file of files) {
  const relative = path.relative(staging, file).replaceAll(path.sep, '/');
  const parts = relative.split('/');
  if (parts.some((part) => forbiddenNames.has(part))) violations.push(`${relative}: forbidden path`);
  if (/\.(?:pem|key|p12|pfx)$/i.test(relative)) violations.push(`${relative}: credential/key file`);
  if (fs.statSync(file).size > 25 * 1024 * 1024) violations.push(`${relative}: unexpectedly large file`);
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of secretPatterns) if (pattern.test(text)) violations.push(`${relative}: possible secret pattern`);
  } catch {
    // Binary media/assets are allowed; the path/extension checks above still apply.
  }
}

const manifest = [
  'VIDORA Commercial Package Manifest',
  `Source commit: ${gitSha()}`,
  `Generated: ${new Date().toISOString()}`,
  `Files: ${files.length}`,
  '',
  ...files.map((file) => path.relative(staging, file).replaceAll(path.sep, '/')),
  '',
].join('\n');
fs.writeFileSync(path.join(staging, 'RELEASE_MANIFEST.txt'), manifest);

if (violations.length) {
  for (const violation of violations) console.error(`- ${violation}`);
  fail(`${violations.length} release safety issue(s) detected`);
} else {
  console.log(`Release safety check passed: ${files.length} files`);
}

if (checkOnly || process.exitCode) process.exit(process.exitCode || 0);

try {
  fs.rmSync(archive, { force: true });
  execFileSync('zip', ['-qr', archive, path.basename(staging)], { cwd: distRoot, stdio: 'inherit' });
  console.log(`Release archive created: ${archive}`);
} catch (error) {
  fail('The zip command is required to create the commercial archive. Run the release check separately if packaging is unavailable.');
  console.error(error?.message || error);
}
