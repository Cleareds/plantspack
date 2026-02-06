-- Fix infinite recursion in pack_members policies
DROP POLICY IF EXISTS "pack_members_admin_insert_policy" ON public.pack_members;
DROP POLICY IF EXISTS "pack_members_delete_policy" ON public.pack_members;

CREATE OR REPLACE FUNCTION is_pack_admin(p_pack_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pack_members
    WHERE pack_id = p_pack_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
END;
$$;

CREATE POLICY "pack_members_admin_insert_policy" ON public.pack_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_pack_admin(pack_id, auth.uid())
  );

CREATE POLICY "pack_members_delete_policy" ON public.pack_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_pack_admin(pack_id, auth.uid())
  );
