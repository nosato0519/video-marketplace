# Development Progress Log

## 2026-09-03 — Milestone 511 — Seller upload acceptance alignment

### What changed
- Re-read the current seller upload implementation and its browser acceptance test before making the next change.
- Found two UI/test contract mismatches introduced by the previous visual polish: the title field's accessible name changed from `Title`, and the success message no longer had the exact text expected by the existing acceptance test because the navigation link was embedded in the same text node.
- Restored the accessible name `Title` while keeping the visible label `Product title`.
- Separated the success message text from the `Open My videos` navigation link so the existing acceptance assertion can continue to target the success message precisely.
- No backend behavior was changed.

### Acceptance boundary
- Source fix committed.
- The existing seller upload acceptance test has not been executed in a newly confirmed GitHub Actions run yet.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.

### Commit
- `44a8494bae70d33b8470afc3616d7fca705e3768` — align seller upload UI with the existing acceptance contract.

## 2026-09-03 — Milestone 510 — Seller upload UI polish

### What changed
- Re-read the existing seller upload page, browser acceptance test and backend upload/product routes before editing.
- Replaced the basic seller upload form with a polished creator workspace layout.
- Added a clear video-selection dropzone, selected-file feedback, product metadata form and secure-delivery explanation.
- Kept the existing upload API contract and protected media flow unchanged.
- Kept the existing acceptance-test selectors (`#video-file`, `Title`, `Description`, `Price (JPY)`, `Upload and create draft`) compatible with the current browser test.
- Added responsive styling for the upload workspace.

### Acceptance boundary
- Source changes are committed.
- No new GitHub Actions run has been independently confirmed for this milestone.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- The upload flow is now substantially more polished, but the updated seller UI still needs fresh browser acceptance execution before being called newly GREEN.
- Live object-storage integration is still not claimed as production-verified.

### Commits
- `40e8de89f7ecd227f4a927495b6e2fd6ab03eb27` — polished seller upload UI.
- `b21a589df861191fbd359cc6e535c07bd189e5e2` — added responsive upload workspace styling.

## 2026-09-03 — Milestone 509 — Seller product-management UI polish

### What changed
- Re-read the current seller routing, product API and seller upload flow before editing to avoid duplicating existing backend work.
- Replaced the seller product page's browser `prompt()` workflow with an in-page product editor form.
- Added structured title, description, price and currency fields for product creation/editing.
- Added clearer product status, video-attached state, marketplace visibility state and contextual actions.
- Added direct navigation from products to the secure video upload flow when a product has no video attached.
- Added responsive seller product cards/editor styling without changing the existing seller API contract.
- Preserved the existing server-side seller ownership and publish validation; this milestone is a frontend UX improvement, not a replacement for backend authorization.

### Acceptance boundary
- Source changes are committed.
- No new GitHub Actions run has been independently confirmed for this milestone.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- The seller UI now has a production-style form instead of prompt dialogs, but full browser acceptance of the new product-management interactions still needs to be executed.

### Commits
- `05f3e1cc27b0fae5c9971d6027554d0a726b266a` — replaced seller product prompts with an in-page editor.
- `86cb9c0e7ec5736c4fd31f9b1ffcbaf21a8b8647` — added seller product-management styling.

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
