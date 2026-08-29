# Development Progress Log

## 2026-08-29 — Milestone 460

### Current focus
Payout runtime verification, truthful concurrency acceptance, and API policy consistency.

### Completed
- Seller Application integrated into `main`.
- Backend Regression includes Seller Application acceptance.
- `backend-regression.yml` supports `workflow_dispatch`.
- Canonical payout schema and seller/admin payout routes are aligned with migrations.
- Seller payout route uses a PostgreSQL transaction plus `pg_advisory_xact_lock` keyed by seller/currency.
- Corrected the payout acceptance concurrency case to issue two simultaneous 2,500 JPY requests against a 3,500 JPY remaining withdrawable balance, asserting exactly one `201` and one `409 amount_exceeds_withdrawable_balance`.
- **2026-08-29:** Source audit found the seller payout route did not enforce the existing 1,000 JPY minimum defined by `payout-policy.js`. The route now rejects amounts below 1,000 JPY with `400 minimum_payout_not_reached`.
- **2026-08-29:** Payout HTTP acceptance now explicitly verifies a 999 JPY request is rejected before exercising the normal 1,000 JPY and concurrent 2,500 JPY cases.

### Important verification findings
- The corrected concurrency test is implemented but has not yet been observed in a real CI run.
- The payout migration permits any positive amount, so the minimum payout is an application-level policy and must be enforced by the route.
- `payout-policy.js` already defines the intended minimum as 1,000 JPY, so the route and acceptance test are now aligned with that policy.

### Do not claim
- Do not claim payout runtime concurrency verification is green until the corrected test has actually run in CI.
- Do not claim browser E2E is complete unless a real browser workflow run is observed.
- Do not claim the entire product is release-ready while runtime, clean-install, and browser verification remain outstanding.

### Current exact checkpoint
Latest main changes:
- `cbba56541f2e4e8702a55bd267e28b506d449dcf` — enforce minimum seller payout amount in API route.
- `cde683eea2cb2aa32cf64edf9a62dea2bae0df45` — add minimum payout acceptance coverage.

### Next exact task
Run/observe the payout acceptance workflow against the latest main descendant containing both the true concurrency test and minimum-payout test. If the connected GitHub controls cannot dispatch a workflow, continue source-level verification without marking runtime green. After payout runtime verification, proceed to fresh migration/existing-install checks, then authenticated Seller/Buyer/Admin browser E2E.

### Continuation rule
On restart, read this file and `PROJECT_STATE.md` first, then inspect the latest main commit, workflow runs, and repository tree before continuing. After every meaningful milestone, update both checkpoint files with current status and exact next step.
