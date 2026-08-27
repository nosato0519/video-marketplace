# Development Log

`PROJECT_STATE.md` is the authoritative project state.

## 2026-08-27 — Current session

### Seller implementation progress
- Seller Dashboard foundation exists at `storefront/seller.html`.
- Seller product listing uses authenticated `/api/seller/products`.
- Seller video upload uses authenticated `/api/seller/media/upload` with actual video MIME type and original filename.
- Uploaded media asset ID is carried into draft creation, so a new draft can be created with `mediaAssetId`.
- Seller product list exposes Publish for non-published products and Unpublish for published products.
- Publish validation bug fixed in `backend/src/seller/product-routes.js`: `validateProductForPublishing` expects a singular `mediaAsset`, not an earlier incorrect `mediaAssets` array. The route now passes the actual media asset ID, owner and status.
- Added Seller product editing UI using the existing authenticated `PATCH /api/seller/products/:productId` endpoint.
- Draft editing currently allows title, description, price, currency and Media Asset ID changes. Published products remain locked by the backend.
- Seller product rows now expose Edit for non-published products and Publish/Unpublish according to status.
- Seller edit form loads the current product from `GET /api/seller/products/:productId` before editing, preserving the backend as the source of truth.
- Seller UI commit: `9362237974ab135a91692e51f215fd03e571e3db`.

### Existing work already completed
- Core Node/Express/PostgreSQL backend foundation.
- Catalog/product/order/checkout boundaries.
- Payment webhook settlement and idempotent entitlement grant foundations.
- Entitlement-gated streaming and buyer download with range support.
- Private media storage boundary and startup security validation.
- Buyer Library and Order History localization foundations.
- Seller Dashboard authenticated product/upload/publish integration.
- Product vision, seller handoff guide and operations manual foundations.

### Current work target
1. Improve Seller media-asset selection/recovery and complete upload -> attach -> edit -> publish flow UX.
2. Add Seller onboarding/verification screens.
3. Add sales/earnings and payout screens.
4. Then build no-code Admin moderation/approval operations.
5. Continue production object storage/CDN, end-to-end payment/database testing and final acceptance.

### Important rules
- Do not claim Seller E2E complete until upload -> attach -> edit -> publish -> catalog visibility has been tested against a real configured backend/database.
- Do not bypass backend ownership or publish validation in the UI.
- Do not call the ten supported locales production-ready until translation catalogs and UI acceptance are complete.
- Start future sessions by reading `PROJECT_STATE.md` and this log.
