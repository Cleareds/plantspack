-- Fix Image Upload Issues
-- Run this in your Supabase SQL Editor

-- 1. First, check if the post-images bucket exists
-- If it doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Set up RLS policies for the post-images bucket

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload images" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to images
CREATE POLICY "Public can view images" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'post-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Make sure the posts table has the images column
-- Add images column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'images'
    ) THEN
        ALTER TABLE posts ADD COLUMN images TEXT[];
    END IF;
END $$;

-- 4. Ensure RLS is enabled on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 5. Test query to verify setup
SELECT 
    'Bucket exists: ' || CASE WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'post-images') THEN 'YES' ELSE 'NO' END as bucket_status,
    'Images column exists: ' || CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'images') THEN 'YES' ELSE 'NO' END as column_status;

-- 6. Show current bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'post-images';

-- 7. Show RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';