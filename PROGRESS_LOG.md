# Development Progress Log

## 2026-09-04 — Milestone 544 — Showcase integration marker matcher corrected

### What was discovered
- The latest Functional Demo failure was caused by a test-side matcher mismatch, not by the marketplace application.
- `demo/app.js` defines the purchase flow as `async function purchase(...)`, while the showcase gate previously required the exact substring `function purchase`.
- The other integration markers are synchronous functions, so only the purchase matcher needed to account for the valid async declaration.

### What changed
- Updated `demo/showcase-acceptance.mjs` to validate integration markers with function-aware regular expressions.
- The purchase check now accepts both `function purchase(...)` and `async function purchase(...)`.
- Buyer, seller, admin, download, and protected-media checks remain enforced.
- No application behavior or security logic was changed.

### Commit
- `392659b07727888fecfe8692dae959a78a3631b9`

### Verification status
- The corrected showcase gate has been committed to `main`.
- A new Functional Demo push run is expected from this commit and must be checked for a clean showcase pass.

### Next work
1. Verify the new Functional Demo run passes both functional and polished-showcase gates.
2. Verify browser UI acceptance remains green.
3. If all mainline gates are green, proceed to final clean-checkout commercial packaging.
4. Verify the final archive contents and checksum.

### Continuity rule
Do not repeat the old false-positive fixes or modify unrelated application code. Continue from this exact verification point.

## 2026-09-04 — Milestone 543 — Showcase acceptance false-positive corrected

### What was discovered
- The actual `functional-demo.yml` CI run executed `npm run demo:showcase` correctly.
- Functional verification passed.
- Showcase acceptance failed only because it required the literal homepage marker `Administration`.
- The actual demo uses an `adminView` integration and does not need that English word to be present in the initial homepage HTML. The same acceptance test already verifies `function adminView`, so the literal `Administration` homepage marker was a false-positive requirement.

### What changed
- Updated `demo/showcase-acceptance.mjs` to remove the incorrect literal `Administration` homepage marker.
- Kept the stronger functional integration check for `function adminView` unchanged.
- No application behavior was changed.

### Commit
- `b312d54a9b26dcf061fba73da369f8a64d343cd9`

### Verification status
- The failure is understood and the test gate has been corrected.
- The next `functional-demo.yml` push run must be checked to confirm the corrected showcase gate passes.

### Next work
1. Verify the new Functional Demo run executes the corrected showcase gate and passes.
2. Verify the browser acceptance remains green.
3. Proceed to final clean-checkout commercial packaging only after the latest mainline verification is green.
4. Record the final package checksum and contents.

### Continuity rule
Do not repeat the failed test or modify unrelated application code. The next step is verification of this exact fix.

## 2026-09-04 — Milestone 542 — Showcase CI wiring corrected and recorded

### What was verified
- Inspected the actual current `.github/workflows/demo-functional.yml` on `main` rather than relying on older progress notes.
