# Development Log

This file is a human-readable continuation memo. `PROJECT_STATE.md` remains the authoritative project state.

## 2026-08-27 — Current session

### What is already completed
- Core Node/Express/PostgreSQL backend foundation.
- Catalog/product/order/checkout boundaries.
- Stripe webhook settlement and idempotent entitlement grant foundations.
- Entitlement-gated video streaming.
- Entitlement-gated buyer download with attachment semantics and byte-range/resumable support.
- Secure local private-media storage adapter and provider factory.
- Startup media-security validation.
- Regression coverage for media/download security behavior.
- Responsive storefront/UI foundations.
- Multilingual architecture and locale policy.
- Catalog language-switching work.
- `PRODUCT_VISION.md` describing the finished product and definition of done.
- `SELLER_HANDOFF_GUIDE.md` covering installation, services/accounts, language/currency setup, operation, production launch and delivery requirements.
- `OPERATIONS_MANUAL.md` outlining routine marketplace administration and support.

### Current work target
1. Finish authenticated buyer library/purchase state end-to-end.
2. Connect buyer-facing Watch and Download controls to real entitlement/media routes.
3. Verify purchase history/library behavior and error states.
4. Then move to seller onboarding/upload workflow.
5. Then no-code admin moderation/approval operations.

### This session's implementation
- Updated `storefront/library.html` to use the shared localization module.
- Added locale-aware page text for English/Japanese.
- Added the shared language switcher to Library.
- Passed the selected locale to `/api/library`.
- Kept Watch and Download controls tied to backend-provided `streaming_enabled` and `download_enabled` flags; the backend remains the authorization source.
- Commit: `20210fe9958972ced2ff5bc0973dc32c9b1e4281`.
- Expanded `shared/i18n.js` with English/Japanese order-history strings.
- Updated `storefront/orders.html` to use the shared localization module, language switcher, localized labels/messages, and `Accept-Language` on the authenticated orders request.
- Order-history localization commit: `2dfadc1d5f9ed9c732646423bb22ba5cdd51231a`.

### Localization note
- `shared/i18n.js` lists en, ja, de, fr, es, pt-BR, it, ko, zh-CN and zh-TW.
- Message catalogs are currently populated for en/ja; additional locales need their message catalogs and human translation review before being called production-ready.

### Do not forget
- Do not rely on chat memory for project state.
- At the start of every session, read `PROJECT_STATE.md` and this log, then inspect the latest repository state.
- Do not claim a feature is complete until its implementation and relevant test/acceptance path are verified.
- Do not change architecture or jump to an unrelated feature without checking the current next step.
- After each meaningful milestone, update both the project state and this log, then commit.

### Last verified repository state
- Branch: `main`
- Authoritative state file: `PROJECT_STATE.md`
- Current milestone recorded there: Milestone 368.
- Immediate next step recorded there: authenticated buyer purchase/library state end-to-end.
