# VIDORA Functional Demo

This is the real demo entrypoint. Do not open `index.html` as a static file; the demo needs its Node.js demo backend.

## GitHub Codespaces

1. Open the repository in GitHub Codespaces.
2. Wait for the dev container to finish creating.
3. `demo/server.js` starts automatically on port `4173`.
4. Open the forwarded **VIDORA functional demo** port.

The repository dev-container configuration installs the demo dependencies and starts the demo server automatically.

## Demo journeys

- Buyer: catalog → product → login → purchase → paid order → entitlement → protected watch/download.
- Seller: seller application → product creation → media upload → publishing → earnings → payout request.
- Admin: seller application review → product moderation → payout review/approval.
- Media: protected WebM streaming and download are authorization checked by the demo backend.

## Automated verification

From the repository root:

```bash
npm --prefix demo run verify
```

The verifier starts an isolated demo server and checks the buyer purchase/entitlement/watch/download flow, seller product/media/payout flow, admin moderation/seller approval flow, and unauthorized media rejection.

The verifier has an observed CI PASS in Backend Regression run `33723997514`.

All money movement is simulated. The demo backend keeps state for the current demo session so the journeys can be tested end-to-end without production credentials.
