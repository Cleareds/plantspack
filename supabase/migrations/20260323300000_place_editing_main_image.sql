-- Add main_image_url column for place thumbnails
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS main_image_url TEXT;

-- Update RLS policy to allow verified owners (not just creators) to edit
DROP POLICY IF EXISTS "Users can update their places" ON public.places;
CREATE POLICY "Users can update their places"
  ON public.places FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.place_owners
      WHERE place_owners.place_id = places.id
      AND place_owners.user_id = auth.uid()
      AND place_owners.removed_at IS NULL
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.place_owners
      WHERE place_owners.place_id = places.id
      AND place_owners.user_id = auth.uid()
      AND place_owners.removed_at IS NULL
    )
  );
