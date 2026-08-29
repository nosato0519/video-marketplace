# Commerce Progress Checkpoint

## Current checkpoint
- Browser Acceptance #24 reached Seller Application API response validation.
- SPA bootstrap is working after removing the missing `seller-upload.js` import from `app/main.js`.
- Root cause of the remaining #24 failure was confirmed in `backend/src/seller/application-routes.js`: PostgreSQL column names were returned as snake_case (`display_name`, `legal_name`, `country_code`) while the browser/E2E contract expects camelCase (`displayName`, `legalName`, `countryCode`).
- Fixed the Seller Application GET/POST/withdraw responses to explicitly alias API fields to camelCase.
- Fix commit: `60335e3509308bd9d8c787637c4aee1783a89040`.

## Next resume steps
1. Wait for the CI run triggered by `60335e3509308bd9d8c787637c4aee1783a89040`.
2. Inspect Browser Acceptance result and logs.
3. If Seller Application passes, continue through the remaining commerce/browser/security gates.
4. If another failure appears, record the exact failing contract before making the next change.
5. Keep this checkpoint updated with the latest commit, run ID, result, and next action.

## Do not
- Do not weaken the browser assertion just to make CI green.
- Do not modify unrelated commerce flows.
- Do not assume a CI pass is a production-complete state; finish the remaining regression/security gates.
