import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('server uses configured protected media wiring', () => {
  assert.match(source, /registerConfiguredMediaStreamRoutes\(app\)/);
  assert.match(source, /from '\.\/media\/media-stream-app\.js'/);
  assert.doesNotMatch(source, /registerProtectedMediaRoutes\(app\)/);
});

test('protected media wiring is registered after session user loading', () => {
  const sessionIndex = source.indexOf('app.use(loadSessionUser)');
  const mediaIndex = source.indexOf('registerConfiguredMediaStreamRoutes(app)');
  assert.ok(sessionIndex >= 0);
  assert.ok(mediaIndex > sessionIndex);
});
