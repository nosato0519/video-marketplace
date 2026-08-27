# Development Log

`PROJECT_STATE.md` is the authoritative project state.

## 2026-08-27 — Current session

### Seller implementation progress
- Seller Dashboard foundation exists at `storefront/seller.html`.
- Seller product listing uses authenticated `/api/seller/products`.
- Seller video upload uses authenticated `/api/seller/media/upload` with actual video MIME type and original filename.
- Uploaded media asset ID is now carried into the next draft creation request, so the draft is created with `mediaAssetId` instead of leaving the video unattached.
- Seller product list now exposes Publish for non-published products and Unpublish for published products.
- Publish validation bug fixed in `backend/src/seller/product-routes.js`: `validateProductForPublishing` expects a singular `mediaAsset`, not the earlier incorrect `mediaAssets` array. The route now passes the actual media asset ID, owner and status, allowing the existing guard to verify ownership and `ready` state.
- The publish guard requires title, positive price, valid 3-letter currency, attached media, matching media ID, matching seller ownership and a publishable media state.
- Commits: `3d5332d726475132dab0262eca347a7bf2669c9e` (publish validation fix), `08f8cde044d3f9f62fcafe7efdf74a08a4bc7509` (Seller UI attach/unpublish).

### Existing work already completed
- Core Node/Express/PostgreSQL backend foundation.
- Catalog/product/order/checkout boundaries.
- Payment webhook settlement and idempotent entitlement grant foundations.
- Entitlement-gated streaming and buyer download with range support.
- Private media storage boundary and startup security validation.
- Buyer Library and Order History localization foundations.
- Seller Dashboard foundation and authenticated Seller API integration.
- Product vision, seller handoff guide and operations manual foundations.

### Current work target
1. Add Seller product editing UI using the existing PATCH endpoint.
2. Add Seller onboarding/verification screens.
3. Add sales/earnings and payout screens.
4. Then build no-code Admin moderation/approval operations.
5. Continue production object storage/CDN, end-to-end payment/database testing and final acceptance.

### Important rules
- Do not claim Seller E2E complete until upload -> attach -> edit -> publish -> catalog visibility has been tested against a real configured backend/database.
- Do not bypass backend ownership or publish validation in the UI.
- Do not call the ten supported locales production-ready until translation catalogs and UI acceptance are complete.
- Start future sessions by reading `PROJECT_STATE.md` and this log.
