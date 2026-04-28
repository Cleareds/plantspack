-- Verification ladder: a single column that captures how thoroughly a place
-- has been checked, plus the method and timestamp. Each level subsumes the
-- previous. Lets us communicate verification state per-place without
-- claiming uniform Tier-2 web-search across the whole 50K+ corpus.
--
-- L0 Imported       - schema-valid record (every active place)
-- L1 Sourced        - came from a trusted vegan-first source
-- L2 AI-verified    - description-based or web-search confirmation
-- L3 Confirmed      - admin reviewed OR community member confirmed via the
--                     "Is this still 100% vegan?" prompt

ALTER TABLE public.places ADD COLUMN IF NOT EXISTS verification_level SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS verification_method TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_places_verification_level ON public.places(verification_level);
CREATE INDEX IF NOT EXISTS idx_places_last_verified ON public.places(last_verified_at);

COMMENT ON COLUMN public.places.verification_level IS '0=imported, 1=sourced, 2=ai-verified, 3=admin/community-confirmed. Each level subsumes the previous.';
COMMENT ON COLUMN public.places.verification_method IS 'How this row reached its current level: imported, ai_verified, community_correction, admin_review';
COMMENT ON COLUMN public.places.last_verified_at IS 'Most recent verification timestamp. Used to pick stalest rows for re-verification cadence.';

-- ============================================================================
-- BACKFILL
-- ============================================================================

-- L1: trusted-source provenance. Sources that came from vegan-first datasets
-- or admin review meet a baseline trust bar even before AI verification.
UPDATE public.places
SET
  verification_level = 1,
  verification_method = 'imported',
  last_verified_at = COALESCE(last_verified_at, created_at)
WHERE verification_level = 0
  AND source IS NOT NULL
  AND (
       source LIKE 'osm%'
    OR source = 'openstreetmap'
    OR source LIKE 'vegguide%'
    OR source LIKE 'manual%'
    OR source LIKE 'web_research%'
    OR source LIKE 'foursquare%'
    OR source = 'happycow'
    OR source LIKE 'michelin%'
    OR source = 'admin'
    OR source = 'user'
    OR source = 'user_submission'
  );

-- L2: AI verification (description-based reclassifier or web-search confirmation).
-- Both tag families collapse into a single "AI-verified" level since the
-- public distinction between "description-based" and "web-search" matters less
-- than the fact that AI signed off.
UPDATE public.places
SET
  verification_level = 2,
  verification_method = 'ai_verified',
  last_verified_at = COALESCE(last_verified_at, updated_at)
WHERE verification_level < 2
  AND (
       'websearch_confirmed_vegan' = ANY(tags)
    OR 'name_pattern_promoted_a' = ANY(tags)
    OR 'name_pattern_promoted_b' = ANY(tags)
    OR verification_status = 'scraping_verified'
  );

-- L3: admin review OR community confirmation. Admin trumps AI; community
-- "Yes, still 100% vegan" trumps AI.
UPDATE public.places
SET
  verification_level = 3,
  verification_method = CASE
    WHEN is_verified = true THEN 'admin_review'
    ELSE 'community_correction'
  END,
  last_verified_at = COALESCE(last_verified_at, updated_at)
WHERE verification_level < 3
  AND (
       is_verified = true
    OR 'actually_fully_vegan' = ANY(tags)
    OR 'community_report:actually_fully_vegan' = ANY(tags)
    OR 'community_correction_confirmed' = ANY(tags)
  );
