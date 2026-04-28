-- Allow admin to verify community-created packs without transferring ownership.
-- The badge previously rendered only when creator_id matched the admin user,
-- which meant a community-curated pack could not earn the Verified mark even
-- after admin review. is_verified separates "checked by PlantsPack" from
-- "owned by PlantsPack."

ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.packs.is_verified IS 'Admin-curated verification flag. Independent of ownership; the badge renders when is_verified=true OR the creator is the admin user.';

-- Only admins can flip is_verified. We piggyback on the existing pack-update
-- RLS by adding a policy that lets admins update any pack.
DROP POLICY IF EXISTS "packs_admin_update" ON public.packs;
CREATE POLICY "packs_admin_update" ON public.packs
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
