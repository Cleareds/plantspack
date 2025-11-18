# Performance Optimization Fixes

## Critical N+1 Query Issues

### Problem
Currently loading post reactions and follow status individually for each post:
- 20 posts = 40 separate database requests (20 for reactions + 20 for follows)
- This causes significant performance degradation and increased database load

### Solution Overview
Bulk load reactions and follows for all posts in a single request, then distribute to individual components via props.

---

## Fix 1: Optimize Post Reactions Loading

### Current Flow (N+1)
```
Feed → PostCard (x20) → ReactionButtons (x20) → 20 separate DB queries
```

### Optimized Flow
```
Feed → 1 bulk query for all reactions → Pass to PostCard → ReactionButtons
```

### Implementation

#### Step 1: Modify Feed Component to Bulk Load Reactions

Add this to `src/components/posts/Feed.tsx` after loading posts:

```typescript
// After loading posts, bulk load all reactions
const postIds = posts.map(p => p.id);

let reactionsByPost: Record<string, any[]> = {};

if (postIds.length > 0) {
  const { data: allReactions } = await supabase
    .from('post_reactions')
    .select('reaction_type, user_id, post_id')
    .in('post_id', postIds);

  // Group reactions by post_id
  if (allReactions) {
    reactionsByPost = allReactions.reduce((acc, reaction) => {
      if (!acc[reaction.post_id]) acc[reaction.post_id] = [];
      acc[reaction.post_id].push(reaction);
      return acc;
    }, {} as Record<string, any[]>);
  }
}
```

#### Step 2: Pass Reactions to PostCard

```typescript
<PostCard
  key={post.id}
  post={post}
  reactions={reactionsByPost[post.id] || []}
  onUpdate={loadPosts}
/>
```

#### Step 3: Update PostCard to Accept and Pass Reactions

In `src/components/posts/PostCard.tsx`:

```typescript
interface PostCardProps {
  post: Post
  onUpdate?: () => void
  reactions?: any[]  // Add this
}

function PostCard({ post, onUpdate, reactions }: PostCardProps) {
  // ...

  // Pass reactions to ReactionButtons
  <ReactionButtons
    postId={post.id}
    initialReactions={reactions}  // Add this
  />
}
```

#### Step 4: Update ReactionButtons to Use Passed Reactions

In `src/components/reactions/ReactionButtons.tsx`:

```typescript
interface ReactionButtonsProps {
  postId: string
  initialReactions?: any[]  // Add this
}

export default function ReactionButtons({ postId, initialReactions }: ReactionButtonsProps) {
  const { user } = useAuth()
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({
    like: 0,
    helpful: 0,
    inspiring: 0,
    celebrate: 0,
    support: 0,
  })
  const [userReactions, setUserReactions] = useState<Set<ReactionType>>(new Set())
  const [loading, setLoading] = useState<ReactionType | null>(null)

  // Initialize from passed reactions
  useEffect(() => {
    if (initialReactions) {
      const newCounts: ReactionCounts = {
        like: 0,
        helpful: 0,
        inspiring: 0,
        celebrate: 0,
        support: 0,
      }

      const newUserReactions = new Set<ReactionType>()

      initialReactions.forEach((reaction: any) => {
        newCounts[reaction.reaction_type as ReactionType]++
        if (user && reaction.user_id === user.id) {
          newUserReactions.add(reaction.reaction_type as ReactionType)
        }
      })

      setReactionCounts(newCounts)
      setUserReactions(newUserReactions)
    }
  }, [initialReactions, user])

  // Remove the fetchReactions useEffect and function
  // Keep only the handleReactionClick function for user interactions
}
```

---

## Fix 2: Optimize Follow Status Loading

### Implementation

#### Step 1: Bulk Load Follow Status in Feed

Add this to `src/components/posts/Feed.tsx`:

```typescript
// Get unique author IDs from posts
const authorIds = [...new Set(posts.map(p => p.user_id))];

let followingSet = new Set<string>();

if (user && authorIds.length > 0) {
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .in('following_id', authorIds);

  if (follows) {
    followingSet = new Set(follows.map(f => f.following_id));
  }
}
```

#### Step 2: Pass Follow Status to PostCard

```typescript
<PostCard
  key={post.id}
  post={post}
  reactions={reactionsByPost[post.id] || []}
  isFollowing={followingSet.has(post.user_id)}
  onUpdate={loadPosts}
/>
```

#### Step 3: Update PostCard to Use Passed Follow Status

```typescript
interface PostCardProps {
  post: Post
  onUpdate?: () => void
  reactions?: any[]
  isFollowing?: boolean  // Add this
}

function PostCard({ post, onUpdate, reactions, isFollowing }: PostCardProps) {
  // Pass to FollowButton if it exists
  <FollowButton
    userId={post.user_id}
    initialIsFollowing={isFollowing}
  />
}
```

---

## Expected Performance Improvement

### Before:
- Loading 20 posts: ~42 requests (20 posts + 20 reactions + 20 follows + 2 misc)
- ~800ms - 1.5s load time

### After:
- Loading 20 posts: ~5 requests (1 posts + 1 reactions + 1 follows + 2 misc)
- ~200ms - 400ms load time

**Performance gain: ~3-5x faster page loads**

---

## Testing Checklist

After implementing:
1. ✓ Verify posts load correctly
2. ✓ Verify reaction counts are accurate
3. ✓ Verify user's own reactions are highlighted
4. ✓ Verify clicking reactions works
5. ✓ Verify follow buttons show correct status
6. ✓ Verify clicking follow/unfollow works
7. ✓ Check browser network tab shows reduced requests
8. ✓ Test with 0 posts, 1 post, and many posts

---

## Notes

- This optimization applies to Feed, but similar patterns should be applied to:
  - User profile pages showing posts
  - Hashtag pages showing posts
  - Any other page that displays multiple posts

- The same pattern can be applied to comments if they have similar N+1 issues

- Consider implementing pagination to limit initial data load (currently loads all at once)
