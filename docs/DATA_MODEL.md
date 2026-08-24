# Data Model v0.1

## Core entities

### users
- id
- email
- password/auth identity reference
- display_name
- role
- status
- locale
- country
- created_at
- updated_at

### seller_profiles
- id
- user_id
- display_name
- bio
- verification_status
- payout_status
- status
- created_at
- updated_at

### products
- id
- seller_id
- title
- description
- category_id
- status
- content_rating
- price_amount
- price_currency
- streaming_enabled
- download_enabled
- download_limit
- download_expiry
- region_policy_id
- created_at
- updated_at
- published_at

### media_assets
- id
- product_id
- asset_type
- storage_key
- duration_seconds
- file_size
- processing_status
- checksum
- created_at

### categories
- id
- parent_id
- slug
- status

### product_translations
- id
- product_id
- locale
- title
- description
- created_at
- updated_at

### orders
- id
- buyer_id
- status
- currency
- subtotal
- platform_fee
- tax_amount
- total_amount
- payment_status
- created_at
- updated_at

### order_items
- id
- order_id
- product_id
- seller_id
- unit_price
- platform_fee
- seller_amount

### payments
- id
- order_id
- provider
- provider_reference
- status
- amount
- currency
- created_at
- updated_at

### payouts
- id
- seller_id
- amount
- currency
- status
- provider
- provider_reference
- created_at
- paid_at

### moderation_cases
- id
- product_id
- seller_id
- type
- status
- reason
- reviewer_id
- created_at
- resolved_at

### reports
- id
- reporter_id
- target_type
- target_id
- reason
- status
- created_at
- resolved_at

### region_policies
- id
- name
- default_action
- created_at
- updated_at

### region_policy_rules
- id
- policy_id
- country_code
- action

### audit_events
- id
- actor_user_id
- action
- target_type
- target_id
- metadata
- created_at

## Design principles

- Use immutable IDs for relationships.
- Store monetary values as exact decimal/minor-unit representations rather than floating point.
- Never store raw payment card data.
- Keep media storage keys private and separate from public product records.
- Preserve order snapshots so historical purchases do not change when a product is edited later.
- Keep translations separate from canonical product identity.
- Use explicit statuses instead of ambiguous booleans for workflows such as moderation, payment and payout.
- Add indexes based on real query patterns after the first catalog implementation.
