-- The content_type column has multiple unnamed CHECK constraints from different migrations.
-- Drop ALL check constraints on posts and re-add only the ones we need.

-- Find and drop all content_type check constraints by dropping the column constraint
-- Since we can't easily find unnamed constraints, alter the column to drop all checks
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'posts'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%content_type%'
  LOOP
    EXECUTE 'ALTER TABLE posts DROP CONSTRAINT ' || r.conname;
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- Re-add with all current categories
ALTER TABLE posts ADD CONSTRAINT posts_content_type_check
  CHECK (content_type IS NULL OR content_type IN (
    'recipe', 'restaurant_review', 'lifestyle', 'activism', 'general', 'question',
    'event', 'product', 'hotel', 'organisation', 'place'
  ));
