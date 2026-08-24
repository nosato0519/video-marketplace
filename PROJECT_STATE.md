# Video Marketplace Project State

## Purpose
A reusable, international video marketplace inspired by the usability of Japanese video marketplaces such as Pancolle Movie, but independently designed and implemented. The platform must work for general video sales and be capable of supporting adult content where legally and operationally permitted.

## Core decisions
- Model: centrally operated marketplace with a clear site operator.
- Sellers: multiple independent sellers can register and sell videos.
- Sales: one-time video sales, bundles/sets, free videos, paid videos, and sales/discounts. No monthly membership at this stage.
- Delivery: both streaming and download must be supported.
- Currency: multi-currency.
- Languages: multilingual from the beginning; English-first for the initial overseas market, with architecture ready for additional languages.
- Seller system: implemented from the beginning, including seller registration, verification, upload, review, sales and payout management.
- Safety/moderation: implemented from the beginning, including content review, reporting, takedown/removal, account controls, auditability and region restrictions.
- Design: simple, premium, modern UI that feels familiar to international users; inspired by the clarity of major video services and the straightforward marketplace flow of Pancolle Movie without copying its design, code, branding or content.
- Site name/brand: decided later.
- Seller revenue share/platform fee: required and configurable.
- Payments: multiple payment methods; PayPal is required where its current policies permit the relevant content/business model. Payment providers must be replaceable/configurable rather than hard-coded.
- Seller verification: support both lighter verification and stronger identity verification; requirements can vary by seller/content/category/region.
- Download policy: configurable per product, supporting streaming-only, download enabled, expiry, download-count limits, or other policy variants.
- Geographic scope: as broad as legally, commercially, payment-provider and operationally possible; region/country availability must be configurable.

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
- Submit content for moderation
- View sales and earnings
- Request/receive payouts according to platform rules

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

## Safety and compliance principles
- Do not store raw card details; use compliant external payment providers.
- Protect video assets with private storage/access control and authorized delivery mechanisms rather than public permanent file URLs.
- Build authentication, authorization, rate limiting, session security, audit logs and admin-role separation into the architecture.
- Adult content must never be assumed to be universally legal or supported by every payment provider. If adult content is enabled, enforce applicable age/identity, consent/rights, moderation, prohibited-content and regional requirements.
- The platform must support country/category availability controls.
- Compliance requirements must be verified for the actual launch jurisdictions and providers before production launch.

## Development rule
Do not treat the current simple `index.html` test page as the finished product. Build the real application incrementally from an explicit architecture and keep this file updated whenever a major project decision, milestone, schema, integration, or unfinished task changes.

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
Milestone 0 — repository reset and project specification capture.

## Current status
- Repository: `nosato0519/video-marketplace`
- Branch: `main`
- Test `index.html` exists as the current minimal placeholder.
- This project-state file is the persistent source of truth for the project's product requirements and continuation context.

## Next step
Create the initial application architecture and design system before implementing full marketplace functionality. First establish the frontend structure, routing/page map, localization foundation, currency abstraction, reusable UI components, and a clear path toward authentication, database, storage, moderation and payment integrations.
