# VIDORA Progress Log

## Milestone 569 — Visual-only demo phase scope locked

- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Current phase: **customer-facing demo visual design only**.
- Purpose of this phase: prove that the VIDORA OTT-style video-sales-site look and presentation can be built first.
- **Do NOT implement real application/business functionality in this phase.** Functional implementation comes later as a separate phase.

## Milestone 571 — Full screen-design sequence locked

Official screen sequence remains locked: Top page → product list/search → product detail/purchase → account/member screens → watch/purchase completion/payment → seller screens → admin screens → common screens → unified visual polish → function integration → final E2E → sales package.

## Milestone 572 — Persistent design master instruction locked

Mandatory master instruction: `docs/product/design-master-instruction.md`.

## Milestone 573 — VIDORA Top Page Visual Baseline V9

- **V9 is the official visual baseline/reference**, unless a newer baseline is explicitly accepted.
- Popular videos remain a strict 3-column × 3-row grid; no featured enlargement and no stagger.
- Dark premium editorial direction; restrained accent; customer-facing showcase.
- Screen #1 remains the only active design target; do not move to Screen #2 until homepage visual acceptance.

## Milestone 578 — Requested visual corrections only

- Hero mosaic, ADULT category, separate "作品との出会いを、もっと自由に。" showcase, and normal 3×3 popular-video grid maintained.

## Milestone 579 — Expanded video marketplace content

- Added **新着動画** (6 cards), **気分から選ぶ** (5 collections including 18+), and retained the separate showcase.

## Milestone 580 — Stabilized staggered gallery + expanded recommendations

- Stabilized the separate **作品との出会いを、もっと自由に。** gallery.
- Added **ジャンル別おすすめ** (6 cards).
- Popular-video grid remains normal 3×3.

## Milestone 581 — Homepage visual polish V21

- Larger three-image hero mosaic.
- Fifth showcase card moved lower.
- Restrained accent-color polish.

## Milestone 582 — V22 exact restore point recorded

- User requested returning to the previously recorded **V22 state**, including the complete homepage composition—not merely selected sections.
- Historical V22 restore point: `452e7ba01686f80b9aec1b4948e637c370fffd6e`.
- V22 homepage includes the full runtime-injected composition: hero, ADULT category, **作品との出会いを、もっと自由に。**, **新着動画**, **気分から選ぶ**, and **ジャンル別おすすめ**.
- `main` was reset to this V22 restore point. Do not mix V23/V24 visual changes into this baseline.
- `demo/ott-home-v16.css` is the active V22 stylesheet and imports the V21 chain.

### Next session — exact continuation point

- Start **here**, without rebuilding from memory and without repeating completed work.
- First verify the actual rendered homepage against the V22 restore point, especially:
  1. the very top hero / three-image mosaic and its text placement;
  2. **作品との出会いを、もっと自由に。** and its five-card arrangement;
  3. all V22-added sections: **新着動画 / 気分から選ぶ / ジャンル別おすすめ**;
  4. the normal **人気の動画 3×3** grid.
- If the rendered page differs from V22, restore the missing V22 pieces **before** doing any new design work.
- Any technical runtime repair must preserve the V22 visual/content state exactly and is not a new visual version.
- Do not move to Screen #2 until the homepage is visually accepted.

### Current position
- Screen #1: **Top page**.
- **V22 is the exact restore target and starting point for the next session.**
