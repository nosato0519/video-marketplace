# VIDORA Functional Demo

This is the real functional demo entrypoint. Do not open `index.html` as a static file; the demo requires its Node.js HTTP backend and launcher.

## GitHub Codespaces

1. Open the repository in GitHub Codespaces.
2. Let the dev container finish creating.
3. The dev-container starts `demo/launcher.mjs` automatically on port `4173`.
4. Open the forwarded **VIDORA functional demo** port.

The launcher serves the production-style HTML and JavaScript assets from the same origin as the demo API, so the browser exercises the actual demo backend rather than a static mock.

## Demo journeys

- Buyer: catalog → search/filter → product details → login → purchase → paid order → entitlement → protected Watch + Download.
- Seller: seller mode → product creation → media upload lifecycle → publishing state → earnings → payout request.
- Admin: seller application review → product moderation → payout oversight.
- Media: protected WebM streaming/download with authorization checks; an unauthenticated request is rejected.
- Categories: Education, Film, Business, Creative, and an explicitly labeled 18+ Adult category using non-explicit imagery.

## Automated verification

From the repository root:

```bash
npm --prefix demo run verify
```

The verifier starts an isolated launcher-backed demo server and checks the browser entrypoint/assets, buyer purchase → entitlement → protected media flow, unauthorized media rejection, seller product/media/payout flow, and admin moderation/seller approval flow.

All money movement is simulated. Demo state is session-scoped and does not use production credentials.
