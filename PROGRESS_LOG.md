# Development Progress Log

## 2026-09-03 — Milestone 497 — Commercial release archive validation hardened

### What changed
- Strengthened `.github/workflows/release-package-check.yml` so the generated commercial ZIP is tested with `unzip -t` before artifact upload.
- Added assertions for required package entries: `package.json`, `README.md`, and `RELEASE_MANIFEST.txt`.
- Added archive-level rejection checks for `.env` files, `node_modules`, `dist`, `.git`, `.DS_Store`, and credential/key extensions (`.pem`, `.key`, `.p12`, `.pfx`).
- Preserved the existing release safety check and clean Node 20 packaging flow.

### Acceptance boundary
- The workflow is now stricter, but a successful run for this latest commit still needs independent confirmation before the release gate can be called GREEN.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Customer/live deployment gates remain separate: production infrastructure, live payment credentials/webhooks, protected media storage, HTTPS/secrets, backup/restore, legal pages, final production browser acceptance, and final commercial license review.

### Commits
- `703f94d9e63faf7e31dcd90a6d1cd1c2cba6e8a6` — hardened release archive validation.

## 2026-09-03 — Milestone 496 — Commercial release packaging hardening

### What changed
- Added reproducible commercial release packaging commands: `npm run release:check` and `npm run release:package`.
- Added GitHub Actions release-package validation to run from a clean Node 20 environment, perform the safety check, build the ZIP and upload the resulting archive as an artifact.
- Corrected the release script's repository-root resolution so it reliably targets the repository containing `scripts/build-release.mjs` rather than its parent filesystem directory.
- The release script now cleans stale staging/archive output before each run, blocks packaging when safety violations are detected, and includes `RELEASE_MANIFEST.txt` in the package manifest.

### Acceptance boundary
- The release workflow is committed and configured, but no successful workflow run for the new release workflow has been independently confirmed yet.
- Existing application acceptance remains GREEN at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Customer/live deployment gates remain separate: production infrastructure, live payment credentials/webhooks, protected media storage, HTTPS/secrets, backup/restore, legal pages, final production browser acceptance, and final commercial license review.

### Commits
- `8d604e0beccfcf6ac999d49d2a0118e64297b046` — corrected release package root resolution.
- `9ef3f10bec643a510cdf2218821cec3507f2111b` — added release-package CI validation.

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
