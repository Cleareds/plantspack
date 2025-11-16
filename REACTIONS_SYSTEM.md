# Multi-Reaction System

Complete implementation of a comprehensive reaction system with multiple reaction types for both posts and comments.

## 🎯 Features Implemented

### ✅ Post Reactions
- **4 Reaction Types**: Like ❤️, Helpful 💡, Inspiring ✨, Thoughtful 💭
- **Visual Feedback**: Each reaction has unique color and icon
- **Real-time Updates**: Optimistic UI updates for instant feedback
- **Notification Integration**: Reactions trigger notifications to content authors
- **Toggle Functionality**: Click again to remove reaction

### ✅ Comment Reactions
- **Same 4 Reaction Types**: Consistent experience across posts and comments
- **Smaller UI**: Compact design suitable for comment threads
- **Independent Tracking**: Each comment has its own reaction counts
- **Notification Support**: Comment authors receive reaction notifications

---

## 📁 Files Created/Modified

### New Files:

1. **Database Migration**
   - `supabase/migrations/20251114000004_add_reactions_system.sql`
   - Creates post_reactions and comment_reactions tables
   - Migrates existing post_likes to new system
   - Implements toggle functions
   - Sets up RLS policies

2. **Post Reactions Component**
   - `src/components/reactions/ReactionButtons.tsx`
   - Full-size reaction buttons for posts
   - Real-time count updates
   - Optimistic UI updates

3. **Comment Reactions Component**
   - `src/components/reactions/CommentReactions.tsx`
   - Compact reaction buttons for comments
   - Same functionality as post reactions
   - Smaller visual footprint

### Modified Files:

1. **PostCard Component**
   - `src/components/posts/PostCard.tsx`
   - Replaced single like button with ReactionButtons
   - Integrated with existing notification system

2. **Comments Component**
   - `src/components/posts/Comments.tsx`
   - Added CommentReactions to each comment
   - Positioned below comment content

---

## 🗄️ Database Schema

### Tables Created

#### `post_reactions`
```sql
- id: UUID (primary key)
- post_id: UUID (references posts)
- user_id: UUID (references users)
- reaction_type: TEXT (like, helpful, inspiring, thoughtful)
- created_at: TIMESTAMPTZ
- UNIQUE(post_id, user_id, reaction_type)
```

#### `comment_reactions`
```sql
- id: UUID (primary key)
- comment_id: UUID (references comments)
- user_id: UUID (references users)
- reaction_type: TEXT (like, helpful, inspiring, thoughtful)
- created_at: TIMESTAMPTZ
- UNIQUE(comment_id, user_id, reaction_type)
```

### Functions

#### `toggle_post_reaction(post_uuid, reaction)`
Toggles a reaction on a post (adds if not exists, removes if exists).

#### `toggle_comment_reaction(comment_uuid, reaction)`
Toggles a reaction on a comment (adds if not exists, removes if exists).

#### `get_post_reaction_counts(post_uuid)`
Returns count of each reaction type for a post.

#### `get_comment_reaction_counts(comment_uuid)`
Returns count of each reaction type for a comment.

---

## 🎨 Reaction Types

### Like ❤️
- **Icon**: Heart
- **Color**: Red (#dc2626)
- **Use Case**: General appreciation
- **Notification**: "liked your post/comment"

### Helpful 💡
- **Icon**: Lightbulb
- **Color**: Yellow (#ca8a04)
- **Use Case**: Useful information
- **Notification**: "found your post/comment helpful"

### Inspiring ✨
- **Icon**: Sparkles
- **Color**: Purple (#9333ea)
- **Use Case**: Motivational content
- **Notification**: "was inspired by your post/comment"

### Thoughtful 💭
- **Icon**: MessageHeart
- **Color**: Blue (#2563eb)
- **Use Case**: Deep insights
- **Notification**: "found your post/comment thoughtful"

---

## 💡 How It Works

### Post Reaction Flow

1. **User clicks reaction** (e.g., "Helpful")
2. **UI updates immediately** (optimistic update)
3. **API call to toggle reaction**
   - If not reacted: Insert into post_reactions
   - If already reacted: Delete from post_reactions
4. **Notification sent** to post author (if not self-reaction)
5. **Counts refresh** from database

### Comment Reaction Flow

Same as post reactions, but uses comment_reactions table and notifies comment author.

---

## 🎯 Usage Examples

### Using ReactionButtons in Posts

```tsx
import ReactionButtons from '@/components/reactions/ReactionButtons'

// In your PostCard component
<ReactionButtons
  postId={post.id}
  onReactionChange={() => refreshPosts()}
  showSignUpModal={(action) => {
    // Handle unauthenticated users
    setShowSignUpModal(true)
  }}
/>
```

### Using CommentReactions in Comments

```tsx
import CommentReactions from '@/components/reactions/CommentReactions'

// In your comment display
<CommentReactions
  commentId={comment.id}
  onReactionChange={() => refreshComments()}
/>
```

---

## 🎨 Styling

### Post Reactions
- **Size**: Medium (h-5 w-5 icons)
- **Spacing**: space-x-2 between buttons
- **Padding**: px-2 py-1
- **States**:
  - Default: Gray text
  - Active: Colored background + colored text + filled icon
  - Hover: Colored text + light background

### Comment Reactions
- **Size**: Small (h-3.5 w-3.5 icons)
- **Spacing**: space-x-1 between buttons
- **Padding**: px-1.5 py-0.5
- **Font**: text-xs
- **Same color scheme** as post reactions

---

## 🔔 Notification Integration

### Notification Types

The system creates notifications for each reaction type:

```typescript
// Notification types
type: 'like' | 'helpful' | 'inspiring' | 'thoughtful'

// Entity types
entityType: 'post' | 'comment'
```

### Notification Messages

Update your notification display to handle new types:

```tsx
// In NotificationBell component
const getMessage = (notification) => {
  switch (notification.type) {
    case 'like':
      return 'liked your post'
    case 'helpful':
      return 'found your post helpful'
    case 'inspiring':
      return 'was inspired by your post'
    case 'thoughtful':
      return 'found your post thoughtful'
  }
}
```

---

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
# Using Supabase CLI
npx supabase db push

# Or manually in Supabase Dashboard
# Run: supabase/migrations/20251114000004_add_reactions_system.sql
```

### 2. Verify Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('post_reactions', 'comment_reactions');

-- Check existing likes migrated
SELECT COUNT(*) as migrated_likes
FROM post_reactions
WHERE reaction_type = 'like';

-- Test toggle function
SELECT toggle_post_reaction(
  'your-post-uuid'::uuid,
  'like'
);
```

### 3. Deploy Code

```bash
npm run build
npx vercel --prod
```

### 4. Test Reactions

1. **Test Post Reactions**:
   - Click each reaction type
   - Verify counts update
   - Check visual states change
   - Confirm can toggle off

2. **Test Comment Reactions**:
   - React to a comment
   - Verify smaller UI renders correctly
   - Check counts display

3. **Test Notifications**:
   - React to someone else's content
   - Verify they receive notification
   - Check notification type is correct

---

## 📊 Analytics & Insights

### Popular Reaction Queries

```sql
-- Most helpful posts
SELECT
  p.id,
  p.content,
  COUNT(pr.id) as helpful_count
FROM posts p
JOIN post_reactions pr ON p.id = pr.post_id
WHERE pr.reaction_type = 'helpful'
GROUP BY p.id
ORDER BY helpful_count DESC
LIMIT 20;

-- Most inspiring users
SELECT
  u.username,
  COUNT(pr.id) as inspiring_count
FROM users u
JOIN posts p ON u.id = p.user_id
JOIN post_reactions pr ON p.id = pr.post_id
WHERE pr.reaction_type = 'inspiring'
GROUP BY u.id
ORDER BY inspiring_count DESC
LIMIT 20;

-- Reaction distribution
SELECT
  reaction_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM post_reactions
GROUP BY reaction_type
ORDER BY count DESC;

-- Most engaged posts (all reactions)
SELECT
  p.id,
  p.content,
  COUNT(DISTINCT pr.id) as total_reactions,
  COUNT(DISTINCT CASE WHEN pr.reaction_type = 'like' THEN pr.id END) as likes,
  COUNT(DISTINCT CASE WHEN pr.reaction_type = 'helpful' THEN pr.id END) as helpful,
  COUNT(DISTINCT CASE WHEN pr.reaction_type = 'inspiring' THEN pr.id END) as inspiring,
  COUNT(DISTINCT CASE WHEN pr.reaction_type = 'thoughtful' THEN pr.id END) as thoughtful
FROM posts p
LEFT JOIN post_reactions pr ON p.id = pr.post_id
GROUP BY p.id
ORDER BY total_reactions DESC
LIMIT 20;
```

---

## 🔐 Security & Permissions

### RLS Policies

#### post_reactions
- ✅ Anyone can view reactions (public data)
- ✅ Users can add their own reactions
- ✅ Users can remove their own reactions
- ❌ Users cannot modify others' reactions

#### comment_reactions
- ✅ Anyone can view reactions
- ✅ Users can add their own reactions
- ✅ Users can remove their own reactions
- ❌ Users cannot modify others' reactions

### Unique Constraints

- User can only have **one reaction of each type** per post
- User can have **multiple different reactions** on the same post
  - Example: Can like AND find helpful the same post
- Same rules apply to comments

---

## 🎯 Advanced Features

### Add New Reaction Type

To add a new reaction type (e.g., "Funny"):

1. **Update Database**:
```sql
-- Add to CHECK constraint
ALTER TABLE post_reactions
DROP CONSTRAINT post_reactions_reaction_type_check;

ALTER TABLE post_reactions
ADD CONSTRAINT post_reactions_reaction_type_check
CHECK (reaction_type IN ('like', 'helpful', 'inspiring', 'thoughtful', 'funny'));

-- Same for comment_reactions
```

2. **Update Components**:
```tsx
// In ReactionButtons.tsx and CommentReactions.tsx
const reactionConfig = {
  // ... existing reactions
  funny: {
    icon: Laugh,
    label: 'Funny',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    hoverBg: 'hover:bg-orange-100'
  }
}
```

### Reaction Leaderboards

Create a leaderboard component showing top reacted content:

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TopReactedPosts() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    const fetchTop = async () => {
      const { data } = await supabase
        .rpc('get_top_reacted_posts', { limit_count: 10 })
      setPosts(data)
    }
    fetchTop()
  }, [])

  // Render posts with reaction counts
}
```

---

## 🐛 Troubleshooting

### Reactions Not Saving

**Check:**
- Migration applied successfully
- post_reactions and comment_reactions tables exist
- RLS policies are active

**Debug:**
```sql
-- Test insert manually
INSERT INTO post_reactions (post_id, user_id, reaction_type)
VALUES ('post-uuid', 'user-uuid', 'like');

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename IN ('post_reactions', 'comment_reactions');
```

### Counts Not Updating

**Check:**
- Browser console for errors
- Network tab for failed requests
- Supabase logs for database errors

**Fix:**
```tsx
// Add logging to fetchReactions
console.log('Fetching reactions for:', postId)
console.log('Reactions data:', reactions)
```

### Migration from post_likes Failed

**Check:**
```sql
-- Verify data migrated
SELECT COUNT(*) FROM post_likes;
SELECT COUNT(*) FROM post_reactions WHERE reaction_type = 'like';
-- Counts should match
```

**Fix if needed:**
```sql
-- Manually migrate
INSERT INTO post_reactions (post_id, user_id, reaction_type, created_at)
SELECT post_id, user_id, 'like', created_at
FROM post_likes
ON CONFLICT DO NOTHING;
```

---

## 🧪 Testing Checklist

- [ ] Post reactions display correctly
- [ ] Each reaction type toggles on/off
- [ ] Counts update immediately
- [ ] Multiple reactions can be active
- [ ] Comment reactions display correctly
- [ ] Comment reactions are smaller than post reactions
- [ ] Notifications sent for reactions
- [ ] Cannot react to own content (notifications)
- [ ] Reaction counts persist after page refresh
- [ ] Optimistic updates work
- [ ] Error states handle gracefully
- [ ] Works for unauthenticated users (prompts sign-up)

---

## 📈 Performance Optimizations

### Indexes

All necessary indexes are created by the migration:
- `idx_post_reactions_post_id` - Fast post -> reactions lookup
- `idx_post_reactions_user_id` - Fast user -> reactions lookup
- `idx_post_reactions_type` - Reaction type filtering
- `idx_comment_reactions_comment_id` - Fast comment -> reactions
- `idx_comment_reactions_user_id` - User's comment reactions

### Caching Strategy

Consider caching reaction counts:

```tsx
// Use React Query or SWR for caching
import { useQuery } from '@tanstack/react-query'

const { data: reactions } = useQuery(
  ['reactions', postId],
  () => fetchReactions(postId),
  { staleTime: 30000 } // Cache for 30 seconds
)
```

---

## 🎉 Summary

You now have a complete multi-reaction system with:

✅ **4 Reaction Types** - Like, Helpful, Inspiring, Thoughtful
✅ **Post Reactions** - Full-featured reaction buttons
✅ **Comment Reactions** - Compact reaction buttons
✅ **Real-time Updates** - Optimistic UI with instant feedback
✅ **Notification Integration** - Authors get notified of reactions
✅ **Database Migration** - Automated migration from post_likes
✅ **RLS Security** - Proper permissions and constraints
✅ **Unique Constraints** - Prevent duplicate reactions
✅ **Beautiful UI** - Color-coded icons with smooth animations
✅ **Toggle Functionality** - Click to add/remove reactions
✅ **Analytics Ready** - Full tracking of reaction patterns

The system is production-ready and follows best practices for social platforms!
