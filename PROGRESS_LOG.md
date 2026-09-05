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
- Standalone top-page stylesheet: `demo/ott-home-v9.css`.
- V9 does **not** import V3/V6/V7/V8 or any previous homepage stylesheet.
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
- `demo/ott-home-v9.css` — standalone V9 visual baseline.
- `demo/index.html` — top-page markup; first card is no longer treated as a featured-layout card.
- `demo/launcher.mjs` — serves V9 with cache-busting and no legacy V6/V7/V8 dependency for the top page.

### Current position
- Screen #1: **Top page**.
- V9 is the baseline from which the next visual refinement starts.
- Do not move to screen #2 until the top page is visually accepted.
