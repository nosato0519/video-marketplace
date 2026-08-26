-- Milestone 369: extensible catalog localization
--
-- Product content translations are separate from commerce data. A product may have
-- any number of locale records; the application resolves the best available locale.

CREATE TABLE IF NOT EXISTS supported_locales (
  locale TEXT PRIMARY KEY,
  language_name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (locale <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS supported_locales_default_idx
  ON supported_locales (is_default)
  WHERE is_default = TRUE;

INSERT INTO supported_locales (locale, language_name, native_name, enabled, is_default)
VALUES
  ('en', 'English', 'English', TRUE, TRUE),
  ('ja', 'Japanese', '日本語', TRUE, FALSE),
  ('zh-CN', 'Chinese (Simplified)', '简体中文', TRUE, FALSE),
  ('zh-TW', 'Chinese (Traditional)', '繁體中文', TRUE, FALSE),
  ('ko', 'Korean', '한국어', TRUE, FALSE),
  ('es', 'Spanish', 'Español', TRUE, FALSE),
  ('fr', 'French', 'Français', TRUE, FALSE),
  ('de', 'German', 'Deutsch', TRUE, FALSE),
  ('it', 'Italian', 'Italiano', TRUE, FALSE),
  ('pt-BR', 'Portuguese (Brazil)', 'Português', TRUE, FALSE)
ON CONFLICT (locale) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_translations (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL REFERENCES supported_locales(locale) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, locale),
  CHECK (length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS product_translations_locale_idx
  ON product_translations(locale);
