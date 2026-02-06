-- Fix infinite recursion in pack_members policies
-- The issue is that the admin insert policy queries pack_members, which triggers RLS again

-- Drop the problematic policy
DROP POLICY IF EXISTS "pack_members_admin_insert_policy" ON public.pack_members;

-- Create a security definer function to check admin status without triggering RLS
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

-- Recreate the admin insert policy using the function
CREATE POLICY "pack_members_admin_insert_policy" ON public.pack_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_pack_admin(pack_id, auth.uid())
  );

-- Also fix the delete policy to avoid recursion
DROP POLICY IF EXISTS "pack_members_delete_policy" ON public.pack_members;

CREATE POLICY "pack_members_delete_policy" ON public.pack_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_pack_admin(pack_id, auth.uid())
  );
