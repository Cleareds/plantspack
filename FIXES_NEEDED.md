# Issues to Fix

## 1. Rate Limit 404 Error

**Problem**: The RPC function `check_rate_limit_posts` doesn't exist in the database.

**Solution**: Create the database function in Supabase SQL Editor:

```sql
CREATE OR REPLACE FUNCTION check_rate_limit_posts(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  posts_count INTEGER,
  limit_reached BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_posts_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM users
  WHERE id = p_user_id;

  -- Set limits based on tier
  v_limit := CASE
    WHEN v_tier = 'premium' THEN 100
    WHEN v_tier = 'medium' THEN 50
    ELSE 20  -- free tier
  END;

  -- Count posts in last 24 hours
  SELECT COUNT(*) INTO v_posts_count
  FROM posts
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
    AND deleted_at IS NULL;

  RETURN QUERY SELECT
    v_posts_count < v_limit AS allowed,
    v_posts_count::INTEGER AS posts_count,
    v_posts_count >= v_limit AS limit_reached;
END;
$$;
```

**Alternative**: Comment out rate limiting temporarily in `src/components/posts/CreatePost.tsx`

---

## 2. Hashtag Posts Showing 0

**Problem**: Posts with hashtags aren't appearing on hashtag pages.

**Diagnostic Steps**:

1. Check if hashtags are being created:
```sql
SELECT * FROM hashtags WHERE tag IN ('test', 'tests');
```

2. Check if post_hashtags links exist:
```sql
SELECT ph.*, p.content
FROM post_hashtags ph
JOIN hashtags h ON ph.hashtag_id = h.id
JOIN posts p ON ph.post_id = p.id
WHERE h.tag IN ('test', 'tests');
```

**Possible Causes**:
- Hashtag API not being called when creating posts
- RLS policies blocking hashtag creation
- Frontend not extracting hashtags from post content

**Fix**: Verify hashtag extraction in CreatePost.tsx is working

---

## 3. Performance Issues - N+1 Queries

### 3.1 Duplicate Places Requests
**Status**: Need to investigate - might be React StrictMode or useEffect dependency issue

### 3.2 Posts Loaded Twice
**Status**: Check if this is React StrictMode in development or actual duplication

### 3.3 Post Reactions N+1 Problem ⚠️ CRITICAL

**Problem**: Loading reactions separately for each post instead of bulk loading.

**Current**: 20 posts = 20 separate requests
```
GET /post_reactions?post_id=eq.{id1}
GET /post_reactions?post_id=eq.{id2}
...
```

**Solution**: Load all reactions in one request using `.in()`:

```typescript
// In Feed component or wherever posts are loaded
const postIds = posts.map(p => p.id);

const { data: reactions } = await supabase
  .from('post_reactions')
  .select('reaction_type, user_id, post_id')
  .in('post_id', postIds);

// Group reactions by post_id
const reactionsByPost = reactions?.reduce((acc, reaction) => {
  if (!acc[reaction.post_id]) acc[reaction.post_id] = [];
  acc[reaction.post_id].push(reaction);
  return acc;
}, {});

// Attach to posts
const postsWithReactions = posts.map(post => ({
  ...post,
  reactions: reactionsByPost[post.id] || []
}));
```

### 3.4 Follows N+1 Problem ⚠️ CRITICAL

**Problem**: Checking follow status separately for each post author.

**Current**: 20 posts = 20 separate requests
```
GET /follows?follower_id=eq.{currentUser}&following_id=eq.{author1}
GET /follows?follower_id=eq.{currentUser}&following_id=eq.{author2}
...
```

**Solution**: Load all follow relationships in one request:

```typescript
// Get unique author IDs
const authorIds = [...new Set(posts.map(p => p.user_id))];

const { data: follows } = await supabase
  .from('follows')
  .select('following_id')
  .eq('follower_id', currentUserId)
  .in('following_id', authorIds);

// Create a Set for O(1) lookup
const followingSet = new Set(follows?.map(f => f.following_id));

// Check if following
const isFollowing = (userId) => followingSet.has(userId);
```

---

## Implementation Priority

1. **HIGH**: Fix N+1 queries for reactions and follows (major performance impact)
2. **MEDIUM**: Fix hashtag posts not showing (feature broken)
3. **LOW**: Fix rate limit 404 (can be handled gracefully in code)
4. **LOW**: Investigate duplicate requests (might be development-only)

---

## Files to Modify

### For Reactions N+1:
- `src/components/posts/Feed.tsx` or wherever reactions are loaded
- `src/components/reactions/ReactionButtons.tsx`

### For Follows N+1:
- `src/components/posts/Feed.tsx` or wherever follow status is checked
- `src/components/profile/FollowButton.tsx`

### For Hashtags:
- Verify `src/app/api/posts/hashtags/route.ts` is being called
- Check `src/components/posts/CreatePost.tsx` hashtag extraction

### For Rate Limit:
- Create SQL function in Supabase
- Or handle error gracefully in `src/components/posts/CreatePost.tsx`
