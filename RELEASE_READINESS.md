# VIDORA — Commercial Release Readiness

This checklist is the release gate for selling the repository as a customer-installable video marketplace package.

## 1. Package integrity

- [x] `app/`, `backend/`, and `demo/` are included.
- [x] `backend/.env.example` is included and real credentials are not committed.
- [x] Local secrets, dependencies, logs and private media are excluded by `.gitignore`.
- [x] `README.md` and `COMMERCIAL_PACKAGE.md` document installation and customer hand-off.
- [x] `LICENSE.md` contains the current commercial license and redistribution terms.

## 2. Automated release gates

Current `main` HEAD is `a6994f5038c56cf5136202a4a2262a9d80efabe4`.

Fresh verification on this HEAD:

- [x] Browser E2E — GitHub Actions run `33943365067` completed successfully.
- [x] Backend Regression — GitHub Actions run `33943365019` completed successfully, including migrations, backup/restore, core tests, Buyer purchase, Seller application/product/media/earnings/payout, Admin payout concurrency, media authorization/upload/access, security regression and functional sales demo E2E.

Earlier full release-gate runs `33831920856` (Demo Functional Regression) and `33831920982` (Release Package Check) also completed successfully, but they ran against an earlier commit and are retained as historical evidence rather than current-HEAD evidence.

The clean-install, payment-regression and release-package checks still require fresh current-HEAD runs before claiming the entire automated release-gate matrix is green.

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

The separate `demo/` package is the commercial sales showcase. Current-HEAD functional demo coverage is GREEN through Backend Regression run `33943365019`.

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
