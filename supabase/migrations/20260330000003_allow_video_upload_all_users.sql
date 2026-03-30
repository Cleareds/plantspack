-- Allow all authenticated non-banned users to upload videos (was premium-only)
DROP POLICY IF EXISTS "Authenticated non-banned users can upload media" ON storage.objects;

CREATE POLICY "Authenticated non-banned users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_banned = false
  )
);
