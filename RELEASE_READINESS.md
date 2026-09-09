# VIDEO MARKETPLACE — Commercial Release Readiness

This checklist is the release gate for selling the repository as a customer-installable video marketplace package.

## 1. Package integrity

- [x] `app/`, `backend/`, and `demo/` are included.
- [x] `backend/.env.example` is included and real credentials are not committed.
- [x] Local secrets, dependencies, logs and private media are excluded by `.gitignore`.
- [x] `README.md`, `COMMERCIAL_PACKAGE.md`, and the sales hand-off documentation cover installation and customer hand-off.
- [x] `LICENSE.md` contains the current commercial license and redistribution terms.
- [x] Commercial release packaging uses the `VIDEO MARKETPLACE` name and `video-marketplace-commercial.zip` archive name.
- [x] Commercial release packaging includes `LICENSE.md`, `SALES_PACKAGE.md`, `SALES_DEMO_SCRIPT.md`, and `OPERATIONS_MANUAL.md`.

## 2. Automated release gates

Latest source commit: `df9a16700d087ca6bebccc6cce702a362d02ccaa` (`Align commercial release package with VIDEO MARKETPLACE`).

Verified automated acceptance evidence for the current release baseline:

- [x] Browser UI Acceptance — GitHub Actions run `34306417291` completed successfully.
- [x] Clean Install — GitHub Actions run `34306417300` completed successfully on Node 20 and Node 22, including migrations and core regression tests.
- [x] Demo Functional E2E — GitHub Actions run `34304647985` completed successfully, including functional demo E2E and polished showcase acceptance.
- [x] Backend Regression — GitHub Actions run `34304647998` completed successfully, including migrations, backup/restore, core tests, authentication, payment flows, buyer purchase, seller flows, admin payout concurrency, media authorization/upload/access, security suites and functional sales demo E2E.
- [x] Payment Regression — GitHub Actions run `34304648008` completed successfully, including payment, webhook and protected S3 media adapter regression tests.

The `df9a167...` change is limited to commercial release packaging metadata/content selection; it does not modify application/demo page behavior.

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

The separate `demo/` package is the commercial sales showcase. Current release-baseline functional and browser acceptance coverage is GREEN.

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

- [x] Commercial release packaging script is aligned with the current `VIDEO MARKETPLACE` product name.
- [x] Release packaging excludes `.env`, dependency, build-output and repository metadata paths.
- [x] Release packaging scans for private keys and common credential/token patterns.
- [x] Installation, configuration and deployment documentation is included.
- [x] Showcase demo and launch instructions are included.
- [x] Current commercial license and redistribution terms are included in `LICENSE.md`.
- [ ] Customer-specific secrets are delivered only through a secure channel.
- [ ] Final archive build from a clean customer checkout is performed immediately before customer delivery.

## Release rule

**Commercial source package:** may be sold once package integrity, clean installation, automated acceptance and the polished showcase demo are verified.

**Live-deployment-ready:** requires all customer-specific production integration and final browser checks above.

The repository is deliberately not labeled "live production ready" merely because the demo works. This prevents a simulated payment or unconfigured storage backend from being misrepresented to a customer.
