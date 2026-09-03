# Development Progress Log

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

## 2026-09-03 — Milestone 504 — Buyer library responsive polish

### What changed
- Continued from Milestone 503 after re-reading the current buyer library, router, media URL helper and existing progress log.
- Added dedicated responsive styling for the purchased-library cards and secure video player.
- Added ready/processing/unavailable visual states, responsive two-column-to-single-column behavior, and a clearer player shell without changing the protected media URL contract.
- Confirmed the frontend continues to use server-side `/api/media/:productId/stream` and `/api/media/:productId/download` endpoints rather than exposing storage locations.

### Acceptance boundary
- Frontend changes were committed, but no post-change GitHub Actions/browser acceptance run was independently confirmed at this milestone.
- The existing application acceptance checkpoint remains `4085a201d53c17ffcfbc88f222bb046380118661`.
- Live Stripe and object-storage integration remain required before production-GREEN.

### Commit
- `5823f022c40e83cf10dcbf5ffc2d9d608ec1a26b` — polished buyer library and secure player responsive layouts.

## 2026-09-03 — Milestone 503 — Buyer library and secure-player UX

### What changed
- Reviewed the existing buyer library/watch implementation before making changes to avoid repeating completed backend work.
- Improved the buyer library presentation around purchased videos, purchase count, purchase date, media readiness and unavailable states.
- The Watch action is shown only when the protected media asset is ready and streaming is enabled.
- The Download action is shown only when the protected media asset is ready and downloads are enabled.
- Added clearer secure-player presentation and a protected-playback explanation.
- Kept media URLs server-derived; the UI does not expose storage keys or object-storage credentials.

### Acceptance boundary
- This is a frontend UX improvement committed on `main`.
- It had not yet been independently verified by GitHub Actions/browser acceptance after this change.
- Backend protected-media authorization and range handling were already implemented and tested in prior milestones; they were not duplicated here.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.

### Commit
- `988627831549d9aa8e07e061b8f590a83847c0e2` — improved buyer library and secure player experience.

## 2026-09-03 — Milestone 502 — Protected S3 media regression coverage

### What changed
- Added dedicated unit/regression coverage for the S3-compatible protected-media adapter.
- Verified signed GET requests preserve byte-range headers for resumable video delivery.
- Verified HEAD metadata, PUT upload, and DELETE operations all pass through the signed storage boundary.
- Verified traversal and absolute-path storage keys are rejected before any network request.
- Extended the payment regression workflow to execute the S3 media adapter suite alongside payment and webhook tests.

### Acceptance boundary
- The new tests validate request construction and storage-boundary behavior without requiring production credentials or a live object store.
- A live S3/R2/MinIO integration test is still required before declaring the adapter production-GREEN.
- The latest workflow execution had not yet been independently confirmed through GitHub Actions.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.

### Commits
- `d2dcaab4658d68da08c8ef8b7a1876a368476ea2` — added S3 media adapter regression tests.
- `dd279943c61fcd859f674185ef6a47533dc8a3d0` — added the S3 suite to payment regression CI.

## 2026-09-03 — Milestone 501 — Payment regression CI gate

### What changed
- Added a dedicated GitHub Actions workflow for the payment regression suite.
- The workflow runs on pushes and pull requests targeting `main`.
- It uses a clean Node 20 environment with `npm ci`.
- It executes the Stripe payment-provider regression tests and Stripe webhook regression tests independently from the broader acceptance suite.

### Acceptance boundary
- The workflow is wired to validate the latest payment implementation automatically, but a successful run for the new workflow had not yet been independently confirmed.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Live Stripe and object-storage integration are still required before production-GREEN.

### Commit
- `d18e59d1de4119048e6ee05ccf7d1504ba7521dc` — added payment regression CI workflow.

## 2026-09-03 — Milestone 500 — Stripe settlement amount-unit hardening

### What changed
- Inspected the actual checkout and webhook payment path instead of changing payment code speculatively.
- Found and fixed a production-critical currency-unit mismatch: Stripe Checkout sends monetary amounts in the currency's smallest unit, while the order/payment ledger stores the marketplace amount in normal currency units.
- Added a shared Stripe money conversion module for zero-decimal and three-decimal currencies.
- Checkout now uses the shared conversion logic, and Stripe webhook normalization converts provider amounts back before payment-vs-order verification.
- Added regression coverage for USD, JPY and KWD conversion boundaries.

### Acceptance boundary
- The code-level fix is committed, but the latest payment implementation had not yet been independently confirmed by GitHub Actions at this milestone.
- Existing application acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Live Stripe and object-storage integration are still required before production-GREEN.

### Commits
- `a1e830a66758fdeb20c0b6b0d6e2fb2fe2cf813f` — centralized checkout conversion.
- `a587ff1c5200a98a9246551626736ba5098a6b95` — added shared Stripe money conversion module.
- `4eeb12311836dc84c97da99a641d37d1b6756a57` — normalized webhook amounts before settlement verification.
- `fbcb97ab1d0141ce2f938a895801424ed6f96b06` — added conversion regression tests.

Previous milestone: 498 — Production protected media storage adapter.
