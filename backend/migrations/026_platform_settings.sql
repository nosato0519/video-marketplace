CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('seller_verification_method', '{"value":"none"}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;