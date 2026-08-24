# Seller Catalog Workflow V1

## Goal
Make it easy for a seller with no programming knowledge to create, prepare, submit and manage a video product without accidentally exposing protected media.

## Seller flow
1. Seller onboarding
2. Create draft
3. Upload video privately
4. Upload/choose thumbnail
5. Enter title, description, category, language and metadata
6. Set price and supported sales currencies according to operator configuration
7. Configure viewing/download policy
8. Save draft
9. Validate required fields
10. Submit for review
11. Receive review status and reason when applicable
12. Publish only after approval

## Draft safety
- Uploads remain private while a product is a draft.
- A seller cannot publish by changing a frontend flag.
- Required metadata is validated server-side.
- Price is validated server-side.
- Seller can resume interrupted uploads where supported.
- Product state transitions are enforced server-side.

## Review states
`draft` -> `processing` -> `submitted` -> `under_review` -> `approved` -> `published`

Alternative paths:
- `submitted` -> `rejected` -> `draft`
- `published` -> `suspended`
- `suspended` -> `published` only after authorized review

## Seller UX
- Progress indicators for uploads and processing.
- Plain-language validation messages.
- Autosave or explicit save-state indicator.
- Clear distinction between draft and publicly published status.
- Mobile-friendly management screens.
- No requirement to understand storage paths, database IDs or API concepts.

## Security tests
- Seller A cannot edit Seller B's product.
- Seller cannot submit another seller's asset ID.
- Seller cannot make a private original public through metadata changes.
- Seller cannot bypass moderation by calling a publish endpoint directly.
- Upload authorization is enforced server-side.

## Acceptance rule
A non-technical tester should be able to create a product from the seller dashboard using the seller manual without developer assistance. Any recurring point of confusion becomes a UX or documentation defect before commercial release.
