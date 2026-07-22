-- Founding Supporter recognition: a permanent badge for early supporters.
-- Additive + backward-compatible. Backfills supporters existing at launch
-- (paid tier medium/premium, non-banned, excluding the App Store 'reviewer'
-- account) so they keep founding status permanently even if they later lapse
-- is a product decision — here we only grant to CURRENT supporters.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS founding_supporter boolean NOT NULL DEFAULT false;

UPDATE public.users
SET founding_supporter = true
WHERE subscription_tier IN ('medium', 'premium')
  AND COALESCE(is_banned, false) = false
  AND COALESCE(username, '') <> 'reviewer'
  AND founding_supporter = false;

COMMENT ON COLUMN public.users.founding_supporter IS
  'Permanent Founding Supporter badge for early supporters. Granted at checkout while the founding cohort is below the cap (see stripe webhook), and backfilled for supporters existing at launch 2026-07-24.';
