import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

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


const publicDocumentAdmin = fs.readFileSync(path.join(root, 'pages', 'admin-page-policies.html'), 'utf8');
const adminSettingsRoutes = fs.readFileSync(path.join(root, 'backend', 'src', 'admin', 'settings-routes.js'), 'utf8');
const backendApp = fs.readFileSync(path.join(root, 'backend', 'src', 'app.js'), 'utf8');
const publicHome = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.ok(publicDocumentAdmin.includes('/api/admin/settings/public-documents'));
assert.doesNotMatch(publicDocumentAdmin, /localStorage/);
assert.ok(adminSettingsRoutes.includes("router.get('/settings/public-documents'"));
assert.ok(adminSettingsRoutes.includes("router.put('/settings/public-documents'"));
assert.ok(adminSettingsRoutes.includes("router.use(requireAuth, requireRole('admin'))"));
assert.ok(backendApp.includes('publishedPublicDocumentMiddleware'));
assert.ok(backendApp.includes("'public_documents'"));
assert.ok(backendApp.includes("'/pages/public-support.html': 'contact'"));
assert.ok(!backendApp.includes("'/pages/support.html': 'contact'"));
const policyScriptStart = publicDocumentAdmin.indexOf('<script>') + '<script>'.length;
const policyScriptEnd = publicDocumentAdmin.indexOf('</script>', policyScriptStart);
const policyInlineScript = policyScriptEnd > policyScriptStart ? publicDocumentAdmin.slice(policyScriptStart, policyScriptEnd) : '';
assert.ok(policyInlineScript, 'public document editor script exists');
const policyScriptHash = createHash('sha256').update(policyInlineScript).digest('base64');
assert.ok(backendApp.includes(`'sha256-${policyScriptHash}'`), 'public document editor script is allowed by CSP');
assert.ok(publicHome.includes('id="vm-public-documents-footer"'));
assert.ok(publicHome.includes('id="vm-public-document-links"'));
const siteBranding = fs.readFileSync(path.join(root, 'shared', 'site-branding.js'), 'utf8');
assert.ok(siteBranding.includes('function renderPublicDocumentLinks(documents)'));
assert.ok(siteBranding.includes('link.textContent = item.title'));
assert.ok(siteBranding.includes('column.style.display = column.hidden ? "none" : ""'));

console.log('Admin entrypoint and route contract checks passed.');
