-- Drop the outdated content_type check constraint and update with all current categories
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_type_check;
ALTER TABLE posts ADD CONSTRAINT posts_content_type_check
  CHECK (content_type IN ('recipe', 'restaurant_review', 'lifestyle', 'activism', 'general', 'question', 'event', 'product', 'hotel', 'organisation', 'place'));
