# Development Progress Log

## 2026-09-03 — Milestone 498 — Production protected media storage adapter

### What changed
- Added an S3-compatible protected media storage adapter using AWS Signature V4 request signing with Node's built-in crypto/fetch APIs, avoiding an additional runtime SDK dependency.
- Added support for authenticated GET/HEAD/PUT/DELETE operations and HTTP Range reads through the storage abstraction.
- Added `MEDIA_STORAGE_PROVIDER=s3` configuration with bucket, region, access key, secret key and optional custom endpoint for S3-compatible services such as Cloudflare R2 or MinIO.
- Added a production safety guard: `MEDIA_STORAGE_PROVIDER=local` is rejected when `NODE_ENV=production`, preventing accidental deployment with local filesystem media storage.
- Updated `backend/.env.example` with the production storage settings and explicit local-development-only guidance.

### Acceptance boundary
- The production storage path is implemented but requires provider-specific integration testing against the chosen production object-storage service before it can be called production-GREEN.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Live deployment gates still include provider integration test, production PostgreSQL, payment/webhooks, HTTPS/secrets, backup/restore, legal pages, final browser acceptance and commercial license review.

### Commits
- `d6862c3440e2ab94e5f7e8f1fd5833d651b5e74e` — added S3-compatible storage adapter.
- `af8f8fd0797922e1791487e3c447f36e173ff9c3` — wired S3 provider and production local-storage guard.
- `210ffd44943d0f1e96c464a43b6f054ac617ec07` — documented S3 production configuration.

## 2026-09-03 — Milestone 497 — Commercial release archive validation hardened

### What changed
- Strengthened `.github/workflows/release-package-check.yml` so the generated commercial ZIP is tested with `unzip -t` before artifact upload.
- Added assertions for required package entries: `package.json`, `README.md`, and `RELEASE_MANIFEST.txt`.
- Added archive-level rejection checks for `.env` files, `node_modules`, `dist`, `.git`, `.DS_Store`, and credential/key extensions (`.pem`, `.key`, `.p12`, `.pfx`).
- Preserved the existing release safety check and clean Node 20 packaging flow.

### Acceptance boundary
- The workflow is now stricter, but a successful run for this latest commit still needs independent confirmation before the release gate can be called GREEN.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Customer/live deployment gates remain separate: production infrastructure, live payment credentials/webhooks, protected media storage, HTTPS/secrets, backup/restore, final production browser acceptance, and final commercial license review.

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
