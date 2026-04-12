-- Create a temporary function to list all check constraints, then drop ALL of them on content_type
-- and also check for any constraint with name like 'posts_content_type%'

-- First, drop ANY constraint whose name contains 'content_type' on posts
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all check constraints that reference content_type in their definition OR name
  FOR r IN
    SELECT conname, pg_get_constraintdef(c.oid) as def 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'posts'
    AND c.contype = 'c'
  LOOP
    RAISE NOTICE 'Found constraint: % => %', r.conname, r.def;
    IF r.def LIKE '%content_type%' THEN
      EXECUTE 'ALTER TABLE posts DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
      RAISE NOTICE 'DROPPED: %', r.conname;
    END IF;
  END LOOP;
END $$;

-- Now re-add a single clean constraint allowing NULL or any valid value
ALTER TABLE posts ADD CONSTRAINT posts_content_type_check
  CHECK (content_type IS NULL OR content_type IN (
    'recipe', 'restaurant_review', 'lifestyle', 'activism', 'general', 'question',
    'event', 'product', 'hotel', 'organisation', 'place'
  ));
