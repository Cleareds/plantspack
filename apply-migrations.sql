-- Apply all pending migrations for vegan-social
-- Run this in your Supabase SQL editor or database client

-- Migration 1: Add quote posts support
DO $$
BEGIN
    -- Check if parent_post_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'parent_post_id'
    ) THEN
        ALTER TABLE posts 
        ADD COLUMN parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
        ADD COLUMN post_type TEXT CHECK (post_type IN ('original', 'share', 'quote')) DEFAULT 'original',
        ADD COLUMN quote_content TEXT;

        -- Add index for parent post lookups
        CREATE INDEX idx_posts_parent_post_id ON posts(parent_post_id);
    END IF;
END $$;

-- Migration 2: Add multiple images support
DO $$
BEGIN
    -- Check if images column exists and image_url doesn't
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'images'
    ) THEN
        -- Migrate existing image_url data to images array
        ALTER TABLE posts ADD COLUMN images JSONB DEFAULT '[]';
        
        -- Update existing posts with image_url to use images array
        UPDATE posts 
        SET images = json_build_array(image_url)::jsonb 
        WHERE image_url IS NOT NULL;
        
        -- Drop the old image_url column (comment out if you want to keep it for now)
        -- ALTER TABLE posts DROP COLUMN image_url;
    END IF;
END $$;

-- Migration 3: Create storage bucket for post images (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Migration 4: Set up storage policies for post images
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

    -- Create new policies
    CREATE POLICY "Users can upload post images" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'post-images' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY "Anyone can view post images" ON storage.objects
      FOR SELECT USING (bucket_id = 'post-images');

    CREATE POLICY "Users can update their own post images" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'post-images' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY "Users can delete their own post images" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'post-images' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );
END $$;

-- Migration 5: Update RLS policy for posts to handle quote posts
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON posts;
CREATE POLICY "Users can view posts based on privacy" ON posts
  FOR SELECT USING (
    privacy = 'public' OR 
    (privacy = 'friends' AND (
      user_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = auth.uid() AND following_id = user_id
      )
    ))
  );

-- Verify the migrations
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
ORDER BY ordinal_position;