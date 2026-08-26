# Automated video editor architecture

The future editing system should be designed as an asynchronous job pipeline rather than a single request that blocks until rendering finishes.

## Pipeline

1. Upload source video to private object storage.
2. Create a processing job with a unique job ID.
3. Extract media metadata and generate a low-cost proxy when appropriate.
4. Transcribe speech and detect silence/scene boundaries.
5. Generate an editable cut plan and subtitle track.
6. Render a preview asynchronously.
7. Let the user review and request changes.
8. Render the final output only after approval.
9. Store job status, output references, and audit events.
10. Expire temporary source/proxy files according to retention policy.

## Reliability requirements

- Idempotent job creation and retries
- Explicit states: queued, processing, preview_ready, awaiting_review, rendering, completed, failed, cancelled
- Progress reporting
- Retry-safe workers
- Private storage and signed download URLs
- Resource limits for upload size and duration
- Automatic cleanup of temporary files
