# Current Demo Snapshot — 2026-09-07 17:56 JST

This snapshot preserves the exact repository state immediately before the requested clean rebuild.

- Repository: `nosato0519/video-marketplace`
- Source branch: `main`
- Snapshot branch: `snapshot/current-demo-20260907-1756`
- Current Render service: `video-marketplace-demo-live`
- Current Render URL: `https://video-marketplace-demo-live.onrender.com`
- Current live commit: `ddfa9371b378f1146401c79ade9715f4a8351317`
- Current visual log baseline: `PROGRESS_LOG.md`
- Current active homepage stylesheet: `demo/ott-home-v17.css`
- Current homepage design baseline recorded in the project: V22 and subsequent visual-only polish.

## Rebuild instruction

The user explicitly requested that the current state be recorded and that the demo site then be rebuilt from scratch rather than continuing incremental CSS patches.

The snapshot branch must remain untouched as the rollback/reference point. The new build should be treated as a clean implementation, not a continuation of the accumulated CSS override chain.

## Required homepage direction carried into rebuild

- Premium, high-end video marketplace presentation.
- Clear customer-facing value proposition near the top.
- Explain that the system can be used as-is for operation and can also be freely customized.
- Communicate that it supports different types of video-sales sites.
- Introduce the system/features comprehensively.
- Preserve the intended major content areas: hero, category presentation, discovery/showcase, new videos, mood-based selection, genre recommendations, and popular videos.
- Popular videos should remain a normal 3-column × 3-row grid.

## Important

Do not claim the new build is complete until the actual Render deployment has been checked after the rebuild.
