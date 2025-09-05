-- Add video upload support to posts
-- Support for subscription-based video uploads

-- Add video_urls column to posts table
ALTER TABLE public.posts 
ADD COLUMN video_urls TEXT[];

-- Add media storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for media bucket
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Users can update their own media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.uid() = owner);

-- Update the posts table constraint to allow larger content now that we have different limits
ALTER TABLE public.posts 
DROP CONSTRAINT IF EXISTS posts_content_check;

-- Add new constraint that allows different content lengths based on subscription
-- This is a basic constraint, the actual limits are enforced in the application
ALTER TABLE public.posts 
ADD CONSTRAINT posts_content_check CHECK (char_length(content) <= 10000);

-- Add index for video_urls for better performance when querying posts with videos
CREATE INDEX IF NOT EXISTS idx_posts_has_videos 
ON public.posts USING btree (video_urls) 
WHERE video_urls IS NOT NULL AND array_length(video_urls, 1) > 0;

-- Update RLS policies to include video_urls in allowed columns
-- Posts policies already exist, so we just need to make sure video URLs are handled

-- Add function to validate subscription limits (used by application layer)
CREATE OR REPLACE FUNCTION public.validate_post_limits(
  user_id UUID,
  content_length INTEGER,
  image_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  user_subscription_tier subscription_tier;
  tier_config RECORD;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_subscription_tier
  FROM public.users 
  WHERE id = user_id;
  
  -- Default to free if no subscription found
  IF user_subscription_tier IS NULL THEN
    user_subscription_tier := 'free';
  END IF;
  
  -- Check limits based on tier
  CASE user_subscription_tier
    WHEN 'free' THEN
      -- Free: 500 chars, 3 images, 0 videos
      IF content_length > 500 OR image_count > 3 OR video_count > 0 THEN
        RETURN FALSE;
      END IF;
    WHEN 'medium' THEN
      -- Supporter ($3): 1000 chars, 7 images, 1 video
      IF content_length > 1000 OR image_count > 7 OR video_count > 1 THEN
        RETURN FALSE;
      END IF;
    WHEN 'premium' THEN
      -- Premium ($10): unlimited chars/images, 3 videos
      IF video_count > 3 THEN
        RETURN FALSE;
      END IF;
    ELSE
      -- Unknown tier, default to free limits
      IF content_length > 500 OR image_count > 3 OR video_count > 0 THEN
        RETURN FALSE;
      END IF;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the validation function
GRANT EXECUTE ON FUNCTION public.validate_post_limits(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Create trigger function to validate post limits before insert/update
CREATE OR REPLACE FUNCTION public.check_post_limits()
RETURNS TRIGGER AS $$
DECLARE
  content_len INTEGER;
  image_cnt INTEGER;
  video_cnt INTEGER;
BEGIN
  -- Calculate lengths/counts
  content_len := char_length(COALESCE(NEW.content, ''));
  image_cnt := COALESCE(array_length(NEW.image_urls, 1), 0);
  video_cnt := COALESCE(array_length(NEW.video_urls, 1), 0);
  
  -- Validate limits
  IF NOT public.validate_post_limits(NEW.user_id, content_len, image_cnt, video_cnt) THEN
    RAISE EXCEPTION 'Post exceeds subscription tier limits';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check post limits
DROP TRIGGER IF EXISTS check_post_limits_trigger ON public.posts;
CREATE TRIGGER check_post_limits_trigger
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_post_limits();