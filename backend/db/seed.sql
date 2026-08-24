-- Development-only seed data. Never use these IDs as production identities.

INSERT INTO categories (id, slug) VALUES
  ('00000000-0000-0000-0000-000000000101', 'featured'),
  ('00000000-0000-0000-0000-000000000102', 'collections'),
  ('00000000-0000-0000-0000-000000000103', 'new-releases');

INSERT INTO users (id, email, display_name, role, locale, country_code) VALUES
  ('00000000-0000-0000-0000-000000000201', 'creator@example.invalid', 'Creator Studio', 'seller', 'en', 'US');

INSERT INTO seller_profiles (id, user_id, display_name, verification_status, payout_status) VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'Creator Studio', 'verified', 'ready');

INSERT INTO products (id, seller_id, category_id, status, price_amount, price_currency, streaming_enabled, download_enabled, published_at) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', 'published', 12.99, 'USD', TRUE, FALSE, NOW()),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000102', 'published', 24.99, 'USD', TRUE, TRUE, NOW()),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000103', 'published', 8.99, 'USD', TRUE, FALSE, NOW());

INSERT INTO product_translations (id, product_id, locale, title, description) VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'en', 'Featured Video', 'A development catalog item.'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', 'en', 'Premium Collection', 'A development catalog item.'),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000403', 'en', 'New Release', 'A development catalog item.');
