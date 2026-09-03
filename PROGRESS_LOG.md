# Development Progress Log

## 2026-09-03 — Milestone 516 — Seller product workflow copy alignment

### What changed
- Re-read the current seller product UI and acceptance contract before editing.
- Corrected the new-product editor guidance so it no longer implies that a separately uploaded media asset can be attached to an arbitrary existing product.
- The UI now accurately explains the current supported workflow: create the product first, or use Upload video to create a video-backed draft.
- No backend behavior was changed.

### Acceptance boundary
- Source change is committed.
- No new GitHub Actions run has been independently confirmed for this milestone.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Fresh seller product acceptance remains required for the current UI/API state.

### Commit
- `eae2ae3da1637d7c251c55a2c92774959ebcedc9` — clarify seller product video workflow.

## 2026-09-03 — Milestone 515 — Seller product browser acceptance

### What changed
- Added a dedicated Playwright acceptance spec for the creator's My videos page.
- Verifies that attached media readiness is surfaced to the seller.
- Verifies publishing is disabled while media is processing.
- Verifies publishing is enabled for ready media and calls the publish endpoint.
- Verifies a seller can create a draft product without a video and is left with the expected catalog state.
- Keeps the test at the browser contract level, while the backend remains responsible for ownership and publish validation.

### Acceptance boundary
- Acceptance coverage is now present for the seller product page.
- The new spec has been committed but has not yet been independently executed in a newly confirmed GitHub Actions run.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Current seller UI/API changes therefore remain pending fresh execution.

### Commit
- `cc0e3957b83b9ffd26f1e504097695ced928bc88` — add seller product browser acceptance.

## 2026-09-03 — Milestone 514 — Seller product media unlink contract

### What changed
- Re-read the current seller product API before changing the media-link update contract.
- Made `mediaAssetId` PATCH semantics explicit: omitted means keep the current media, while an explicit `null` clears the product's media attachment.
- Preserved seller ownership validation for any newly attached media asset.
- Preserved the published-product edit lock and backend publish validation.
- This closes an ambiguity that could otherwise prevent a seller from intentionally removing a video from a draft product.

### Acceptance boundary
- Source change is committed.
- No new GitHub Actions run has been independently confirmed for this milestone.
- Existing application/browser acceptance remains GREEN only at the recorded checkpoint `4085a201d53c17ffcfbc88f222bb046380118661`.
- Fresh seller product acceptance is still required for the current API/UI state.

### Commit
- `6b35538cbb0d04422d44c0aaf05026b2ab5a33ac` — make seller media unlink semantics explicit.
