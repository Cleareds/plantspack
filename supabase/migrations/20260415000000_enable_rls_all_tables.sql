-- Enable RLS on ALL public tables (idempotent — safe to re-run)
-- This catches any tables that were missed by previous migrations

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
      AND tableowner = current_user
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
    RAISE NOTICE 'RLS enabled on: %', tbl.tablename;
  END LOOP;
END $$;

-- Ensure all tables that need public read access have the appropriate policy
-- Places: public read, authenticated write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'places' AND policyname = 'places_public_read') THEN
    CREATE POLICY places_public_read ON public.places FOR SELECT USING (true);
  END IF;
END $$;

-- Place reviews: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_reviews' AND policyname = 'place_reviews_public_read') THEN
    CREATE POLICY place_reviews_public_read ON public.place_reviews FOR SELECT USING (true);
  END IF;
END $$;

-- Place review reactions: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_review_reactions' AND policyname = 'place_review_reactions_public_read') THEN
    CREATE POLICY place_review_reactions_public_read ON public.place_review_reactions FOR SELECT USING (true);
  END IF;
END $$;

-- Events: public read (table may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'events_public_read') THEN
      CREATE POLICY events_public_read ON public.events FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

-- Event responses: public read (table may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_responses') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_responses' AND policyname = 'event_responses_public_read') THEN
      CREATE POLICY event_responses_public_read ON public.event_responses FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

-- Packs: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'packs' AND policyname = 'packs_public_read') THEN
    CREATE POLICY packs_public_read ON public.packs FOR SELECT USING (true);
  END IF;
END $$;

-- Pack places: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pack_places' AND policyname = 'pack_places_public_read') THEN
    CREATE POLICY pack_places_public_read ON public.pack_places FOR SELECT USING (true);
  END IF;
END $$;

-- Categories: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_public_read') THEN
    CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (true);
  END IF;
END $$;

-- Hashtags: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hashtags' AND policyname = 'hashtags_public_read') THEN
    CREATE POLICY hashtags_public_read ON public.hashtags FOR SELECT USING (true);
  END IF;
END $$;

-- Post hashtags: public read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_hashtags' AND policyname = 'post_hashtags_public_read') THEN
    CREATE POLICY post_hashtags_public_read ON public.post_hashtags FOR SELECT USING (true);
  END IF;
END $$;

-- Place corrections: public read (for transparency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_corrections' AND policyname = 'place_corrections_public_read') THEN
    CREATE POLICY place_corrections_public_read ON public.place_corrections FOR SELECT USING (true);
  END IF;
END $$;

-- Place claims: only authenticated users can see their own
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'place_claims') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_claims' AND policyname = 'place_claims_own_read') THEN
      CREATE POLICY place_claims_own_read ON public.place_claims FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;
