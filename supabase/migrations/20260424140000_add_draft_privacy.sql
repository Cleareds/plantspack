-- Add 'draft' privacy state for admin-only blog article drafts
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_privacy_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_privacy_check
  CHECK (privacy IN ('public', 'friends', 'draft'));
