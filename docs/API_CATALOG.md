# Catalog API v0.1

## GET /api/catalog/products

Returns published products from the relational catalog.

### Query parameters
- `locale`: requested locale; defaults to `en`.
- `category`: category slug; optional.
- `search`: title or seller search term; optional.
- `page`: 1-based page number; defaults to `1`.
- `limit`: requested page size; defaults to `24`, capped at `50`.

### Response shape
```json
{
  "data": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "seller": "...",
      "seller_id": "...",
      "category": "...",
      "price_amount": "12.99",
      "price_currency": "USD",
      "streaming_enabled": true,
      "download_enabled": false,
      "published_at": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 24,
    "returned": 1,
    "hasMore": false
  }
}
```

## Locale fallback
The API first attempts the requested locale. If a translation is unavailable, it falls back to an available translation, preferring English. A future production rule may make fallback policy configurable by site locale.

## Security requirements
- Only `published` products from active sellers are returned.
- Pagination is capped server-side.
- Query values are parameterized rather than interpolated into SQL.
- Internal database errors are not returned to clients.
