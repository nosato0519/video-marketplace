# Protected Media Delivery V1

## Access flow
1. Authenticate the requester.
2. Resolve the server-side user identity.
3. Load the requested product and media asset server-side.
4. Verify an active entitlement belonging to that user.
5. Verify the product is published and the media asset is ready.
6. Generate a short-lived private delivery URL through the configured storage adapter.
7. Return the URL without exposing the permanent storage key.

## Security requirements
- Original media is never served from a public bucket/path.
- Permanent storage keys are never returned to the browser.
- Delivery URLs are short-lived.
- Product/user/entitlement IDs supplied by the client are treated as lookup inputs, not proof of authorization.
- Missing authorization should not reveal whether another user's private asset exists.
- The storage adapter must support revocation by refusing new signed URLs after entitlement revocation.

## Release gate
A real storage-provider integration test is required before claiming protected streaming is production-ready.
