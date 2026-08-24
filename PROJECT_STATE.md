# Video Marketplace Project State

## Purpose
A reusable, international video marketplace inspired by the usability of Japanese video marketplaces such as Pancolle Movie, but independently designed and implemented. The platform must work for general video sales and be capable of supporting adult content where legally and operationally permitted.

## Core decisions
- Model: centrally operated marketplace with a clear site operator.
- Sellers: multiple independent sellers can register and sell videos.
- Sales: one-time video sales, bundles/sets, free videos, paid videos, and sales/discounts. No monthly membership at this stage.
- Delivery: both streaming and download must be supported.
- Currency: multi-currency, including Japan/JPY and international currencies.
- Languages: multilingual from the beginning; English-first for the initial overseas market, with Japanese and additional locales supported from the same product architecture.
- Seller system: implemented from the beginning, including seller registration, verification, upload, review, sales and payout management.
- Safety/moderation: implemented from the beginning, including content review, reporting, takedown/removal, account controls, auditability and region restrictions.
- Design: simple, premium, modern UI that feels familiar to international users; inspired by the clarity of major video services and the straightforward marketplace flow of Pancolle Movie without copying its design, code, branding or content.
- Site name/brand: decided later.
- Seller revenue share/platform fee: required and configurable.
- Payments: multiple payment methods; PayPal is required where its current policies permit the relevant content/business model. Payment providers must be replaceable/configurable rather than hard-coded.
- Seller verification: support both lighter verification and stronger identity verification; requirements can vary by seller/content/category/region.
- Download policy: configurable per product, supporting streaming-only, download enabled, expiry, download-count limits, or other policy variants.
- Geographic scope: as broad as legally, commercially, payment-provider and operationally possible; region/country availability must be configurable.
- Documentation: installation, buyer, seller, admin, configuration, security, moderation, payments, video delivery, localization, backup/recovery, updates, troubleshooting, legal/compliance and release/distribution documentation are product deliverables, not optional extras.
- Documentation localization: documentation architecture supports multilingual releases. English is the source language; planned translations include Japanese, Spanish, Brazilian Portuguese, French, German, Italian, Korean, Simplified Chinese and Traditional Chinese, with human review required for legal/security text.
- Distribution: after the operator personally tests the completed application, create a clean, installable ZIP release with documentation, configuration examples, licensing/attribution information and release checklist.
- Business objective: this is intended to become a revenue-generating product for the operator. Revenue-critical flows must therefore be designed, tested and documented as first-class product functionality rather than added as an afterthought.
- Conversion priority: every buyer-facing flow must optimize for clarity, trust and completed legitimate purchases without deceptive patterns, fake scarcity, fake reviews or fabricated sales claims.
- Seller usability priority: creator/seller workflows are equally first-class. A seller should be able to register, create a draft, upload, recover from interruptions, understand fees and expected proceeds, pass review, publish, monitor sales and request payouts without needing technical knowledge.
- Admin usability priority: the operator/admin must be able to manage the marketplace from a smartphone as well as desktop. The mobile admin experience must be genuinely usable, not merely visually responsive.
- No-code admin priority: routine marketplace operation must not require programming, SQL, server-shell access or editing configuration files. The normal administrator interface must provide guided forms, selectors, previews, validation, help and safe confirmations.
- Distribution product priority: every major architecture decision must consider the eventual self-hosted ZIP buyer. Installation, setup, upgrades, documentation, third-party licensing and portability must be treated as product requirements from the beginning.

## Product roles
### Buyer
- Browse/search/filter videos
- View product details and previews
- Register/login
- Favorites
- Purchase
- View purchased library
- Stream and/or download according to product policy
- Reviews/ratings where enabled
- Account and payment/order history

### Seller
- Register/login
- Verification status
- Seller profile
- Upload/manage videos and thumbnails
- Set title, description, category, tags, price, currency/display settings
- Choose streaming/download policy where allowed
- Save/resume drafts at each major step
- See upload/processing/review status
- Submit content for moderation
- View sales and earnings with gross/fees/net/pending/available distinctions
- Request/receive payouts according to platform rules
- Receive clear recovery instructions when an upload, review or payout operation fails

### Operator/Admin
- Dashboard
- Buyer/user management
- Seller management and verification
- Product/content moderation
- Reports and takedowns
- Orders/payments/refunds
- Seller fees and revenue-share rules
- Payout management
- Categories/tags
- Languages/currencies
- Country/region restrictions
- Site settings
- Audit logs/security events
- Legal/policy content management
- Smartphone-friendly access to all routine management functions
- Step-up/re-authentication for sensitive actions
- No-code guided setup and administration for routine operations
- Human-readable health checks and troubleshooting guidance

## Safety and compliance principles
- Do not store raw card details; use compliant external payment providers.
- Protect video assets with private storage/access control and authorized delivery mechanisms rather than public permanent file URLs.
- Build authentication, authorization, rate limiting, session security, audit logs and admin-role separation into the architecture.
- Adult content must never be assumed to be universally legal or supported by every payment provider. If adult content is enabled, enforce applicable age/identity, consent/rights, moderation, prohibited-content and regional requirements.
- The platform must support country/category availability controls.
- Compliance requirements must be verified for the actual launch jurisdictions and providers before production launch.

## Distribution requirements
See `docs/DISTRIBUTION_PRODUCT.md`. The eventual ZIP release must be installable and understandable by a non-programmer as far as technically practical. It must contain all required manuals, configuration templates, migrations, licenses/attributions, security hardening, sandbox testing and production checklists. Never ship secrets or private project data.

## Development rule
Do not treat the current simple `index.html` test page as the finished product. Build the real application incrementally from an explicit architecture and keep this file updated whenever a major project decision, schema, integration, or unfinished task changes.

## Continuation rule
**This repository must remain sufficient to continue the project even if the assistant forgets the conversation, loses the previous session context, or a future session starts from the beginning. The project must be designed so development can resume from any saved milestone and continue all the way to completion without relying on the chat history.**

At the start of every future development session, read this file first, inspect the latest commits, inspect the current repository tree/code, and continue from the latest saved state instead of recreating the project from memory. After every meaningful milestone, commit the work with a clear commit message and update this file with:
1. current milestone/status,
2. what was completed,
3. what remains,
4. important technical decisions,
5. known issues/risks,
6. exact next step.

**The assistant must treat the latest repository state and this project-state file as the authoritative continuation source and must be able to continue from the saved state through the remaining milestones until the application is completed, subject to the capabilities, required external services, and applicable laws/policies.**

## Current milestone
Milestone 18 — self-hosted ZIP distribution and commercial-release requirements added.

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Initial premium responsive homepage prototype remains committed as the visual reference.
- Structured application shell is in `app/` with localized navigation and language selection.
- Runtime localization foundation supports English, Japanese, Spanish, Brazilian Portuguese, French, German, Italian, Korean, Simplified Chinese and Traditional Chinese.
- Added `docs/ARCHITECTURE.md` with domains, page map, architecture rules and build sequence.
- Added `docs/DATA_MODEL.md` defining the initial users, sellers, products, media, orders, payments, payouts, moderation, reports, regions and audit entities.
- Added `docs/API_BOUNDARIES.md` defining authentication, catalog, buyer, seller, admin, commerce and media service boundaries.
- Added `app/catalog/catalog.js` as a replaceable catalog-domain interface with temporary demo data.
- Added `app/catalog/catalog.css` for the responsive catalog UI.
- Added `app/catalog/catalog-api.js` as the browser API adapter for the database-backed catalog endpoint.
- Added `app/catalog/catalog-ui.js` with cancellable request handling so rapid filter/page changes do not leave stale results rendered.
- Added `app/catalog/catalog-state.js` for predictable catalog filter/request state.
- Added `app/catalog/catalog-accessibility.js` for screen-reader status announcements and focus management.
- Added `app/catalog/product-card.js` as a reusable localized product card renderer with clear delivery information and product navigation.
- Added `docs/BUYER_UX.md` defining international buyer usability, checkout, library, accessibility and trust requirements.
- Added `docs/CONVERSION_UX.md` defining the legitimate purchase funnel, trust, checkout, post-purchase and performance requirements.
- Added `docs/SELLER_UX.md` defining creator onboarding, guided product creation, resumable uploads, pricing transparency, moderation states, earnings and payout UX.
- Added `docs/BUYER_SELLER_PARITY.md` making buyer and seller usability equal first-class product requirements.
- Added `backend/db/005_seller_workflow.sql` with seller product workflow states, resumable seller drafts and payout-request foundation.
- Added `docs/ADMIN_MOBILE_UX.md` defining smartphone-first operator/admin management, security, interaction, poor-connection and role-separation requirements.
- Added `docs/NO_CODE_ADMIN.md` defining no-code administration, guided setup, visual management, guardrails, health checks and advanced-mode separation.
- Added `app/admin/admin-navigation.js` defining plain-language admin sections for routine no-code management.
- Added `docs/DISTRIBUTION_PRODUCT.md` defining the sellable self-hosted ZIP package, installer philosophy, portability, environment separation, upgrade safety, licensing and release quality gates.
- Updated `app/main.js` so `/browse`, `/categories` and `/popular` render a catalog page with search, category filtering and locale-aware currency formatting.
- Added `docs/MONETIZATION.md` covering operator revenue, platform commission, seller settlement, refunds, payouts and currency rules.
- Added `docs/SECURITY_BASELINE.md` covering identity, authorization, private media, commerce security, application security, privacy and adult-content safeguards.
- Added `docs/REVENUE_TEST_PLAN.md` covering purchase, seller accounting, payout, currency and abuse/security release tests.
- Added `backend/package.json` with Node.js API runtime dependencies including PostgreSQL client support.
- Added `backend/src/server.js` with a hardened HTTP entry point, security headers, health endpoint and modular catalog API route registration.
- Added `backend/src/catalog-routes.js` to isolate catalog route registration.
- Added `backend/src/db.js` as the PostgreSQL connection/query boundary using a pooled connection and `DATABASE_URL`.
- Added `backend/src/catalog.js` with parameterized, paginated catalog queries, category filtering and locale fallback.
- Added `docs/API_CATALOG.md` defining the catalog API contract and security requirements.
- Added `backend/db/schema.sql` with the first PostgreSQL-oriented users, sellers, categories, products and product translation tables plus core catalog indexes.
- Added `backend/db/seed.sql` with isolated development-only demo records.
- Added `backend/db/002_commerce.sql` with orders, order items, payments, idempotent payment-event tracking and seller settlement tables.
- Added `backend/db/003_media.sql` with private media assets, delivery variants and media access events.
- Added `backend/db/004_moderation.sql` with content reviews, reports and seller rights declarations.
- Added `docs/DATABASE_MIGRATION.md` with database setup, production migration, backup and least-privilege rules.
- Added `docs/COMMERCE_FLOW.md` defining checkout through seller settlement, immutable order pricing, provider abstraction and adult-content provider compatibility requirements.
- Added `docs/MEDIA_DELIVERY.md` defining private storage, signed delivery, upload processing and entitlement checks.
- Added `docs/REGIONAL_COMMERCE.md` defining Japan/JPY and international commerce requirements and the separation between locale, display currency and actual charge currency.
- Documentation suite and multilingual documentation policy remain part of the product deliverables.

## Known issues / risks
- The current frontend shell uses placeholder hash routes and is not yet a production router.
- The catalog API adapter is present but the existing catalog renderer has not yet been switched over.
- PostgreSQL connection code is present but a real database environment has not been provisioned or tested in this session.
- The current SQL is the initial production schema foundation; authentication, region controls and complete payout lifecycle still need migrations.
- The backend currently has no authentication, storage-provider integration, moderation API, live payments, video processing, delivery-token implementation or seller payout provider implementation.
- The locale loader is intentionally lightweight and needs strengthening when the production build system is introduced.
- Documentation translations beyond the localization policy and UI locale strings still need to be produced and human-reviewed as the product stabilizes.
- Payment-provider/content-policy compatibility must be verified before choosing live providers, especially for adult-content support.
- Japan-specific tax, invoicing, consumer-protection, privacy and other launch requirements must be reviewed for the actual operating entity before production.
- A commercial ZIP release is not yet ready; installation/upgrade automation, clean-environment testing and final licensing still remain.

## Next step
Switch the catalog renderer to the new API adapter and implement clear loading/error/empty states plus pagination and accessible announcements/focus. Then implement a real product detail API/page with a strong purchase CTA, seller attribution, preview and clear price/access information. In parallel, build the seller onboarding/dashboard shell and the operator/admin no-code mobile dashboard shell. After that, add authentication, upload processing and checkout. Revenue-critical implementation must be tested in sandbox/staging before any live payment credentials are used.
