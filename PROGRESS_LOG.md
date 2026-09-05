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
- **V9 is the official visual baseline for the VIDORA customer-facing demo top page.**
- V9 remains the rollback/reference point for all future experiments unless a new baseline is explicitly accepted.
- Purpose: always return to a known-good visual direction instead of rebuilding from memory or stacking uncontrolled CSS generations.

### V9 baseline characteristics
- Top-page stylesheet: `demo/ott-home-v9.css`.
- First-view/hero is intentionally compact rather than oversized.
- Main "人気の動画" area is a strict **3 columns × 3 rows** layout.
- All nine video cards use the same grid position/rhythm; no featured first-card enlargement.
- No intentional staggered card offsets in the popular-video grid.
- Palette is restrained: deep charcoal / warm white / neutral gray with one muted accent color.
- The top page remains a customer-facing commercial showcase, not an admin/test screen.
- Current phase remains visual-only; business/application functionality is not being changed during this design phase.

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

- V10 added a large `WATCH / BUY / OWN` typography section below the hero.
- V10 was rejected as the preferred direction; V9 remains the rollback/reference point.

## Milestone 575 — VIDORA Top Page V11 Staggered Video Gallery Experiment

- V11 experimented with making the popular-video area itself staggered.
- This was rejected: **人気の動画は通常3列×3段の見せ方を維持する**.
- V9 remains the rollback/reference point.

## Milestone 576 — VIDORA Top Page V12 Separate Video Showcase Experiment

- V12 kept the V9-style hero, trust bar, and popular-video grid while adding a separate video showcase between hero and trust bar.
- The showcase used multiple video visuals in an asymmetric composition to communicate variety without changing the popular-video grid.
- Trust bar retained the four benefit messages: safe payment, immediate viewing, download support, protected delivery.
- V9 remains the rollback/reference baseline.

## Milestone 577 — VIDORA Top Page V13 Cinematic Hero + Category Imagery Experiment

### Purpose
- V13 is another visual experiment built on the V9/V12 direction; it is **not a new completion baseline**.
- The goal is to make the first viewport feel more premium and immediately communicate that VIDORA can host many kinds of video content.

### Changes
- Replaced the hero's previous background image with a **new wide cinematic image**; it is intentionally low-opacity and heavily darkened so the hero copy remains readable.
- The hero image is different from the category imagery; no intentional image reuse between the hero and category cards.
- Added image-backed category cards with unique imagery for each existing category.
- Added an **18+ / Adult** category card using a tasteful, non-explicit mature fashion/editorial image.
- Category cards use dark overlays, readable labels, and subtle hover zoom rather than bright decorative effects.
- The existing popular-video section remains unchanged in concept: **3 columns × 3 rows**, equal card rhythm, no featured enlargement.
- No business/application functionality was changed.

### Files
- `demo/ott-home-v13.css`
- `demo/launcher.mjs`

### Status
- V13 is the current visual experiment awaiting inspection.
- V9 remains the official rollback/reference baseline.
- Current position remains Screen #1: **Top page**; do not proceed to Screen #2 until the top page is accepted.

## Milestone 578 — Requested visual corrections only

- Reduced the three overlapping hero images substantially so they no longer dominate the first viewport.
- Restored the missing **ADULT / アダルト** category in the rendered homepage without removing the existing lifestyle category.
- Kept the popular-video area as the required normal 3-column × 3-row grid; no stagger was applied there.
- Kept the separate "作品との出会いを、もっと自由に。" section above the trust bar and made its five unique image cards visibly stagger vertically.
- Kept the existing trust-bar messages and the rest of the page structure unchanged.
- Refreshed the active stylesheet cache version to V17 so Render serves the corrected visual immediately.

## Milestone 579 — Expanded video marketplace content

- Preserved the existing hero, trust bar, and **人気の動画** 3-column × 3-row grid.
- Added a **新着動画** section with 6 additional image-backed video cards.
- Added a **気分から選ぶ** visual rail with 5 image-led collections, including an 18+ adult-oriented collection.
- Every newly added card uses a distinct image URL; no new card intentionally reuses another new card's image.
- Kept **作品との出会いを、もっと自由に。** as a separate staggered visual section.
- This is visual/content expansion only; existing application functionality is untouched.

### Files changed
- `demo/ott-home-v13.css`
- `demo/launcher.mjs`
- `PROGRESS_LOG.md`

### Status
- Render auto-deploy is processing the new homepage content.
- V9 remains the official rollback/reference baseline.
- Current position remains Screen #1: **Top page**.
