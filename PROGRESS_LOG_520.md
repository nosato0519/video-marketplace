# Development Progress Log — Milestone 520

## 2026-09-03 — Payment regression workflow dependency scope correction

### What changed
- Re-checked the post-fix `Payment Regression` run instead of assuming the Stripe dependency correction was sufficient.
- The new run installed the root package successfully and passed `payment-provider.test.js`, but `stripe-webhook.test.js` failed because the webhook test imports `express` from the backend package.
- Confirmed the backend already has its complete runtime dependency set in `backend/package.json`: Express, Helmet, PostgreSQL and Stripe.
- Corrected `.github/workflows/payment-regression.yml` so the regression job runs from `backend/` and installs the backend dependencies from `backend/package.json`.
- Removed the temporary root-level Stripe dependency from `package.json`; backend dependencies remain scoped to the backend package.

### Verification evidence
- Previous failing run: `33742662508` — payment-provider tests passed, webhook tests failed with `ERR_MODULE_NOT_FOUND: Cannot find package 'express'`.
- Corrected workflow commit: `03744825cdab5e12491ddc2d4a6cd3fbc7798092`.
- New `Payment Regression` run: `33743766589` — **SUCCESS**.
- The successful run passed payment-provider, Stripe webhook and protected S3 media regression stages.
- `Backend Browser Acceptance` run `33743766647` was still in progress when this milestone was recorded.

### Current state
- Payment regression is now independently GREEN on the corrected workflow.
- Root package no longer carries backend-only runtime dependencies.
- No demo code was changed in this milestone.

### Next gate
- Wait for/inspect the current Backend Browser Acceptance result.
- Then return to the demo acceptance/polish pass.
- Candidate demo issue already identified: the filter UI uses `All categories` while the demo filter logic expects `All`; verify and fix this without touching production backend code.
