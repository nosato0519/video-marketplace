# VIDORA Progress Log

## Milestone 569 — Visual-only demo phase scope locked

- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Current phase: **customer-facing demo visual design only**.
- Purpose of this phase: prove that the VIDORA OTT-style video-sales-site look and presentation can be built first.
- **Do NOT implement real application/business functionality in this phase.** Functional implementation comes later as a separate phase.
- Existing code may contain legacy/demo interaction scaffolding from earlier work, but the current development objective is visual presentation. Do not expand those functions or treat them as the current acceptance target.

### Visual work completed / baseline
- OTT-style customer-facing `demo/` visual direction is established.
- Multiple OTT visual polish passes are already loaded through `demo/launcher.mjs`, including the current pass chain through `ott-pass28.css`.
- The `howItWorks` layout fix was applied: desktop/tablet uses CSS grid and the mobile breakpoint remains one column up to 650px.
- Browser acceptance had previously confirmed the showcase renders on desktop/mobile; that evidence is a verification aid, **not** a statement that the business functions are implemented for this phase.

### Current phase acceptance target
1. Visual design quality of the customer-facing demo.
2. OTT-style layout, hierarchy, cards, hero area, navigation, spacing, typography and responsive behavior.
3. Desktop and mobile presentation.
4. No real payment, purchase processing, seller operations, admin operations, authentication, storage or production integrations are required yet.

### Later phase — functional implementation (NOT NOW)
- Buyer functionality.
- Seller functionality.
- Admin functionality.
- Authentication/authorization.
- Product/video data and storage.
- Payment API and webhooks.
- Production deployment, secrets, HTTPS/reverse proxy and operations.

### No-waste rule
Do not start functional implementation while the visual-only phase is being refined. Do not redo completed visual passes without a concrete visual regression. When the visual demo is accepted, record the final visual baseline and then begin functionality as a new milestone without losing this baseline.
