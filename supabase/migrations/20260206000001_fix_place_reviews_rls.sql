-- Fix place_reviews RLS insert policy
-- The original policy had: (is_banned = true OR is_banned IS NOT NULL)
-- This blocked ALL users because IS NOT NULL is true even when is_banned = false
-- Fixed to only check if is_banned = true

-- Drop the problematic policy
DROP POLICY IF EXISTS "place_reviews_insert_policy" ON public.place_reviews;

-- Create corrected policy
CREATE POLICY "place_reviews_insert_policy" ON public.place_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND is_banned = true
    )
  );

-- Add comment explaining the fix
COMMENT ON POLICY "place_reviews_insert_policy" ON public.place_reviews IS
'Allow authenticated users to create reviews unless they are banned. Fixed from original version that incorrectly checked IS NOT NULL.';
