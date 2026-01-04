-- Enable guest (anonymous) read access to all public content
-- This allows non-logged-in users to browse the site

-- Comments: Allow guests to view non-deleted comments
CREATE POLICY IF NOT EXISTS "comments_select_policy_anon"
  ON public.comments
  FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

-- Users: Allow guests to view all user profiles
CREATE POLICY IF NOT EXISTS "users_select_policy_anon"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- Post Likes: Allow guests to view likes (for counts)
CREATE POLICY IF NOT EXISTS "post_likes_select_policy_anon"
  ON public.post_likes
  FOR SELECT
  TO anon
  USING (true);

-- Post Reactions: Allow guests to view reactions
CREATE POLICY IF NOT EXISTS "post_reactions_select_policy_anon"
  ON public.post_reactions
  FOR SELECT
  TO anon
  USING (true);

-- Comment Reactions: Allow guests to view comment reactions
CREATE POLICY IF NOT EXISTS "comment_reactions_select_policy_anon"
  ON public.comment_reactions
  FOR SELECT
  TO anon
  USING (true);

-- Follows: Allow guests to view follow relationships (for counts)
CREATE POLICY IF NOT EXISTS "follows_select_policy_anon"
  ON public.follows
  FOR SELECT
  TO anon
  USING (true);

-- Places: Allow guests to view all places on the map
CREATE POLICY IF NOT EXISTS "places_select_policy_anon"
  ON public.places
  FOR SELECT
  TO anon
  USING (true);

-- Favorite Places: Allow guests to see which places are favorited
CREATE POLICY IF NOT EXISTS "favorite_places_select_policy_anon"
  ON public.favorite_places
  FOR SELECT
  TO anon
  USING (true);

-- Packs: Allow guests to view public packs
CREATE POLICY IF NOT EXISTS "packs_select_policy_anon"
  ON public.packs
  FOR SELECT
  TO anon
  USING (is_private = false);

-- Pack Members: Allow guests to view pack membership
CREATE POLICY IF NOT EXISTS "pack_members_select_policy_anon"
  ON public.pack_members
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.packs
      WHERE packs.id = pack_members.pack_id
      AND packs.is_private = false
    )
  );

-- Pack Posts: Allow guests to view posts in public packs
CREATE POLICY IF NOT EXISTS "pack_posts_select_policy_anon"
  ON public.pack_posts
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.packs
      WHERE packs.id = pack_posts.pack_id
      AND packs.is_private = false
    )
  );

-- Hashtags: Allow guests to view hashtags
CREATE POLICY IF NOT EXISTS "hashtags_select_policy_anon"
  ON public.hashtags
  FOR SELECT
  TO anon
  USING (true);

-- Post Hashtags: Allow guests to view post-hashtag relationships
CREATE POLICY IF NOT EXISTS "post_hashtags_select_policy_anon"
  ON public.post_hashtags
  FOR SELECT
  TO anon
  USING (true);

-- Post Mentions: Allow guests to view post mentions
CREATE POLICY IF NOT EXISTS "post_mentions_select_policy_anon"
  ON public.post_mentions
  FOR SELECT
  TO anon
  USING (true);

-- Add helpful comments
COMMENT ON POLICY "comments_select_policy_anon" ON public.comments IS
  'Allow anonymous users to view non-deleted comments';

COMMENT ON POLICY "users_select_policy_anon" ON public.users IS
  'Allow anonymous users to view all user profiles';

COMMENT ON POLICY "post_likes_select_policy_anon" ON public.post_likes IS
  'Allow anonymous users to view post likes for counts';

COMMENT ON POLICY "post_reactions_select_policy_anon" ON public.post_reactions IS
  'Allow anonymous users to view post reactions';

COMMENT ON POLICY "follows_select_policy_anon" ON public.follows IS
  'Allow anonymous users to view follow relationships for counts';

COMMENT ON POLICY "places_select_policy_anon" ON public.places IS
  'Allow anonymous users to view all places on the map';

COMMENT ON POLICY "packs_select_policy_anon" ON public.packs IS
  'Allow anonymous users to view public packs';

COMMENT ON POLICY "hashtags_select_policy_anon" ON public.hashtags IS
  'Allow anonymous users to view hashtags';
