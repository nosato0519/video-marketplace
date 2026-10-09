# Video Marketplace Project State

## Current authoritative state — 2026-10-09

- Repository: `nosato0519/video-marketplace`
- Active commercial-system branch: `production/top-clean`
- This document describes the commercial-system repository state, not the separate demo deployment.
- The root `Dockerfile` is protected: do not edit, replace, or add Dockerfiles without the user's explicit instruction.
- Do not change or delete `app/` or `backend/` during file cleanup; inspect and scope those areas only when the user explicitly moves the work to system integration.
- Preserve the existing UI, behavior, and separation between the commercial system and `demo/`.

## Current work point

The current task is repository cleanup and code/file organization, with no redesign, feature changes, backend integration, or runtime testing requested.

Completed cleanup already recorded in repository history:
- Removed previously identified legacy catalog modules and obsolete root `admin/` / `storefront/` files.
- Restored `app/catalog/catalog.js` after it was found to be required by current imports.
- Removed obsolete top-level progress checkpoints `PROGRESS.md` and `PROGRESS-COMMERCE.md`.
- Reviewed the repository tree for identical file contents and obvious temporary/backup artifacts; no further safe deletions were confirmed from that review.

This does **not** mean every source file has undergone a full code-quality audit, and it does not establish that every feature works in a deployed environment.

## Protected files and scope

- Do not change the root `Dockerfile` without explicit permission.
- Do not change `app/` or `backend/` as part of cleanup.
- Do not modify the separate demo unless specifically requested.
- Do not delete release-packaged documentation merely because it is old; verify references and package purpose first.
- Do not create temporary files, duplicate implementations, or new folders for cleanup.
- Preserve existing design and functionality.

## Commercial package and verification boundary

The release script is `scripts/build-release.mjs`. It includes both the commercial application and selected documentation, including `PROJECT_STATE.md` and `PROGRESS_LOG.md`; retain these files and keep their current-state notes accurate.

The release-readiness checklist still identifies customer-specific production integration and final real-deployment desktop/mobile browser passes as outstanding gates. Do not describe the package as live-production-ready solely because earlier automated checks passed.

## Current cleanup result — 2026-10-09

- Removed three exact duplicate CSS blocks from `styles.css` while preserving the first copy and the unique override rules; commit `3c47452d234b223721f67c7fcdeea3498efa6a17`.
- Removed trailing whitespace from `index.html` only; no markup, text, attributes, or layout were changed.
- Reviewed the current repository tree: 717 tracked files; no identical blob-content duplicates were found. The agreed cleanup review found no additional file whose deletion was safe to justify.
- Kept `app/`, `backend/`, `demo/`, the root `Dockerfile`, and feature behavior outside the edits.

This records the completed scoped cleanup pass. It is not a claim that every runtime path has been tested or that deployment acceptance gates are complete.
