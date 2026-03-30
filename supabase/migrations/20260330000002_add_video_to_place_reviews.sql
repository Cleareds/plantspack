-- Add video support to place reviews (1 video per review)
ALTER TABLE place_reviews ADD COLUMN IF NOT EXISTS video_url text;
