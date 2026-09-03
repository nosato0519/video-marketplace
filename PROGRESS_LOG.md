# Development Progress Log

## 2026-09-03 — Milestone 508 — S3 canonical-path hardening

### What changed
- Re-inspected the current S3-compatible media adapter and its regression suite before continuing.
- Hardened SigV4 canonical-path handling for object keys containing an encoded slash (`%2F`), preventing the canonical request from accidentally turning an encoded object-key character into a path separator.
- Retained path-style bucket handling for custom S3-compatible endpoints and the existing signed GET/HEAD/PUT/DELETE boundary.

### Acceptance boundary
- Source-level hardening is committed.
- No real AWS S3/R2/MinIO integration test was executed, so external-provider compatibility is not claimed as production-verified.
- No new GitHub Actions run has been independently confirmed for this commit.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.

### Commit
- `df8fb76b171bfcaf7acd790aff28f6a8c4e3e0c7` — hardened S3 canonical path handling.

## 2026-09-03 — Milestone 507 — S3-compatible endpoint hardening

### What changed
- Re-inspected the S3 adapter and regression tests.
- Fixed custom `MEDIA_S3_ENDPOINT` object URL construction so the configured bucket is included before the server-generated storage key.
- Added regression assertions covering the resulting bucket/object URL for GET, HEAD, PUT and DELETE.

### Acceptance boundary
- Source-level regression coverage is committed.
- No real AWS S3/R2/MinIO integration test was executed, so external-provider compatibility is not claimed as production-verified.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.

### Commit
- `15f8e2ec7cba590543152728f08e98be7d89a951` — hardened S3-compatible object URL construction.

## 2026-09-03 — Milestone 506 — Payment regression CI repair

### What changed
- Checked the actual GitHub Actions result instead of assuming the payment regression workflow had executed its tests.
- Found the workflow was failing at `actions/setup-node` because the root repository has no `package-lock.json`, while the workflow requested npm caching and `npm ci`.
- Changed the payment regression workflow to use Node 20 without lockfile-dependent npm caching and `npm install`, matching the repository's existing browser E2E installation pattern.
- Kept the payment-provider, Stripe webhook, and protected S3 media regression suites unchanged.

### Acceptance boundary
- The previous run failed before any regression tests executed; it was an infrastructure/install failure, not evidence of a product-code failure.
- The repair has been committed, but a new successful GitHub Actions run has not yet been independently confirmed.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Live Stripe and object-storage integration remain required before production-GREEN.

### Commit
- `09e71f3697053fd09c5107fdc3d177c84ed3a44a` — fixed payment regression workflow installation.

## 2026-09-03 — Milestone 505 — Buyer browser acceptance alignment

### What changed
- Re-read the latest buyer progress checkpoint and inspected the real backend buyer browser acceptance test before editing.
- Found a concrete test/UI contract drift: the current library UI exposes `Watch now`, while the acceptance test was still looking for `Watch`.
- Updated the acceptance test to assert the current `Watch now` action and the visible `Ready to watch` state.
- Kept the end-to-end assertions for registration → browse → product → order → payment settlement → library → protected watch URL → protected download intact.

### Acceptance boundary
- The test correction is committed but had not yet been independently executed in GitHub Actions at the time of this milestone.
- The existing application/browser acceptance checkpoint remains the previously recorded GREEN checkpoint; this commit must be re-run through the browser acceptance workflow before treating it as newly GREEN.
- No production deployment or live Stripe/object-storage claim is made.

### Commit
- `23ccaffc843b8ce5075938102d13582c5d9ef2ec` — aligned buyer browser acceptance with current library UX.
