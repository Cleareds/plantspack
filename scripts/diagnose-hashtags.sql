-- ============================================
-- HASHTAG SYSTEM DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to check hashtag data integrity
-- ============================================

-- 1. Check how many hashtags exist
SELECT
  'Total Hashtags' as metric,
  COUNT(*) as count
FROM hashtags;

-- 2. Check how many post_hashtags links exist
SELECT
  'Total Post-Hashtag Links' as metric,
  COUNT(*) as count
FROM post_hashtags;

-- 3. Check how many posts have content with hashtags
SELECT
  'Posts with # in content' as metric,
  COUNT(*) as count
FROM posts
WHERE content LIKE '%#%'
  AND deleted_at IS NULL;

-- 4. Check how many public posts exist
SELECT
  'Total Public Posts' as metric,
  COUNT(*) as count
FROM posts
WHERE privacy = 'public'
  AND deleted_at IS NULL;

-- 5. Top 20 hashtags by usage count
SELECT
  tag,
  normalized_tag,
  usage_count,
  created_at
FROM hashtags
ORDER BY usage_count DESC
LIMIT 20;

-- 6. Check for discrepancies between usage_count and actual links
SELECT
  h.tag,
  h.usage_count as recorded_count,
  COUNT(ph.id) as actual_count,
  h.usage_count - COUNT(ph.id) as difference
FROM hashtags h
LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
GROUP BY h.id, h.tag, h.usage_count
HAVING h.usage_count != COUNT(ph.id)
ORDER BY ABS(h.usage_count - COUNT(ph.id)) DESC
LIMIT 20;

-- 7. Check for posts with hashtags in content but no links
SELECT
  p.id,
  p.user_id,
  LEFT(p.content, 100) as content_preview,
  p.created_at,
  COUNT(ph.id) as linked_hashtags
FROM posts p
LEFT JOIN post_hashtags ph ON ph.post_id = p.id
WHERE p.content LIKE '%#%'
  AND p.deleted_at IS NULL
GROUP BY p.id, p.user_id, p.content, p.created_at
HAVING COUNT(ph.id) = 0
ORDER BY p.created_at DESC
LIMIT 20;

-- 8. Summary statistics
SELECT
  (SELECT COUNT(*) FROM hashtags) as total_hashtags,
  (SELECT COUNT(*) FROM post_hashtags) as total_links,
  (SELECT COUNT(*) FROM posts WHERE content LIKE '%#%' AND deleted_at IS NULL) as posts_with_hashtag_content,
  (SELECT COUNT(DISTINCT p.id) FROM posts p INNER JOIN post_hashtags ph ON ph.post_id = p.id WHERE p.deleted_at IS NULL) as posts_with_links,
  (SELECT COUNT(*) FROM posts WHERE content LIKE '%#%' AND deleted_at IS NULL AND id NOT IN (SELECT post_id FROM post_hashtags)) as posts_missing_links;

-- 9. Check recent posts to see if hashtag linking is working for new posts
SELECT
  p.id,
  p.created_at,
  LEFT(p.content, 100) as content_preview,
  COUNT(ph.id) as linked_hashtags,
  CASE
    WHEN p.content LIKE '%#%' THEN 'Has hashtags in content'
    ELSE 'No hashtags in content'
  END as has_hashtags
FROM posts p
LEFT JOIN post_hashtags ph ON ph.post_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.created_at, p.content
ORDER BY p.created_at DESC
LIMIT 20;

-- 10. Check for orphaned post_hashtags (posts that were deleted)
SELECT
  'Orphaned Post-Hashtag Links' as metric,
  COUNT(*) as count
FROM post_hashtags ph
LEFT JOIN posts p ON p.id = ph.post_id
WHERE p.id IS NULL OR p.deleted_at IS NOT NULL;
