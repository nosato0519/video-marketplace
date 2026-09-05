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

## Milestone 570 — Customer storefront visual rebuild

- Reworked the customer-facing home presentation instead of adding another generic marketplace dashboard layer.
- Added `demo/ott-pass29.css` and loaded it from `demo/launcher.mjs`.
- Reoriented the visual hierarchy toward an OTT viewer storefront: fixed transparent navigation, cinematic hero, horizontal content rails, compact metadata, category rails, restrained controls, and a dark premium presentation.
- Kept the current work strictly visual; no new business functionality was implemented.
- Existing seller/admin workspace code remains preserved and is not the acceptance target for this phase.

### Verification boundary
- Source change committed to `main`.
- Render auto-deploy is expected from the `main` branch update.
- Final visual acceptance still requires inspection of the deployed storefront; do not label this visual rebuild as customer-approved yet.

## Milestone 571 — Full screen-design sequence locked

The following screen-design order is now the official development sequence. **Work proceeds one screen at a time.** The next screen is not started until the current screen's visual design is accepted.

### Phase 1 — Customer-facing / buyer screens
1. Top page
2. Product list / search page
3. Product detail / purchase page
4. Login page
5. Member registration page
6. Password reset page
7. My Page
8. Purchase / order history page
9. Favorites / My List page
10. Video watching page
11. Purchase completion page
12. Payment page

### Phase 2 — Seller screens
13. Upload screen
14. Product registration screen
15. Product edit screen
16. Seller dashboard
17. Sales / revenue management screen

### Phase 3 — Admin screens
18. Buyer / user management screen
19. Admin dashboard
20. Product / video management screen
21. Order / payment management screen
22. Sales / payout management screen
23. Media management screen
24. Site settings screen

### Phase 4 — Account / common screens
25. Profile / account settings screen
26. Terms of service / privacy policy and other legal-information pages
27. 404 / error and other common screens

### Phase 5 — Design completion
28. Unified visual system across all screens
29. Desktop responsive polish
30. Mobile responsive polish
31. Screen-to-screen visual flow verification
32. Final visual baseline acceptance

### Phase 6 — Function integration (after all visual designs are accepted)
33. Integrate the redesigned UI with the **already-completed core application system**.
34. Connect authentication / member registration / login.
35. Connect product and video registration / upload.
36. Connect purchase / payment / viewing permissions.
37. Connect My Page and purchase history.
38. Connect seller operations.
39. Connect admin operations.
40. Connect remaining existing business functions without rebuilding the core system from scratch.

### Phase 7 — Final demo completion
41. Full functional flow verification.
42. E2E verification.
43. Regression / security verification and bug fixes.
44. Render deployment verification.
45. Final customer-facing demo acceptance.

### Phase 8 — Sales package
46. Remove development-only data/materials.
47. Prepare initial setup and configuration flow.
48. Prepare README / installation / deployment documentation.
49. Prepare license / terms documents.
50. Build the distributable ZIP package.
51. Prepare sales-page materials.
52. Start sales.

### Current position
- **Current screen: #1 Top page.**
- Current task: visual design only.
- Functional implementation is intentionally paused until all screen designs are completed and visually accepted.
- The existing core application system is treated as completed and will be integrated after the visual-design phase.
- Do not skip ahead to #2 until #1 is accepted.

## Milestone 572 — Persistent design master instruction locked

A permanent master instruction has been added at:
`docs/product/design-master-instruction.md`

### Mandatory rule
Whenever creating, redesigning, or reviewing any VIDORA screen/UI, **always read and follow `docs/product/design-master-instruction.md` first**.

The master instruction begins with:
**「あなたはプロのWebデザイナー兼フルスタックエンジニアです。」**

It permanently defines the professional role, commercial-quality target, one-screen-at-a-time workflow, visual-only phase boundary, existing-system preservation rule, GitHub verification/recording rule, design-quality requirements, and completion criteria.

The existing UI principles and international-first design documents remain additional required references; the master instruction does not replace them.

### Verification
- Created `docs/product/design-master-instruction.md` on `main`.
- Commit: `1b5729463fb739bb78654c0f27459a1a1e892cb1`.
- From this milestone onward, the instruction is part of the project record and must be treated as mandatory for every screen creation/design task.
