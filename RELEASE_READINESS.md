# VIDORA — Commercial Release Readiness

This checklist is the release gate for selling the repository as a customer-installable video marketplace package.

## 1. Package integrity

- [x] `app/`, `backend/`, and `demo/` are included.
- [x] `backend/.env.example` is included and real credentials are not committed.
- [x] Local secrets, dependencies, logs and private media are excluded by `.gitignore`.
- [x] `README.md` and `COMMERCIAL_PACKAGE.md` document installation and customer hand-off.
- [x] `LICENSE.md` contains the current commercial license and redistribution terms.

## 2. Automated release gates

The current application tree at commit `6ffd53195a06858dc745b6181602340b2de12a9c` has passed the fresh major automated release gates, including the latest demo regression.

- [x] Clean Install — Node 20: dependency installation, migration preflight, migrations, migration-state verification and core regression tests.
- [x] Clean Install — Node 22: dependency installation, migration preflight, migrations, migration-state verification and core regression tests.
- [x] Browser UI Acceptance — Playwright/Chromium Buyer browser acceptance and browser module smoke.
- [x] Backend Browser Acceptance — migrations, backend acceptance suite, health checks and real-backend browser acceptance.
- [x] Payment Regression — payment provider, Stripe webhook and S3 media-storage regression tests.
- [x] Release Package Check — release safety verification, archive build, archive integrity/content verification and artifact upload.
- [x] Demo Functional Regression — browser entrypoint, catalog, buyer purchase/entitlement/watch/download, seller product/media/payout flow, and admin payout/moderation/seller approval flow.

The latest Demo Functional Regression run `33831920856` completed successfully on the current main commit. The latest Release Package Check run `33831920982` also completed successfully on the same commit.

## 3. Buyer acceptance

- [x] Catalog search/category flow exists.
- [x] Product detail consumes the real catalog API.
- [x] Checkout creates the purchase intent/order and hands off to the configured payment provider.
- [x] Payment completion is webhook-driven rather than success-URL-driven.
- [x] My Library and protected Watch/Download flows exist.
- [x] Unauthorized library/media access is rejected server-side.
- [ ] Final real-deployment browser pass on desktop and mobile.

## 4. Seller acceptance

- [x] Seller application/verification flow exists.
- [x] Seller product ownership boundaries are enforced server-side.
- [x] Media upload validation/lifecycle exists.
- [x] Publishing, earnings and payout request flows exist.
- [ ] Final real-deployment browser pass on desktop and mobile.

## 5. Admin acceptance

- [x] Admin authorization is enforced server-side.
- [x] Seller verification/review exists.
- [x] Product moderation exists.
- [x] Payout oversight exists.
- [ ] Final real-deployment browser pass on desktop and mobile.

## 6. Showcase demo quality

The separate `demo/` package is the commercial sales showcase. Its automated functional regression is GREEN on the current main commit.

Required presentation journey:

1. Buyer storefront → search/category discovery.
2. Product detail → clear value, price and purchase CTA.
3. Simulated secure checkout → purchase confirmation.
4. My Library → purchased item immediately available.
5. Protected Watch + Download.
6. Seller Studio → product/media/publishing/earnings/payout journey.
7. Admin Console → verification/moderation/payout oversight.
8. Desktop and mobile responsive presentation.

The demo payment is simulated and must never be marketed as live payment processing.

## 7. Production integration

Before a customer's site is opened to real users:

- [ ] Production PostgreSQL configured and migrations applied.
- [ ] Production object/file storage configured.
- [ ] Stripe live checkout credentials configured and webhook signature verified.
- [ ] Strong production `SESSION_SECRET` and `MEDIA_URL_SECRET` configured.
- [ ] HTTPS/reverse proxy configured.
- [ ] Database backup/restore drill completed.
- [ ] Media backup/restore/retention verified.
- [ ] Customer-specific legal/privacy/terms pages installed.
- [ ] Customer-specific support/contact information installed.
- [ ] Final desktop/mobile browser acceptance completed.

## 8. Commercial hand-off

- [ ] Build release archive from a clean checkout.
- [ ] Verify no `.env`, private key, production credential, customer data or production media is present.
- [x] Include installation, configuration and deployment documentation.
- [x] Include the showcase demo and its launch instructions.
- [x] Attach the current commercial license and redistribution terms in `LICENSE.md`.
- [ ] Deliver customer-specific secrets only through a secure channel.

## Release rule

**Commercial source package:** may be sold once package integrity, clean installation, automated acceptance and the polished showcase demo are verified.

**Live-deployment-ready:** requires all customer-specific production integration and final browser checks above.

The repository is deliberately not labeled "live production ready" merely because the demo works. This prevents a simulated payment or unconfigured storage backend from being misrepresented to a customer.
