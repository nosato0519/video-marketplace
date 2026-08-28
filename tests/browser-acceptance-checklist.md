# Browser Acceptance Checklist

Purpose: manual/runtime acceptance for the real user journeys that static and HTTP E2E tests cannot prove.

## Preconditions
- Backend is running with the intended PostgreSQL database.
- A test Seller account exists and can authenticate.
- A test Buyer account exists and can authenticate.
- Payment provider is configured for test mode when checkout is exercised.
- A small valid MP4 fixture is available for upload.

## Seller acceptance
- [ ] Sign in as Seller.
- [ ] Open Seller Dashboard.
- [ ] Profile loads and can be saved.
- [ ] Verification status/submission behaves correctly.
- [ ] Earnings page loads seller-scoped data.
- [ ] Payout form rejects invalid currency/balance and accepts a valid test request when permitted.
- [ ] Open Products.
- [ ] Create a product with required metadata.
- [ ] Upload a valid video.
- [ ] Upload progress/completion is reflected in the UI.
- [ ] Attach the returned media asset to the product.
- [ ] Publish the product.
- [ ] Verify the product is visible as published.
- [ ] Unpublish the product.
- [ ] Verify the product is no longer publicly purchasable.

## Buyer purchase acceptance
- [ ] Sign in as Buyer.
- [ ] Open the published product from the Storefront.
- [ ] Product details render correctly.
- [ ] Buy Now creates an order.
- [ ] Checkout navigation opens the configured test checkout.
- [ ] Complete a successful test payment when supported.
- [ ] Order History shows the resulting order.
- [ ] Library shows the purchased item.
- [ ] Watch opens the protected media endpoint and plays/loads the media.
- [ ] Download obtains the protected media successfully.

## Authorization boundaries
- [ ] Logged-out user cannot access protected Buyer resources.
- [ ] Buyer cannot access Seller-only resources.
- [ ] Seller cannot access another Seller's private media/product controls.
- [ ] Non-admin cannot access Admin resources.
- [ ] Protected media cannot be fetched without the required entitlement.

## Admin acceptance
- [ ] Admin entrypoint loads.
- [ ] Admin dashboard does not show unverified placeholder metrics as real data.
- [ ] Seller verification review works for an authenticated Admin.
- [ ] Payout review works for an authenticated Admin.
- [ ] Moderation reports load.
- [ ] Takedown requires an explicit reason.
- [ ] Moderated content is no longer exposed where the backend contract requires blocking.

## Responsive smoke
- [ ] Seller flow checked at desktop width.
- [ ] Seller flow checked at mobile width.
- [ ] Buyer purchase flow checked at desktop width.
- [ ] Buyer purchase flow checked at mobile width.
- [ ] Account → Orders → Library → Storefront navigation remains usable.

## Evidence rule
Do not mark an item complete from static code inspection alone. Record the actual environment, account role, URL/route, result, and any failure before marking the checkbox complete.
