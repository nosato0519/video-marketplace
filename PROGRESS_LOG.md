# Development Progress Log

## 2026-08-29 — Milestone 459

### Current focus
Payout runtime verification and truthful concurrency acceptance coverage.

### Completed
- Seller Application integrated into `main`.
- Backend Regression includes Seller Application acceptance.
- `backend-regression.yml` supports `workflow_dispatch`.
- Canonical payout schema and seller/admin payout routes are aligned with migrations.
- Seller payout route uses a PostgreSQL transaction plus `pg_advisory_xact_lock` keyed by seller/currency.

### Important verification finding
The current `backend/scripts/http-seller-profile-earnings-payout-e2e-acceptance.js` does **not** actually test concurrency: the 2,500 JPY request is performed sequentially after the 1,000 JPY request. The repository state previously described this as concurrent coverage, so this is a release-blocking documentation/test mismatch.

### Next exact task
Replace the sequential second payout acceptance with two simultaneous 2,500 JPY HTTP requests against a controlled balance of 3,500 JPY after the initial 1,000 JPY payout. Assert exactly one response is `201` and the other is `409 amount_exceeds_withdrawable_balance`. Then update `PROJECT_STATE.md` with the corrected status and create a PR from a dedicated verification branch.

### Do not claim
- Do not claim payout runtime concurrency verification is green until the corrected concurrent test has actually run in CI.
- Do not claim browser E2E is complete unless a real browser workflow run is observed.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, then inspect the latest commit and open verification PR before continuing.
