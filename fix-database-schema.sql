-- Fix database schema for VeganConnect
-- Run this against your Supabase database to ensure all necessary columns exist

-- Ensure users table has avatar_url column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to users table';
  ELSE
    RAISE NOTICE 'avatar_url column already exists in users table';
  END IF;
END $$;

-- Ensure posts table has image_urls array column for multiple images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'image_urls') THEN
    ALTER TABLE posts ADD COLUMN image_urls TEXT[];
    RAISE NOTICE 'Added image_urls column to posts table';
  ELSE
    RAISE NOTICE 'image_urls column already exists in posts table';
  END IF;
END $$;

-- Create avatars storage bucket if it doesn't exist (run this in the SQL editor of Supabase)
-- NOTE: This needs to be run in Supabase Dashboard SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);