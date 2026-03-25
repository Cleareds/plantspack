-- Fix post content limit: was still 500 chars, should be 10000 for recipes
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_content_check CHECK (char_length(content) <= 10000);
