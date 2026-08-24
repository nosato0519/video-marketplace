# Upload Security Tests V1

- Unauthenticated upload preparation is rejected.
- Buyer upload preparation is rejected.
- Unsupported MIME types are rejected.
- Zero/negative/oversized files are rejected.
- Invalid filenames are rejected.
- Seller A cannot prepare storage for Seller B's identity.
- Original media is assigned a private storage key.
- Upload credentials are generated with cryptographic randomness.
- Upload metadata is persisted only after server-side validation.
- A private asset cannot become buyer-accessible merely because its URL/key is known.
