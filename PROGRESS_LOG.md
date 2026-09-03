# Development Progress Log

## 2026-09-03 — Milestone 495 — Automated release gates recorded GREEN

### What changed
- Verified the major automated release gates for application commit `4085a201d53c17ffcfbc88f222bb046380118661`.
- Clean Install passed on Node 20 and Node 22, including dependency installation, migration preflight, migrations, migration-state verification and core regression tests.
- Browser UI Acceptance passed with Playwright/Chromium Buyer browser acceptance and browser module smoke.
- Updated `RELEASE_READINESS.md` so the repository records this exact GREEN checkpoint without incorrectly claiming that later documentation commits were independently browser-tested.
- Added `COMMERCIAL_LICENSE_TEMPLATE.md` as the starting point for customer-specific commercial licensing and redistribution terms.

### Acceptance boundary
- Automated application validation is GREEN at the recorded application commit.
- This does not make a customer deployment live-ready: production infrastructure, live payment credentials/webhooks, storage, HTTPS, backup/restore, customer legal pages and final desktop/mobile production browser acceptance remain deployment-specific gates.
- The commercial license template is not a final legal agreement and must be completed/reviewed before paid delivery.

### Commits
- `4085a201d53c17ffcfbc88f222bb046380118661` — verified application checkpoint.
- `93a267f7b868a52011443dc0fd0c836f46ae43fe` — commercial license template.
- `4089cb46a7e73d6692213167d820bb2672f959da` — release readiness documentation update.

## 2026-09-03 — Milestone 494 — Production catalog backend-only hardening

### What changed
- Hardened the real application catalog renderer in `app/catalog/catalog-view.js` so the production-facing storefront explicitly requests `allowFallback: false`.
- Removed the silent demo-fixture fallback from the real application catalog path. If the marketplace API is unavailable, the storefront now clearly reports that the catalog is temporarily unavailable and offers Retry instead of presenting fake/demo inventory as if it were live.
- Kept the demo fixture fallback available to the separate lightweight `demo/` harness; the production application and showcase remain intentionally separated.
- Preserved existing catalog search, category filtering, product navigation and backend API behavior.

### Acceptance boundary
- This is a concrete production-release hardening change: the customer-facing application can no longer silently mask a backend/catalog outage with demo data.
- Browser/CI acceptance for this new commit is still required before declaring GREEN.

### Commits
- `3fc3230affb3bb6ef0aaa0cd1d39388f7c130f0d` — require real backend catalog data in production application.
