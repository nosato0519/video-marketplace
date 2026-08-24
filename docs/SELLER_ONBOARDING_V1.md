# Seller Onboarding V1

## Goal
Let a seller become ready to sell without programming knowledge while keeping verification and moderation explicit.

## Flow
1. Create account
2. Accept seller terms
3. Complete required profile information
4. Complete verification if required for the seller/category/region
5. Configure payout details through a secure provider flow
6. Create first product draft
7. Upload media with resumable progress
8. Add title, description, category, tags, price, currency and delivery policy
9. Confirm rights/consent declarations where applicable
10. Submit for review
11. Receive clear status and action-needed messages
12. Publish after approval

## UX rules
- Plain-language labels; no SQL, API or server terminology.
- Save drafts automatically where safe.
- Show a progress stepper and a single obvious next action.
- Never lose an upload because of a transient network error.
- Explain verification requirements before asking for sensitive information.
- Do not expose private verification documents to ordinary staff roles.

## Safety/compliance
For adult deployments or other regulated categories, additional eligibility, identity, rights/consent and moderation requirements can be enabled by policy and region. The system must not imply universal eligibility or payment-provider support.

## Next implementation
Create authenticated seller routes, onboarding state persistence, upload-session records and review submission endpoints. Add admin approval actions with audit logging.
