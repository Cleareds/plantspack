# Hashtag Not Showing Posts - Fix Instructions

## Problem
Hashtags are being extracted and saved when creating posts, but they're not showing up on hashtag pages because the RLS (Row Level Security) policies don't allow authenticated users to create hashtags and post_hashtags entries.

## Root Cause
The RLS policies in the migration `20251114000003_create_hashtags_and_mentions.sql` only allowed the service role to manage hashtags and post_hashtags:

```sql
CREATE POLICY "Service role can manage hashtags" ON hashtags
  FOR ALL USING (true);

CREATE POLICY "Service role can manage post hashtags" ON post_hashtags
  FOR ALL USING (true);
```

But the code in `src/lib/hashtags.ts` uses the regular Supabase client (anon key), which requires authenticated user policies.

## Solution
Apply the migration file `supabase/migrations/20251115000001_fix_hashtag_rls_policies.sql` to add proper RLS policies.

## Manual Fix (Run in Supabase Dashboard SQL Editor)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the following SQL:

```sql
-- Allow authenticated users to create hashtags
DROP POLICY IF EXISTS "Authenticated users can create hashtags" ON hashtags;
CREATE POLICY "Authenticated users can create hashtags" ON hashtags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update hashtags (for usage count triggers)
DROP POLICY IF EXISTS "Authenticated users can update hashtags" ON hashtags;
CREATE POLICY "Authenticated users can update hashtags" ON hashtags
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to link their posts to hashtags
DROP POLICY IF EXISTS "Authenticated users can create post hashtags" ON post_hashtags;
CREATE POLICY "Authenticated users can create post hashtags" ON post_hashtags
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete their own post hashtags
DROP POLICY IF EXISTS "Users can delete their own post hashtags" ON post_hashtags;
CREATE POLICY "Users can delete their own post hashtags" ON post_hashtags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = auth.uid()
    )
  );
```

## After Applying the Fix

1. **Create a new post with #tests hashtag** - This will properly save the hashtag
2. **Visit /hashtag/tests** - You should now see the post
3. **Existing posts need to be re-saved** - Posts created before this fix won't have hashtags linked. Users need to edit and re-save them, or you can create new posts.

## Verification

To verify the fix worked, run this query in Supabase SQL Editor:

```sql
-- Check if hashtags were created
SELECT * FROM hashtags WHERE normalized_tag = 'tests';

-- Check if post_hashtags entries exist
SELECT ph.*, p.content
FROM post_hashtags ph
JOIN hashtags h ON ph.hashtag_id = h.id
JOIN posts p ON ph.post_id = p.id
WHERE h.normalized_tag = 'tests';
```

If you see results, the fix is working!
