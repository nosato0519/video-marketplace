# Test Strategy V1

Testing is part of implementation, not a final afterthought.

## Test layers
1. Unit tests — validation, pricing, currency, permissions, entitlement rules, state transitions.
2. Integration tests — API/database/auth/payment-event/media-authorization boundaries.
3. End-to-end tests — buyer, seller and admin critical journeys.
4. Security tests — IDOR/BOLA, privilege escalation, token replay, rate limits, secret exposure, protected-media access.
5. Responsive/accessibility tests — mobile layouts, keyboard navigation, focus, labels, error states, long translations.
6. Deployment tests — clean installation, environment configuration, migrations, backup/restore and production build.

## Critical end-to-end scenarios
### Buyer
- Browse -> detail -> checkout -> verified payment -> order -> library -> authorized playback.
- Failed payment does not create an entitlement.
- Duplicate payment event does not duplicate an order or entitlement.
- Refund/revocation removes or suspends access according to policy.
- Direct media URL without entitlement is rejected.

### Seller
- Register -> onboarding -> create draft -> resumable upload -> submit -> review -> publish.
- Invalid metadata cannot be submitted as a publishable product.
- Upload interruption can resume without corrupting the product state.
- Rejected product remains unavailable to buyers.

### Admin
- Admin can review/approve/reject according to permissions.
- Moderator cannot perform actions outside assigned scope.
- Destructive actions require confirmation and produce audit events.
- Suspended product immediately follows the configured access policy.

## Security regression suite
Every security bug fixed becomes a regression test. Critical authorization tests must run on every release candidate.

## Release gates
A release candidate is blocked if:
- critical authentication/authorization test fails;
- protected media can be accessed without entitlement;
- payment verification can be bypassed client-side;
- secrets are present in the build or repository;
- clean installation fails;
- a critical buyer/seller/admin flow is broken.

## Evidence
Each release candidate should retain test results and a short checklist of manually verified flows so the project can be resumed and audited later without relying on memory.
