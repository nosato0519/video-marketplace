import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const adminIndex = fs.readFileSync(path.join(root, 'admin', 'index.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'app', 'admin', 'admin-dashboard.html'), 'utf8');
const moderation = fs.readFileSync(path.join(root, 'app', 'admin', 'moderation.html'), 'utf8');

assert.match(adminIndex, /admin-dashboard\.html/);
assert.match(adminIndex, /admin\/moderation\.html/);
assert.match(dashboard, /admin-dashboard\.js/);
assert.match(dashboard, /renderAdminDashboard/);
assert.match(moderation, /\/api\/admin\/content\/reviews/);
assert.match(moderation, /\/api\/admin\/content\/reports/);
assert.match(moderation, /\/takedown/);
assert.match(moderation, /r\.status===401\|\|r\.status===403/);

console.log('Admin static entrypoint contract checks passed.');
