-- Milestone 408: seed the categories offered by the seller product editor
--
-- Keep category slugs aligned with seller/product-editor.html so category
-- selection never points at a missing database row on a fresh installation.

INSERT INTO categories (slug, name)
VALUES
  ('movie', '映画'),
  ('learning', '学び'),
  ('documentary', 'ドキュメンタリー'),
  ('creative', 'クリエイティブ')
ON CONFLICT (slug) DO NOTHING;
