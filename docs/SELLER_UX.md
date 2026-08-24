# Seller UX requirements v0.1

The marketplace must be easy for a creator to use even if they have never operated an online video store before.

## Seller journey
**Register → Verify → Create product → Upload → Processing → Review → Publish → Sell → Track earnings → Payout**

## Seller dashboard
The first screen should answer:
- What is my product status?
- Did an upload finish?
- Is anything waiting for my action?
- How much have I sold?
- How much is available/pending for payout?
- Are there any rejected products or reports that need attention?

## Product creation
Use a guided flow rather than one giant form:
1. Basic information
2. Media upload
3. Pricing and sales settings
4. Availability/language/subtitle settings
5. Rights and policy confirmations
6. Preview
7. Submit for review

The seller should be able to save a draft at every meaningful step and safely resume later.

## Upload experience
- Show supported formats and size limits before upload.
- Use resumable/chunked uploads where the storage provider supports them.
- Show progress, processing and failure states clearly.
- Never make a seller re-upload a completed file merely because metadata validation failed.
- Keep original uploads private.
- Processing should happen asynchronously so the browser does not need to remain open for the entire encoding job.

## Pricing
- Seller sees the currency and amount they are setting.
- Platform fee/revenue share is clearly explained before publication.
- Estimated seller proceeds are shown before confirmation.
- Discounts and bundles should not make the seller's expected proceeds ambiguous.
- Actual settlement is based on the platform's immutable order/accounting records.

## Publishing
A product should not become publicly purchasable until required processing, rights declarations and moderation checks have passed.

Show one clear status:
- Draft
- Uploading
- Processing
- Needs changes
- Under review
- Approved
- Published
- Paused
- Rejected
- Blocked

## Sales and earnings
Seller reporting should separate:
- Gross sales
- Discounts/refunds where applicable
- Platform fees
- Payment/processing costs where applicable
- Net seller earnings
- Pending balance
- Available balance
- Payout history

Do not present a gross sales number as if it were immediately withdrawable income.

## International sellers
- Seller-facing language can differ from the buyer's language.
- Currency and payout country are explicit.
- Country-specific verification and payout requirements can be configured.
- The seller should know when a payout is unavailable because of provider, country or policy restrictions.

## Support and recovery
Every failed operation should have a useful recovery path. For example:
- upload failed → retry/resume;
- metadata invalid → fix metadata without re-upload;
- review rejected → show required changes and resubmit;
- payout unavailable → explain what must be completed;
- account restricted → provide the official support/review path.

## Trust and safety
Seller-facing copy must be clear about prohibited content, rights/consent requirements, moderation and takedown procedures. The platform should not encourage sellers to bypass laws, payment-provider restrictions or content rules.
