# VIDORA Progress Log

## Milestone 569 — Visual-only demo phase scope locked

- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Current phase: **customer-facing demo visual design only**.
- Purpose of this phase: prove that the VIDORA OTT-style video-sales-site look and presentation can be built first.
- **Do NOT implement real application/business functionality in this phase.** Functional implementation comes later as a separate phase.
- Existing code may contain legacy/demo interaction scaffolding from earlier work, but the current development objective is visual presentation. Do not expand those functions or treat them as the current acceptance target.

## Milestone 571 — Full screen-design sequence locked

Official screen sequence remains locked: Top page → product list/search → product detail/purchase → account/member screens → watch/purchase completion/payment → seller screens → admin screens → common screens → unified visual polish → function integration → final E2E → sales package.

## Milestone 572 — Persistent design master instruction locked

Mandatory master instruction: `docs/product/design-master-instruction.md`.

## Milestone 573 — VIDORA Top Page Visual Baseline V9

### Baseline status
- **V9 is now the official visual baseline for the VIDORA customer-facing demo top page.**
- This baseline is the starting point for all future top-page refinement unless explicitly replaced by a newly accepted baseline.
- The purpose is to ensure we can always return to this exact direction instead of rebuilding from memory or stacking uncontrolled CSS generations.

### V9 baseline characteristics
- Top-page stylesheet: `demo/ott-home-v9.css`.
- First-view/hero is intentionally compact rather than oversized.
- Main "人気の動画" area is a strict **3 columns × 3 rows** layout.
- All nine video cards use the same grid position/rhythm; no featured first-card enlargement.
- No intentional staggered card offsets.
- Palette is restrained: deep charcoal / warm white / neutral gray with one muted accent color.
- The top page remains a customer-facing commercial showcase, not an admin/test screen.
- Current phase remains visual-only; business functionality is not being changed during this design phase.

### Return-to-baseline rule
- If a future visual experiment is rejected, **return to V9 as the baseline** before starting another direction.
- Do not overwrite or reinterpret V9 as an unrecorded intermediate design.
- Any new design direction must be explicitly recorded as a new milestone and must preserve V9 as the rollback/reference point.

### Current top-page files
- `demo/ott-home-v9.css` — V9 visual baseline.
- `demo/index.html` — top-page markup.
- `demo/launcher.mjs` — serves the active top-page design.

### Current position
- Screen #1: **Top page**.
- V9 is the baseline from which visual experiments start.
- Do not move to screen #2 until the top page is visually accepted.

## Milestone 574 — VIDORA Top Page V10 Impact Typography Experiment

### Purpose
- V10 is an **experiment built on top of the V9 baseline**, not a replacement completion state.
- The V9 baseline remains the rollback/reference point.

### Change
- Added a new black editorial section immediately below the first-view hero.
- Direction: bold oversized typography, restrained charcoal/white/gray palette, muted gold accent.
- Message: `WATCH. / BUY. / OWN.` with supporting copy about discovering, purchasing, and owning video works.
- Existing popular-video section and the rest of the page remain structurally unchanged.
- No business/application functionality was added or changed.

### Files
- `demo/ott-home-v10.css`
- `demo/launcher.mjs`

### Status
- V10 has been committed and Render deployment is in progress.
- This is a visual trial only; accept/reject after visual inspection.
- If rejected, revert to V9 baseline rather than modifying V9 itself.
