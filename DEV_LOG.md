# Development Log

This file is a human-readable continuation memo. `PROJECT_STATE.md` remains the authoritative project state.

## 2026-08-27 — Current session

### This session's implementation
- Added `storefront/seller.html` Seller Dashboard foundation.
- Connected seller product listing to the authenticated `/api/seller/products` endpoint.
- Connected product draft creation to the existing Seller product API using the API's actual camelCase request fields (`priceAmount`, `priceCurrency`, `mediaAssetId`).
- Connected the Seller video uploader to the authenticated `/api/seller/media/upload` endpoint.
- Upload sends the actual video MIME type and original filename headers required by the backend.
- Added Publish action from the Seller product list using `/api/seller/products/:productId/publish`.
- Added English/Japanese Seller UI strings.
- Preserved backend authorization and publish validation as the source of truth; the UI does not bypass Seller ownership or media validation.
- Commit: `734ecde48b3324b841a7e2fcffc94193d6de2c1d`.

### Existing work already completed
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
- Buyer Library and Order History localization foundations.
- `PRODUCT_VISION.md`, `SELLER_HANDOFF_GUIDE.md`, and `OPERATIONS_MANUAL.md` documentation foundations.

### Current work target
1. Finish Seller Dashboard: attach uploaded media to drafts, edit product, publish/unpublish controls, and validation/error UX.
2. Add seller onboarding/verification screens.
3. Add seller sales/earnings and payout screens.
4. Then move to no-code Admin moderation/approval operations.
5. Continue production media delivery, object storage/CDN, end-to-end payment/database testing and final acceptance.

### Important correction
- The Seller product API expects camelCase fields (`priceAmount`, `priceCurrency`, `mediaAssetId`). The dashboard now uses those actual field names instead of the earlier snake_case guesses.
- The Seller products endpoint returns `{ products: [...] }`; the dashboard now handles that response directly.
- Do not claim the Seller workflow is complete until upload -> attach -> edit -> publish has been tested end-to-end.

### Localization note
- `shared/i18n.js` lists en, ja, de, fr, es, pt-BR, it, ko, zh-CN and zh-TW.
- Message catalogs are currently populated for en/ja; additional locales need their message catalogs and human translation review before being called production-ready.

### Do not forget
- Do not rely on chat memory for project state.
- At the start of every session, read `PROJECT_STATE.md` and this log, then inspect the latest repository state.
- Do not claim a feature is complete until its implementation and relevant test/acceptance path are verified.
- Do not change architecture or jump to an unrelated feature without checking the current next step.
- After each meaningful milestone, update both the project state and this log, then commit.
