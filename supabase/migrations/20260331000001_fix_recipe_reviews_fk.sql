-- Fix recipe_reviews user_id FK: should reference public.users, not auth.users
-- This allows PostgREST to join with the users table

ALTER TABLE recipe_reviews DROP CONSTRAINT IF EXISTS recipe_reviews_user_id_fkey;
ALTER TABLE recipe_reviews ADD CONSTRAINT recipe_reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
