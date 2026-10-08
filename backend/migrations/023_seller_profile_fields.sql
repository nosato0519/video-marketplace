-- Milestone 374: complete seller profile fields
-- Keep public and private seller profile data in seller_profiles.

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;
