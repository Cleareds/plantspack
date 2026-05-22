-- Allergens: persist a user's chosen allergens so scanners + card generator
-- can apply them automatically. text[] keeps the schema simple and lets us
-- mix common allergens with free-text user entries.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';

-- Per-scan allergen tags so scan history can show what the user filtered on.
ALTER TABLE public.tool_scans
  ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
