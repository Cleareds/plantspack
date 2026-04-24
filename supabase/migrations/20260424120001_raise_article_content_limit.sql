-- Raise content limit for long-form blog articles (was 10k, now 100k)
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_content_check CHECK (char_length(content) <= 100000);
