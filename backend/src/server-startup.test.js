import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function read(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

test('server registers protected media routes and keeps JSON parser after webhook registration', () => {
  const source = read('server.js');
  assert.match(source, /registerProtectedMediaRoutes\(app\)/);
  assert.ok(source.indexOf('registerPaymentWebhookRoutes(app)') < source.indexOf('app\.use\(express\.json'));
});

test('server keeps the powered-by header disabled', () => {
  assert.match(read('server.js'), /app\.disable\('x-powered-by'\)/);
});

test('backend package targets Node 20 or newer', () => {
  const pkg = JSON.parse(read('../package.json'));
  assert.equal(pkg.engines.node, '>=20');
});
