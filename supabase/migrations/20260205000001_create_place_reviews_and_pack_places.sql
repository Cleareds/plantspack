-- Migration: Place Reviews and Pack Places System
-- Created: 2026-02-05
-- Description: Add place reviews with star ratings, review reactions, and pack-place integration

-- ============================================================================
-- 1. PLACE TAGS SYSTEM
-- ============================================================================

-- Add tags array to places table for flexible labeling (vegan, vegetarian, etc.)
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_places_tags ON public.places USING GIN(tags);

COMMENT ON COLUMN public.places.tags IS 'Tags for filtering: vegan, vegetarian, gluten-free, organic, etc.';

-- ============================================================================
-- 2. PLACE REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.place_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),

  -- Soft delete support (like comments)
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  -- Edit tracking (like comments)
  edited_at TIMESTAMPTZ DEFAULT NULL,
  edit_count INTEGER DEFAULT 0 CHECK (edit_count >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT place_reviews_unique_user_place UNIQUE(place_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_place_reviews_place_id ON public.place_reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_place_reviews_user_id ON public.place_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_place_reviews_rating ON public.place_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_place_reviews_created_at ON public.place_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_reviews_deleted_at ON public.place_reviews(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.place_reviews IS 'User reviews for places with star ratings (1-5)';
COMMENT ON CONSTRAINT place_reviews_unique_user_place ON public.place_reviews IS 'One review per user per place';

-- ============================================================================
-- 3. PLACE REVIEW REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.place_review_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.place_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'inspiring', 'thoughtful')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT place_review_reactions_unique UNIQUE(review_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_place_review_reactions_review ON public.place_review_reactions(review_id);
CREATE INDEX IF NOT EXISTS idx_place_review_reactions_user ON public.place_review_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_place_review_reactions_type ON public.place_review_reactions(reaction_type);

COMMENT ON TABLE public.place_review_reactions IS 'Reactions to place reviews (like/helpful/inspiring/thoughtful)';

-- ============================================================================
-- 4. PACK PLACES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pack_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Organization (similar to pack_posts)
  position INTEGER DEFAULT 0 CHECK (position >= 0),
  section_name TEXT DEFAULT NULL,
  is_pinned BOOLEAN DEFAULT false,

  -- Timestamp
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT pack_places_unique_pack_place UNIQUE(pack_id, place_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pack_places_pack_position ON public.pack_places(pack_id, position);
CREATE INDEX IF NOT EXISTS idx_pack_places_place ON public.pack_places(place_id);
CREATE INDEX IF NOT EXISTS idx_pack_places_pinned ON public.pack_places(pack_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_pack_places_added_at ON public.pack_places(added_at DESC);

COMMENT ON TABLE public.pack_places IS 'Links places to packs for curation';
COMMENT ON CONSTRAINT pack_places_unique_pack_place ON public.pack_places IS 'Each place can only be added once per pack';

-- ============================================================================
-- 5. RLS POLICIES - PLACE REVIEWS
-- ============================================================================

ALTER TABLE public.place_reviews ENABLE ROW LEVEL SECURITY;

-- Public can view non-deleted reviews
CREATE POLICY "place_reviews_select_policy" ON public.place_reviews
  FOR SELECT
  USING (deleted_at IS NULL);

-- Authenticated users can create reviews (with ban check)
CREATE POLICY "place_reviews_insert_policy" ON public.place_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND (is_banned = true OR is_banned IS NOT NULL)
    )
  );

-- Users can update their own reviews
CREATE POLICY "place_reviews_update_policy" ON public.place_reviews
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own reviews
CREATE POLICY "place_reviews_delete_policy" ON public.place_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 6. RLS POLICIES - PLACE REVIEW REACTIONS
-- ============================================================================

ALTER TABLE public.place_review_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "place_review_reactions_select_policy" ON public.place_review_reactions
  FOR SELECT
  USING (true);

-- Authenticated users can add their own reactions
CREATE POLICY "place_review_reactions_insert_policy" ON public.place_review_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "place_review_reactions_delete_policy" ON public.place_review_reactions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- 7. RLS POLICIES - PACK PLACES
-- ============================================================================

ALTER TABLE public.pack_places ENABLE ROW LEVEL SECURITY;

-- Anyone can view places in published packs
CREATE POLICY "pack_places_select_policy" ON public.pack_places
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.packs
      WHERE packs.id = pack_places.pack_id
      AND (packs.is_published = true OR packs.creator_id = auth.uid())
    )
  );

-- Only pack admins/moderators can add places
CREATE POLICY "pack_places_insert_policy" ON public.pack_places
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_places.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'moderator')
    )
  );

-- Only pack admins/moderators can update places
CREATE POLICY "pack_places_update_policy" ON public.pack_places
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_places.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'moderator')
    )
  );

-- Only pack admins/moderators can remove places
CREATE POLICY "pack_places_delete_policy" ON public.pack_places
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_places.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'moderator')
    )
  );

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate average rating for a place
CREATE OR REPLACE FUNCTION public.get_place_average_rating(p_place_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT COALESCE(AVG(rating)::NUMERIC(3,2), 0)
  INTO avg_rating
  FROM public.place_reviews
  WHERE place_id = p_place_id
  AND deleted_at IS NULL;

  RETURN avg_rating;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_place_average_rating IS 'Calculate average rating for a place (1-5 scale)';

-- Function to get rating distribution (5-star breakdown)
CREATE OR REPLACE FUNCTION public.get_place_rating_distribution(p_place_id UUID)
RETURNS JSON AS $$
DECLARE
  distribution JSON;
BEGIN
  SELECT json_build_object(
    '5', COUNT(*) FILTER (WHERE rating = 5),
    '4', COUNT(*) FILTER (WHERE rating = 4),
    '3', COUNT(*) FILTER (WHERE rating = 3),
    '2', COUNT(*) FILTER (WHERE rating = 2),
    '1', COUNT(*) FILTER (WHERE rating = 1),
    'total', COUNT(*)
  )
  INTO distribution
  FROM public.place_reviews
  WHERE place_id = p_place_id
  AND deleted_at IS NULL;

  RETURN distribution;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_place_rating_distribution IS 'Get count of each star rating (1-5) for a place';

-- Function to toggle review reaction (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION public.toggle_place_review_reaction(
  p_review_id UUID,
  p_reaction_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
  v_added BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if reaction already exists
  SELECT EXISTS (
    SELECT 1 FROM public.place_review_reactions
    WHERE review_id = p_review_id
    AND user_id = v_user_id
    AND reaction_type = p_reaction_type
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM public.place_review_reactions
    WHERE review_id = p_review_id
    AND user_id = v_user_id
    AND reaction_type = p_reaction_type;

    v_added := false;
  ELSE
    -- Add reaction
    INSERT INTO public.place_review_reactions (review_id, user_id, reaction_type)
    VALUES (p_review_id, v_user_id, p_reaction_type);

    v_added := true;
  END IF;

  RETURN v_added;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.toggle_place_review_reaction IS 'Toggle a reaction on a review (returns true if added, false if removed)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_place_average_rating(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_place_rating_distribution(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.toggle_place_review_reaction(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 9. TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Add trigger to auto-update updated_at on place_reviews
CREATE TRIGGER place_reviews_updated_at
  BEFORE UPDATE ON public.place_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'place_reviews') = 1,
    'place_reviews table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'place_review_reactions') = 1,
    'place_review_reactions table not created';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pack_places') = 1,
    'pack_places table not created';

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created: place_reviews, place_review_reactions, pack_places tables';
  RAISE NOTICE 'Created: RLS policies for all tables';
  RAISE NOTICE 'Created: Helper functions for ratings and reactions';
END $$;
