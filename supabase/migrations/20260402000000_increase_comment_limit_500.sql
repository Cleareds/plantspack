-- Increase comment content limit from 280 to 500 characters
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_content_check;
ALTER TABLE public.comments ADD CONSTRAINT comments_content_check CHECK (char_length(content) <= 500);
