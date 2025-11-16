-- Add functions to get user statistics
-- Includes reaction counts and follower/following counts

-- Function to get user's reaction statistics
CREATE OR REPLACE FUNCTION get_user_reaction_stats(user_uuid UUID)
RETURNS TABLE (
  total_likes BIGINT,
  total_helpful BIGINT,
  total_inspiring BIGINT,
  total_thoughtful BIGINT,
  total_reactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN pr.reaction_type = 'like' THEN 1 END)::BIGINT as total_likes,
    COUNT(CASE WHEN pr.reaction_type = 'helpful' THEN 1 END)::BIGINT as total_helpful,
    COUNT(CASE WHEN pr.reaction_type = 'inspiring' THEN 1 END)::BIGINT as total_inspiring,
    COUNT(CASE WHEN pr.reaction_type = 'thoughtful' THEN 1 END)::BIGINT as total_thoughtful,
    COUNT(*)::BIGINT as total_reactions
  FROM posts p
  LEFT JOIN post_reactions pr ON p.id = pr.post_id
  WHERE p.user_id = user_uuid
    AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's comment reaction statistics
CREATE OR REPLACE FUNCTION get_user_comment_reaction_stats(user_uuid UUID)
RETURNS TABLE (
  total_likes BIGINT,
  total_helpful BIGINT,
  total_inspiring BIGINT,
  total_thoughtful BIGINT,
  total_reactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN cr.reaction_type = 'like' THEN 1 END)::BIGINT as total_likes,
    COUNT(CASE WHEN cr.reaction_type = 'helpful' THEN 1 END)::BIGINT as total_helpful,
    COUNT(CASE WHEN cr.reaction_type = 'inspiring' THEN 1 END)::BIGINT as total_inspiring,
    COUNT(CASE WHEN cr.reaction_type = 'thoughtful' THEN 1 END)::BIGINT as total_thoughtful,
    COUNT(*)::BIGINT as total_reactions
  FROM comments c
  LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
  WHERE c.user_id = user_uuid
    AND c.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get combined user reaction stats (posts + comments)
CREATE OR REPLACE FUNCTION get_user_total_reaction_stats(user_uuid UUID)
RETURNS TABLE (
  total_likes BIGINT,
  total_helpful BIGINT,
  total_inspiring BIGINT,
  total_thoughtful BIGINT,
  total_reactions BIGINT
) AS $$
DECLARE
  post_stats RECORD;
  comment_stats RECORD;
BEGIN
  -- Get post reaction stats
  SELECT * INTO post_stats FROM get_user_reaction_stats(user_uuid);

  -- Get comment reaction stats
  SELECT * INTO comment_stats FROM get_user_comment_reaction_stats(user_uuid);

  -- Return combined stats
  RETURN QUERY
  SELECT
    (COALESCE(post_stats.total_likes, 0) + COALESCE(comment_stats.total_likes, 0))::BIGINT,
    (COALESCE(post_stats.total_helpful, 0) + COALESCE(comment_stats.total_helpful, 0))::BIGINT,
    (COALESCE(post_stats.total_inspiring, 0) + COALESCE(comment_stats.total_inspiring, 0))::BIGINT,
    (COALESCE(post_stats.total_thoughtful, 0) + COALESCE(comment_stats.total_thoughtful, 0))::BIGINT,
    (COALESCE(post_stats.total_reactions, 0) + COALESCE(comment_stats.total_reactions, 0))::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follower and following counts
CREATE OR REPLACE FUNCTION get_user_follow_stats(user_uuid UUID)
RETURNS TABLE (
  followers_count BIGINT,
  following_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM follows WHERE following_id = user_uuid) as followers_count,
    (SELECT COUNT(*)::BIGINT FROM follows WHERE follower_id = user_uuid) as following_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get complete user statistics
CREATE OR REPLACE FUNCTION get_user_complete_stats(user_uuid UUID)
RETURNS TABLE (
  -- Reaction stats
  total_likes BIGINT,
  total_helpful BIGINT,
  total_inspiring BIGINT,
  total_thoughtful BIGINT,
  total_reactions BIGINT,
  -- Follow stats
  followers_count BIGINT,
  following_count BIGINT,
  -- Content stats
  posts_count BIGINT,
  comments_count BIGINT
) AS $$
DECLARE
  reaction_stats RECORD;
  follow_stats RECORD;
BEGIN
  -- Get reaction stats
  SELECT * INTO reaction_stats FROM get_user_total_reaction_stats(user_uuid);

  -- Get follow stats
  SELECT * INTO follow_stats FROM get_user_follow_stats(user_uuid);

  -- Return all stats
  RETURN QUERY
  SELECT
    reaction_stats.total_likes,
    reaction_stats.total_helpful,
    reaction_stats.total_inspiring,
    reaction_stats.total_thoughtful,
    reaction_stats.total_reactions,
    follow_stats.followers_count,
    follow_stats.following_count,
    (SELECT COUNT(*)::BIGINT FROM posts WHERE user_id = user_uuid AND deleted_at IS NULL) as posts_count,
    (SELECT COUNT(*)::BIGINT FROM comments WHERE user_id = user_uuid AND deleted_at IS NULL) as comments_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_reaction_stats IS 'Get reaction counts for user posts';
COMMENT ON FUNCTION get_user_comment_reaction_stats IS 'Get reaction counts for user comments';
COMMENT ON FUNCTION get_user_total_reaction_stats IS 'Get combined reaction counts for user posts and comments';
COMMENT ON FUNCTION get_user_follow_stats IS 'Get follower and following counts for user';
COMMENT ON FUNCTION get_user_complete_stats IS 'Get complete statistics for user including reactions, follows, and content counts';
