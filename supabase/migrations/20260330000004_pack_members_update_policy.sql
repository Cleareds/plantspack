-- Add UPDATE policy for pack_members so admins can change member roles
-- Currently only SELECT, INSERT, DELETE exist — no UPDATE

CREATE POLICY "pack_members_update_policy" ON public.pack_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Pack admins can update any member in their pack
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_members.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_members.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );
