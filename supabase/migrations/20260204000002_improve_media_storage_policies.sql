-- Improve media storage policies to enforce subscription limits and ban checks
-- This prevents unauthorized uploads and orphaned files

-- Drop existing upload policy
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;

-- Create improved upload policy that checks:
-- 1. User is authenticated
-- 2. User is not banned
-- 3. User has appropriate subscription for video uploads (if uploading to videos/ folder)
CREATE POLICY "Authenticated non-banned users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media' AND
  auth.role() = 'authenticated' AND
  -- Check user is not banned
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_banned = false
  ) AND
  -- If uploading video (videos/ path), check subscription tier allows videos
  (
    -- Allow image uploads (not in videos/ folder) for all users
    (name NOT LIKE 'videos/%') OR
    -- For video uploads, check subscription tier
    (
      name LIKE 'videos/%' AND
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND subscription_tier IN ('medium', 'premium')
      )
    )
  )
);

-- Update delete policy to check user owns the media (not just authenticated)
DROP POLICY IF EXISTS "Authenticated users can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'media' AND
  auth.uid() = owner
);

-- Update update policy to check user owns the media
DROP POLICY IF EXISTS "Authenticated users can update media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;

CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'media' AND
  auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'media' AND
  auth.uid() = owner
);

-- Keep public read policy unchanged
-- DROP POLICY IF EXISTS "Public read access on media" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can view media" ON storage.objects;

-- Ensure public read policy exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view media'
  ) THEN
    CREATE POLICY "Public can view media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'media');
  END IF;
END
$$;

-- Note: This policy allows non-banned authenticated users to upload images.
-- Videos require medium or premium subscription tier.
