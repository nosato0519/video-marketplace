import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'app', 'main.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'app', 'admin', 'admin-dashboard.html'), 'utf8');
const moderation = fs.readFileSync(path.join(root, 'app', 'admin', 'moderation.html'), 'utf8');
const verifications = fs.readFileSync(path.join(root, 'app', 'admin', 'admin-verifications.js'), 'utf8');

assert.match(main, /renderAdminDashboard/);
assert.match(main, /renderAdminVerifications/);
assert.match(main, /adminMatch/);
assert.match(dashboard, /admin-dashboard\.js/);
assert.match(dashboard, /renderAdminDashboard/);
assert.match(moderation, /\/api\/admin\/content\/reviews/);
assert.match(moderation, /\/api\/admin\/content\/reports/);
assert.match(moderation, /\/takedown/);
assert.match(moderation, /r\.status===401\|\|r\.status===403/);
assert.match(verifications, /bindSellerVerificationReviewPage/);

console.log('Admin entrypoint and route contract checks passed.');
