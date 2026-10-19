-- Store the display name collected by buyer registration.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';