-- Add UPDATE and DELETE policies for places table
-- Creators and admins can update their places
-- The API already verifies ownership server-side, but RLS was blocking the actual DB operation

CREATE POLICY "places_update_policy" ON public.places
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.place_owners WHERE place_id = places.id AND user_id = auth.uid() AND removed_at IS NULL)
  )
  WITH CHECK (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.place_owners WHERE place_id = places.id AND user_id = auth.uid() AND removed_at IS NULL)
  );

CREATE POLICY "places_delete_policy" ON public.places
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
