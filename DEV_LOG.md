# Development Log

`PROJECT_STATE.md` is the authoritative project state.

## 2026-08-27 — Current session

### Seller implementation progress
- Seller Dashboard foundation exists at `storefront/seller.html`.
- Seller product listing uses authenticated `/api/seller/products`.
- Seller video upload uses authenticated `/api/seller/media/upload` with actual video MIME type and original filename.
- Uploaded media asset ID is carried into draft creation.
- Seller product list exposes Edit, Publish and Unpublish according to product state.
- Publish validation bug fixed in `backend/src/seller/product-routes.js`: `validateProductForPublishing` expects a singular `mediaAsset`, and the route now passes the actual media asset ID, owner and status.
- Added authenticated `GET /api/seller/media/assets`, returning only the logged-in seller's media assets.
- Integrated the persistent media asset library into the Seller Dashboard. Sellers can now see uploaded videos, select one for a new draft, and select an existing asset while editing a draft.
- Seller media selection no longer depends solely on a browser-held Media Asset ID: the dashboard reloads the seller's asset library from the backend.
- Seller UI commit for media-library integration: `2f88a9b160dc6afec99b13f83a74a5ed36fbabf9`.

### Existing work already completed
- Core Node/Express/PostgreSQL backend foundation.
- Catalog/product/order/checkout boundaries.
- Payment webhook settlement and idempotent entitlement grant foundations.
- Entitlement-gated streaming and buyer download with range support.
- Private media storage boundary and startup security validation.
- Buyer Library and Order History localization foundations.
- Seller Dashboard authenticated product/upload/publish/edit integration.
- Product vision, seller handoff guide and operations manual foundations.

### Current work target
1. Finish Seller asset-selection UX and acceptance tests.
2. Add Seller onboarding/verification screens.
3. Add sales/earnings and payout screens.
4. Then build no-code Admin moderation/approval operations.
5. Continue production object storage/CDN, end-to-end payment/database testing and final acceptance.

### Important rules
- Do not claim Seller E2E complete until upload -> attach -> edit -> publish -> catalog visibility has been tested against a real configured backend/database.
- Do not bypass backend ownership or publish validation in the UI.
- Do not call the ten supported locales production-ready until translation catalogs and UI acceptance are complete.
- Start future sessions by reading `PROJECT_STATE.md` and this log.
