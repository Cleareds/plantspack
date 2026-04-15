-- Add public read policies for tables that need them
-- All tables already have RLS enabled from the previous migration

-- Helper: only create policy if table exists and policy doesn't
-- Places: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'places' AND policyname = 'places_public_read') THEN
    CREATE POLICY places_public_read ON public.places FOR SELECT USING (true);
  END IF;
END $$;

-- Place reviews: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_reviews' AND policyname = 'place_reviews_public_read') THEN
    CREATE POLICY place_reviews_public_read ON public.place_reviews FOR SELECT USING (true);
  END IF;
END $$;

-- Place review reactions: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_review_reactions' AND policyname = 'place_review_reactions_public_read') THEN
    CREATE POLICY place_review_reactions_public_read ON public.place_review_reactions FOR SELECT USING (true);
  END IF;
END $$;

-- Packs: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'packs' AND policyname = 'packs_public_read') THEN
    CREATE POLICY packs_public_read ON public.packs FOR SELECT USING (true);
  END IF;
END $$;

-- Pack places: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pack_places' AND policyname = 'pack_places_public_read') THEN
    CREATE POLICY pack_places_public_read ON public.pack_places FOR SELECT USING (true);
  END IF;
END $$;

-- Categories: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'categories_public_read') THEN
    CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (true);
  END IF;
END $$;

-- Hashtags: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'hashtags' AND policyname = 'hashtags_public_read') THEN
    CREATE POLICY hashtags_public_read ON public.hashtags FOR SELECT USING (true);
  END IF;
END $$;

-- Post hashtags: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'post_hashtags' AND policyname = 'post_hashtags_public_read') THEN
    CREATE POLICY post_hashtags_public_read ON public.post_hashtags FOR SELECT USING (true);
  END IF;
END $$;

-- Place corrections: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'place_corrections' AND policyname = 'place_corrections_public_read') THEN
    CREATE POLICY place_corrections_public_read ON public.place_corrections FOR SELECT USING (true);
  END IF;
END $$;

-- Recipe reviews: public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipe_reviews' AND policyname = 'recipe_reviews_public_read') THEN
    CREATE POLICY recipe_reviews_public_read ON public.recipe_reviews FOR SELECT USING (true);
  END IF;
END $$;
