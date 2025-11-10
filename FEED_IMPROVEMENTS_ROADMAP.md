# Feed Implementation Improvements - Technical Roadmap

## Quick Reference - Critical Issues

| Issue | Severity | Impact | Effort | Status |
|-------|----------|--------|--------|--------|
| No post edit/delete | CRITICAL | Can't fix errors | Medium | TODO |
| No real-time updates | CRITICAL | Stale data | High | TODO |
| Missing comment pagination | CRITICAL | UX breaks >100 comments | Medium | TODO |
| Race conditions (likes) | CRITICAL | Data inconsistency | Low | TODO |
| No database indexes | HIGH | Performance degradation | Low | TODO |
| Feed fetches 3x data | HIGH | Bandwidth waste | Medium | TODO |
| No comment edit/delete | HIGH | Moderation issues | Medium | TODO |
| No error recovery | HIGH | Poor UX | Medium | TODO |

---

## Phase 1: Critical Fixes (Weeks 1-2)

### 1.1 Add Post Edit/Delete Functionality

**Files to Create:**
- `src/app/api/posts/[id]/route.ts` - PUT/DELETE endpoints
- `src/components/posts/EditPost.tsx` - Modal component
- `src/hooks/usePostActions.ts` - Shared logic

**Changes to Existing Files:**
- `src/components/posts/PostCard.tsx` - Add edit/delete menu
- `src/database.types.ts` - Ensure updated_at, deleted_at fields
- `src/components/posts/Feed.tsx` - Handle post removal from feed

**Database Changes:**
```sql
-- Add soft delete support
ALTER TABLE posts ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at);

-- Modify feed queries to exclude deleted posts
WHERE deleted_at IS NULL AND privacy = 'public'
```

**Implementation Checklist:**
- [ ] Add edit modal with content validation
- [ ] Add delete confirmation dialog
- [ ] Implement soft delete (don't actually delete)
- [ ] Update audit trail
- [ ] Handle permission checks (only owner can edit/delete)
- [ ] Update feed to remove deleted posts
- [ ] Add error handling for concurrent deletes
- [ ] Test with comments/likes on deleted posts

**Estimated Time:** 4-6 hours

---

### 1.2 Implement Comment Pagination

**Files to Modify:**
- `src/components/posts/Comments.tsx` - Add limit + offset
- `src/lib/feed-algorithm.ts` - Add getComments function

**Key Changes:**
```typescript
// BEFORE:
const { data, error } = await supabase
  .from('comments')
  .select(...)
  .eq('post_id', postId)
  .order('created_at', { ascending: true })
  // NO LIMIT

// AFTER:
const COMMENTS_PER_PAGE = 20
const { data, error } = await supabase
  .from('comments')
  .select(...)
  .eq('post_id', postId)
  .order('created_at', { ascending: false })
  .range(offset, offset + COMMENTS_PER_PAGE - 1)
```

**Database Changes:**
```sql
CREATE INDEX idx_comments_post_id_created_at 
  ON comments(post_id, created_at DESC);
```

**Implementation Checklist:**
- [ ] Add pagination state (offset, hasMore)
- [ ] Load comments on demand ("Load more" button)
- [ ] Remove deduplication logic
- [ ] Add loading skeleton for comment chunks
- [ ] Handle missing comments gracefully
- [ ] Test with 1000+ comments

**Estimated Time:** 3-4 hours

---

### 1.3 Add Database Indexes

**Critical Indexes:**
```sql
-- Feed queries
CREATE INDEX idx_posts_privacy_created_at 
  ON posts(privacy, created_at DESC);
  
CREATE INDEX idx_posts_engagement_score_created_at 
  ON posts(engagement_score DESC, created_at DESC);

-- Like/comment lookups
CREATE INDEX idx_post_likes_post_id_user_id 
  ON post_likes(post_id, user_id);
  
CREATE INDEX idx_post_likes_user_id 
  ON post_likes(user_id);

CREATE INDEX idx_comments_post_id 
  ON comments(post_id);

-- Follow relationships
CREATE INDEX idx_follows_follower_id 
  ON follows(follower_id);
  
CREATE INDEX idx_follows_following_id 
  ON follows(following_id);
```

**Verification:**
```bash
# Check index creation
psql -c "\d posts"
psql -c "EXPLAIN ANALYZE SELECT * FROM posts WHERE privacy = 'public' ORDER BY created_at DESC LIMIT 10;"
```

**Estimated Time:** 1-2 hours

---

### 1.4 Fix Race Conditions on Likes

**Current Problem:**
- User clicks like rapidly = multiple INSERT requests
- Optimistic update without rollback
- Unique constraint prevents duplicates but creates errors

**Solution:**
```typescript
// BEFORE:
const handleLike = async () => {
  setIsLiked(!isLiked)  // Optimistic - no rollback!
  await supabase.from('post_likes').insert(...)
}

// AFTER:
const handleLike = async () => {
  if (loading) return  // Prevent duplicate clicks
  
  const previousState = isLiked
  const previousCount = likeCount
  
  setLoading(true)
  setIsLiked(!isLiked)  // Optimistic
  setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
  
  try {
    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: post.id, user_id: user.id })
    }
  } catch (error) {
    // Rollback on error
    setIsLiked(previousState)
    setLikeCount(previousCount)
    throw error
  } finally {
    setLoading(false)
  }
}
```

**Implementation Checklist:**
- [ ] Add idempotency key to requests
- [ ] Implement error rollback
- [ ] Add loading state to prevent double-clicks
- [ ] Test rapid-fire clicks
- [ ] Add visual feedback during operation

**Estimated Time:** 2-3 hours

---

### 1.5 Improve Error Handling

**Create Error Boundary:**
```typescript
// src/components/error/ErrorBoundary.tsx
class FeedErrorBoundary extends React.Component {
  state = { error: null, errorInfo: null }
  
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    logErrorToService(error, errorInfo)
  }
  
  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

**Implement Error Recovery:**
- Show specific error messages (not just "Error loading posts")
- Provide "Retry" buttons for transient errors
- Suggest actions for common errors
- Log errors with context for debugging

**Examples:**
```typescript
const ERROR_MESSAGES = {
  'PGRST116': 'Post not found',
  'PGRST100': 'Invalid query',
  'network': 'Check your internet connection',
  'timeout': 'Request took too long, please retry',
  'auth': 'Please sign in to continue'
}
```

**Implementation Checklist:**
- [ ] Create error type detection
- [ ] Write user-friendly messages
- [ ] Add retry logic with exponential backoff
- [ ] Log errors with context
- [ ] Test error scenarios
- [ ] Add error monitoring (Sentry, etc.)

**Estimated Time:** 4-5 hours

---

## Phase 2: Important Improvements (Weeks 3-4)

### 2.1 Implement Real-Time Subscriptions

**Use Supabase Realtime:**
```typescript
// src/hooks/useRealtimePosts.ts
export function useRealtimePosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([])
  
  useEffect(() => {
    // Subscribe to new posts
    const subscription = supabase
      .channel('public:posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: 'privacy=eq.public'
        },
        (payload) => {
          const newPost = payload.new as Post
          setPosts(prev => [newPost, ...prev])
        }
      )
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [])
  
  return posts
}
```

**Also Subscribe To:**
- Updates on likes count
- New comments
- Updated engagement_score
- Deletion events (for soft deletes)

**Implementation Checklist:**
- [ ] Set up realtime subscriptions
- [ ] Handle reconnection
- [ ] Merge realtime data with fetched data
- [ ] Show "new posts" indicator
- [ ] Test with multiple clients
- [ ] Handle subscription errors

**Estimated Time:** 6-8 hours

---

### 2.2 Add Caching with React Query

**Install Dependencies:**
```bash
npm install @tanstack/react-query
```

**Create Query Hooks:**
```typescript
// src/hooks/useFeeds.ts
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

export function useFeedPosts(options: FeedOptions) {
  return useInfiniteQuery({
    queryKey: ['feed', options.sortBy, options.userId],
    queryFn: ({ pageParam = 0 }) => getFeedPosts({
      ...options,
      offset: pageParam
    }),
    getNextPageParam: (lastPage) => 
      lastPage.length === POSTS_PER_PAGE 
        ? Math.floor(lastPage[lastPage.length - 1].created_at) 
        : undefined,
    staleTime: 30000,  // 30 seconds
    gcTime: 5 * 60 * 1000,  // 5 minutes (formerly cacheTime)
  })
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId),
    staleTime: 60000,
  })
}
```

**Implementation Checklist:**
- [ ] Set up QueryClientProvider
- [ ] Replace all fetch calls with hooks
- [ ] Configure cache times
- [ ] Add request deduplication
- [ ] Test cache behavior
- [ ] Add cache invalidation on mutations

**Estimated Time:** 8-10 hours

---

### 2.3 Optimize Feed Algorithm

**Current Problem:**
```typescript
// Fetches 30 posts to return 10
.limit(limit * 3)
```

**Solution - Cursor-Based Pagination:**
```typescript
// Use created_at as cursor instead of offset
const getCursorPosts = async (
  cursor?: string,  // created_at timestamp
  limit: number = 10
) => {
  let query = supabase
    .from('posts')
    .select(...)
    .eq('privacy', 'public')
    .order('created_at', { ascending: false })
    .limit(limit + 1)  // +1 to detect hasMore
  
  if (cursor) {
    query = query.lt('created_at', cursor)
  }
  
  const { data } = await query
  const hasMore = data.length > limit
  return data.slice(0, limit)
}
```

**Reduce Over-Fetching:**
```typescript
// Don't fetch 3x data
.limit(limit)  // Just what we need

// Select only needed fields
.select(`id, user_id, content, created_at, 
         engagement_score, users (id, username, avatar_url),
         post_likes (count), comments (count)`)
```

**Implementation Checklist:**
- [ ] Implement cursor-based pagination
- [ ] Reduce limit multiplier from 3 to 1
- [ ] Select only needed fields
- [ ] Test with large datasets
- [ ] Measure performance improvement
- [ ] Update offset logic in Feed component

**Estimated Time:** 6-8 hours

---

### 2.4 Add Comment Edit/Delete

Similar to post edit/delete:
- Add edit modal for comments
- Soft delete with deleted_at column
- Permission checks (only comment author)
- Update UI to show edited indicator
- Handle cascading deletes

**Estimated Time:** 4-5 hours

---

### 2.5 Implement Error Recovery

- Exponential backoff retry logic
- Offline queue for mutations
- Automatic error reporting
- User-friendly error messages
- Recovery suggestions

**Example:**
```typescript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  let lastError
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const delay = Math.pow(2, i) * 1000  // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}
```

**Estimated Time:** 4-5 hours

---

## Phase 3: Enhancements (Weeks 5+)

### 3.1 Comment Threading
- Parent comment replies
- Nested display with indentation
- Collapse/expand threads
- Mention notifications

### 3.2 Notification System
- Like notifications
- Comment reply notifications
- Follow notifications
- Real-time badge counts

### 3.3 Post Scheduling
- Schedule posts for future publish
- Timezone support
- Recurring posts
- Draft management UI

### 3.4 Advanced Analytics
- Post performance metrics
- Engagement trends
- Audience insights
- Best posting times

### 3.5 Performance Monitoring
- Web Vitals tracking
- Error rate monitoring
- Query performance logging
- User experience metrics

---

## Implementation Priorities Matrix

```
         IMPACT
        LOW    HIGH
   L   [3.x]  [2.1]
I  O   [3.3]  [1.2]
M  W   [3.2]  [1.1]
E  E   [3.4]  [1.3]
        [3.1]  [1.4]
               [2.2]
               [2.3]
               [2.4]
               [2.5]
```

**Recommended Order:**
1. Phase 1 completely (prevents user-facing bugs)
2. Phase 2.1-2.3 (major UX improvements)
3. Phase 2.4-2.5 (stability improvements)
4. Phase 3 (nice-to-haves)

---

## Testing Checklist

### Unit Tests
- [ ] Feed algorithm sorting
- [ ] Comment pagination logic
- [ ] Error handling
- [ ] Cache invalidation

### Integration Tests
- [ ] Post creation → Feed display
- [ ] Like → Comment count update
- [ ] Real-time subscription
- [ ] Offline behavior

### E2E Tests
- [ ] Full post lifecycle (create → like → comment → delete)
- [ ] Feed pagination
- [ ] Large dataset performance
- [ ] Error recovery

### Performance Tests
- [ ] Feed load time < 2s
- [ ] Like operation < 500ms
- [ ] Comment pagination < 1s
- [ ] Real-time update latency < 3s

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Feed load time | < 2s | ~3s |
| Like latency | < 500ms | ~1s |
| Comment load time | < 1s | ~2s |
| Error recovery rate | > 95% | ~70% |
| Real-time delay | < 3s | N/A |
| Cache hit rate | > 80% | ~0% |

---

## Risk Mitigation

**Database Migration Risks:**
- Create backups before index creation
- Test indexes on staging first
- Run migrations during low-traffic hours
- Monitor query performance during/after

**Breaking Changes:**
- Maintain backward compatibility
- Feature flag new implementations
- Gradual rollout to users
- Monitor error rates closely

**Performance Regression:**
- Benchmark before/after
- Load test with realistic data
- Monitor production metrics
- Have rollback plan ready

