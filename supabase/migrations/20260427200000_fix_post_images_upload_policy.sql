-- Ensure post-images bucket INSERT policy exists and is consistent with
-- the media bucket policy (non-banned authenticated users only, path scoped
-- to the uploading user's ID folder).
--
-- This is idempotent: the DROP IF EXISTS + CREATE pattern re-applies the
-- policy even if it was dropped or never created.

-- Re-create the INSERT policy so it:
--   1. Requires authentication
--   2. Requires the user is not banned
--   3. Requires the first path segment matches auth.uid()
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;

CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' AND
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_banned = false
  )
);

-- Ensure SELECT policy exists (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Anyone can view post images'
  ) THEN
    CREATE POLICY "Anyone can view post images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'post-images');
  END IF;
END $$;

-- Ensure UPDATE/DELETE policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Users can update their own post images'
  ) THEN
    CREATE POLICY "Users can update their own post images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'post-images' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Users can delete their own post images'
  ) THEN
    CREATE POLICY "Users can delete their own post images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'post-images' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Set a sane file size limit on post-images (50 MB) matching Supabase free tier max.
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'post-images' AND (file_size_limit IS NULL OR file_size_limit = 0);
