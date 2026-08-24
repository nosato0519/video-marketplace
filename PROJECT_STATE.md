# Video Marketplace Project State

## Purpose
A reusable, international video marketplace inspired by the usability of Japanese video marketplaces such as Pancolle Movie, but independently designed and implemented. The platform must work for general video sales and be capable of supporting adult content where legally and operationally permitted.

## Core decisions
- Centrally operated marketplace with multiple independent sellers.
- One-time sales, bundles/sets, free/paid videos and discounts; no monthly membership at this stage.
- Streaming and download support.
- Multi-currency including JPY and international currencies.
- Multilingual from the beginning; English-first for initial overseas market, with Japanese and additional locales supported.
- Seller registration, verification, upload, review, sales and payout management from the beginning.
- Safety/moderation, reporting, takedown/removal, account controls, auditability and region restrictions from the beginning.
- Simple, premium, modern international UI inspired by major video services and the usability of Pancolle Movie without copying its design, code, branding or content.
- Configurable seller revenue share/platform fee.
- Multiple payment methods; PayPal is required where current policies permit the relevant content/business model. Payment integrations must be replaceable/configurable.
- Seller verification supports lighter and stronger verification depending on seller/content/category/region.
- Configurable streaming/download policies.
- Geographic scope as broad as legally, commercially, payment-provider and operationally possible.
- Installation, buyer, seller, admin, configuration, security, moderation, payments, video delivery, localization, backup/recovery, updates, troubleshooting, legal/compliance and distribution documentation are product deliverables.
- After real operator testing, produce a clean installable ZIP release with documentation, configuration examples, licensing/attribution information and release checklist.
- The product is intended to generate revenue for the operator; revenue-critical flows are first-class functionality.
- Buyer conversion must prioritize clarity, trust and legitimate purchases without deceptive patterns.
- Seller usability is equally first-class.
- Admin must be genuinely usable from smartphone and desktop.
- Routine admin operation must require no programming, SQL, server shell or config-file editing.
- Every major architecture decision must consider the eventual self-hosted ZIP buyer.
- Commercial messaging must be designed alongside the product. `docs/SALES_COPY.md` is the source of truth for accurate product positioning and must be updated when actual release capabilities change. Marketing claims must never exceed tested functionality.

## Product roles
### Buyer
- Browse/search/filter videos
- Product details and previews
- Registration/login and favorites
- Purchase and order history
- Purchased library
- Streaming/download according to product policy
- Reviews/ratings where enabled
- Account/payment history

### Seller
- Registration/login and verification status
- Seller profile
- Upload/manage videos and thumbnails
- Metadata, categories, tags, pricing and currency/display settings
- Streaming/download policy where allowed
- Resumable drafts
- Upload/processing/review status
- Moderation submission
- Gross/fees/net/pending/available earnings
- Payout requests/status
- Clear recovery instructions for failures

### Operator/Admin
- Dashboard
- Buyer and seller management
- Product moderation, reports and takedowns
- Orders/payments/refunds
- Fees, revenue-share and payouts
- Categories/tags
- Languages/currencies
- Country/region restrictions
- Site content/settings
- Audit/security activity
- Legal/policy content
- Smartphone-friendly routine management
- Step-up authentication for sensitive actions
- No-code guided setup
- Human-readable health checks/troubleshooting

## Distribution requirements
`docs/DISTRIBUTION_PRODUCT.md` defines the sellable self-hosted ZIP package. It must be understandable by a non-programmer as far as technically practical and include manuals, configuration templates, migrations, licenses/attributions, security hardening, sandbox testing and production checklists. Never ship secrets or private project data.

`docs/RELEASE_ACCEPTANCE.md` defines the commercial release gate. The ZIP is not considered sellable merely because it extracts successfully; it must pass clean installation, setup, admin, seller, buyer, media, commerce sandbox, localization, security and backup/restore tests.

`docs/SALES_COPY.md` defines accurate positioning, product-page copy, ZIP listing copy, trust wording and prohibited overclaims. Final sales copy must be generated from tested release capabilities.

## Safety and compliance principles
- Never store raw card details; use compliant payment providers.
- Video assets must use private storage/access control and authorized delivery rather than public permanent URLs.
- Authentication, authorization, rate limiting, session security, audit logs and admin-role separation are architectural requirements.
- Adult content is not assumed universally legal or supported by every provider. If enabled, applicable age/identity, consent/rights, moderation, prohibited-content and regional requirements must be enforced.
- Actual launch jurisdictions, taxes, privacy/consumer rules and provider policies must be verified before production.

## Development rule
Do not treat the current simple `index.html` test page as the finished product. Build incrementally from explicit architecture and update this file whenever a major decision, schema, integration or unfinished task changes.

## Continuation rule
**This repository must remain sufficient to continue the project even if the assistant forgets the conversation, loses previous session context, or a future session starts from the beginning. Development must resume from the latest saved milestone without relying on chat history.**

At the start of every future development session, read this file first, inspect the latest commits and repository tree/code, and continue from the latest saved state. After every meaningful milestone, commit with a clear message and update this file with current milestone/status, completed work, remaining work, important technical decisions, known issues/risks and exact next step.

**The latest repository state and this project-state file are the authoritative continuation source and the project must be carried through completion subject to capabilities, required external services and applicable laws/policies.**

## Current milestone
Milestone 21 — commercial positioning and sales-copy source added.

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Premium responsive homepage prototype remains committed as visual reference.
- Structured application shell in `app/` with localized navigation/language selection.
- Runtime localization foundation supports English, Japanese, Spanish, Brazilian Portuguese, French, German, Italian, Korean, Simplified Chinese and Traditional Chinese.
- Architecture, data model and API boundary documentation added.
- Catalog domain, API adapter, UI state, accessibility helpers and reusable product card added.
- Buyer UX, conversion UX, seller UX and buyer/seller parity requirements added.
- Product-detail renderer added with localized price, delivery information, seller attribution and purchase CTA foundation.
- Seller dashboard shell added with product/upload/sales/payout/profile/help sections.
- No-code admin dashboard shell added with routine operator sections and mobile-oriented structure.
- Seller workflow database foundation added for workflow states, resumable drafts and payout requests.
- Mobile-first admin UX and no-code admin requirements added; plain-language admin navigation foundation added.
- Self-hosted ZIP distribution requirements and commercial release acceptance checklist added.
- Commercial positioning/sales-copy source added in `docs/SALES_COPY.md`.
- Monetization, security, revenue testing, database migration, commerce flow, private media delivery and regional commerce documentation added.
- Backend Node/PostgreSQL foundation added with security headers, health endpoint, catalog routes/query boundary, schema and seed data.

## Known issues / risks
- Frontend shell still uses placeholder hash routes and is not yet a production router.
- Catalog API adapter exists but renderer has not yet been switched fully to it.
- Product detail currently uses placeholder preview/checkout route and is not connected to live product data or payment.
- Seller/admin dashboards are UI foundations and are not yet connected to authenticated backend operations.
- PostgreSQL environment has not yet been provisioned/tested in this session.
- Authentication, region controls and complete payout lifecycle still need migrations.
- No live storage, video processing, moderation API, payment integration or delivery-token implementation yet.
- Locale loader needs strengthening with production build tooling.
- Documentation translations need production-quality human review as the product stabilizes.
- Payment-provider/content-policy compatibility must be verified before live provider selection, especially for adult content.
- Japan-specific tax, invoicing, consumer-protection and privacy requirements must be reviewed for the actual operator.
- Commercial ZIP is not yet ready; installation/upgrade automation, clean-environment testing and final licensing remain.

## Next step
Switch the catalog renderer to the API adapter and implement loading/error/empty states, pagination and accessible announcements/focus. Then connect the product detail page to a real product API and build the checkout flow in a payment-provider-neutral sandbox architecture. In parallel, build authenticated seller onboarding/upload workflows and authenticated no-code admin actions. Keep commercial copy synchronized with tested capabilities. Test revenue-critical flows in sandbox/staging before live credentials.
