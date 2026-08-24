# Reuse architecture for the second product

## Goal
Build the first marketplace so its stable infrastructure can be reused for a future digital-content marketplace without copying unfinished business logic blindly.

## Reusable layers
### Core platform
- authentication and role model
- authorization policies
- account/profile model
- localization
- currency formatting and money model
- region policy engine
- audit/security events
- notifications
- admin navigation framework

### Marketplace layer
- sellers
- products
- catalog/search/filtering
- orders
- payments adapter boundary
- refunds
- seller fees/revenue share
- earnings
- payouts
- moderation/reporting
- entitlements

### Media layer
- private object storage boundary
- upload sessions
- resumable upload state
- media processing jobs
- authorized delivery
- download policy

### Experience layer
- storefront shell
- product cards
- product detail
- checkout shell
- buyer library
- seller workspace
- admin workspace

## What changes for a digital-content marketplace
The product should add a generic `asset`/`product_type` model rather than assuming every product is a video.

Examples:
- video
- audio
- image/photo pack
- PDF/document
- template
- downloadable archive
- course package

Each type can declare:
- delivery method
- preview method
- file requirements
- license/usage terms
- download permissions
- metadata schema
- moderation policy

## Architectural rule
Do not over-generalize the first product prematurely. First make the video marketplace reliable. Extract abstractions only where the second product genuinely benefits from them.

## Expected payoff
The second marketplace should reuse proven authentication, commerce, seller, payout, moderation, localization and admin foundations while replacing only the product-specific catalog, asset delivery and user journeys.
