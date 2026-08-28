# Seller Dashboard Browser Acceptance

## Purpose
Manual/browser-level acceptance checklist for the authenticated seller dashboard. The API acceptance suite is already green; this checklist validates the actual UI wiring and authorization boundary.

## Preconditions
- Start the application with the normal test PostgreSQL database.
- Use an authenticated seller session.
- Seed at least one seller with profile data, one published/draft product, one earnings ledger row and sufficient available balance for a payout test.
- Keep a second seller and a non-seller/buyer account available for authorization checks.

## Acceptance flow

### 1. Seller dashboard load
- Open `/seller/dashboard.html` while authenticated as Seller A.
- Confirm the page loads without a JavaScript error.
- Confirm profile, earnings and payout sections are visible.

### 2. Seller profile
- Change display name, legal name and country code.
- Save the profile.
- Reload the page.
- Confirm the saved values persist and remain scoped to Seller A.

### 3. Verification submission
- Submit the verification request.
- Confirm the status changes to the server-returned submitted/under-review state.
- Submit again.
- Confirm the UI displays the server error and does not create a duplicate request.

### 4. Earnings
- Confirm the summary values match Seller A's seeded ledger.
- Confirm recent earnings rows render.
- Sign in as Seller B and confirm Seller A's earnings do not appear.

### 5. Payout
- Request an amount within the available balance.
- Confirm success and that payout history refreshes.
- Attempt an amount exceeding available balance plus allowable pending exposure.
- Confirm the UI displays the server validation error and no invalid payout is created.

### 6. Product navigation
- Open Seller A's Products page.
- Navigate to Dashboard and back to Products.
- Confirm links preserve the authenticated session and load normally.

### 7. Authorization boundary
- Access seller dashboard as a non-seller/buyer account.
- Confirm the backend rejects the protected API calls and the UI does not expose seller data.
- Attempt to use Seller A endpoints while authenticated as Seller B.
- Confirm cross-seller resources remain inaccessible.

## Pass criteria
All flows above complete without console errors, unauthorized data exposure, duplicate verification requests, invalid payout creation or cross-seller access.

## Evidence
Record browser screenshots/logs only as needed for release QA. The CI PostgreSQL acceptance remains the source of truth for database/API regression; this document is specifically for browser/UI acceptance.
