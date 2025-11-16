# User Statistics Dashboard

Complete implementation of user profile statistics showing reaction counts, follower/following numbers, and content statistics.

## 🎯 Features Implemented

### ✅ Reaction Statistics
- **Total Likes** ❤️ - Count of all likes received on posts and comments
- **Total Helpful** 💡 - Count of all helpful reactions received
- **Total Inspiring** ✨ - Count of all inspiring reactions received
- **Total Thoughtful** 🧠 - Count of all thoughtful reactions received

### ✅ Community Statistics
- **Followers** - Number of users following this profile
- **Following** - Number of users this profile follows

### ✅ Content Statistics
- **Posts** - Total number of posts created
- **Comments** - Total number of comments made

---

## 📁 Files Created/Modified

### New Files:

1. **Database Migration**
   - `supabase/migrations/20251114000005_add_user_stats_functions.sql`
   - Functions to calculate user statistics
   - Combines post and comment reactions
   - Counts followers and following
   - Counts posts and comments

2. **UserStats Component**
   - `src/components/profile/UserStats.tsx`
   - Beautiful card-based statistics display
   - Color-coded icons for each stat type
   - Loading states and error handling
   - Responsive grid layout

### Modified Files:

1. **Profile Page**
   - `src/app/profile/[username]/page.tsx`
   - Added UserStats to profile sidebar
   - Shows stats for own profile

2. **User Page**
   - `src/app/user/[username]/page.tsx`
   - Added UserStats to public profile sidebar
   - Shows stats for any user's public profile

---

## 🗄️ Database Functions

### `get_user_reaction_stats(user_uuid)`
Returns reaction counts for a user's **posts**.

**Returns:**
```sql
{
  total_likes: BIGINT,
  total_helpful: BIGINT,
  total_inspiring: BIGINT,
  total_thoughtful: BIGINT,
  total_reactions: BIGINT
}
```

### `get_user_comment_reaction_stats(user_uuid)`
Returns reaction counts for a user's **comments**.

**Returns:** Same structure as above

### `get_user_total_reaction_stats(user_uuid)`
Returns **combined** reaction counts (posts + comments).

**Returns:** Same structure as above

### `get_user_follow_stats(user_uuid)`
Returns follower and following counts.

**Returns:**
```sql
{
  followers_count: BIGINT,
  following_count: BIGINT
}
```

### `get_user_complete_stats(user_uuid)`
Returns **all statistics** in one call.

**Returns:**
```sql
{
  -- Reactions
  total_likes: BIGINT,
  total_helpful: BIGINT,
  total_inspiring: BIGINT,
  total_thoughtful: BIGINT,
  total_reactions: BIGINT,

  -- Community
  followers_count: BIGINT,
  following_count: BIGINT,

  -- Content
  posts_count: BIGINT,
  comments_count: BIGINT
}
```

---

## 🎨 UserStats Component

### Props

```typescript
interface UserStatsProps {
  userId: string
  className?: string
}
```

### Usage

```tsx
import UserStats from '@/components/profile/UserStats'

// In your profile/user page
<UserStats userId={user.id} />
```

### Display Sections

#### 1. Reactions Received
Grid of 4 cards showing:
- ❤️ **Likes** (Red)
- 💡 **Helpful** (Yellow)
- ✨ **Inspiring** (Purple)
- 🧠 **Thoughtful** (Blue)

#### 2. Community
Grid of 2 cards showing:
- 👥 **Followers** (Green)
- ➕ **Following** (Green)

#### 3. Content
Grid of 2 cards showing:
- 📄 **Posts** (Gray)
- 💬 **Comments** (Gray)

---

## 🎯 How It Works

### Data Flow

1. **Component mounts** with userId prop
2. **Calls database function** `get_user_complete_stats(userId)`
3. **Receives all statistics** in one query
4. **Displays statistics** in organized sections

### Statistics Calculation

**Reactions:**
- Counts all `post_reactions` where post belongs to user
- Counts all `comment_reactions` where comment belongs to user
- **Combines both** for total reaction counts
- Excludes deleted posts and comments

**Followers/Following:**
- Followers: Count of `follows` where `following_id = userId`
- Following: Count of `follows` where `follower_id = userId`

**Content:**
- Posts: Count of non-deleted posts by user
- Comments: Count of non-deleted comments by user

---

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
# Using Supabase CLI
npx supabase db push

# Or manually in Supabase Dashboard
# Run: supabase/migrations/20251114000005_add_user_stats_functions.sql
```

### 2. Verify Functions

```sql
-- Test getting stats for a user
SELECT * FROM get_user_complete_stats('user-uuid-here');

-- Should return all statistics
```

### 3. Deploy Code

```bash
npm run build
npx vercel --prod
```

### 4. Test Display

1. **View own profile**: `/profile/[username]`
   - Stats should appear in left sidebar
   - Shows your statistics

2. **View other user's profile**: `/user/[username]`
   - Stats should appear in right sidebar
   - Shows their public statistics

---

## 📊 Statistics Display Examples

### High Engagement User
```
Reactions Received:
❤️ Likes: 1,234
💡 Helpful: 567
✨ Inspiring: 890
🧠 Thoughtful: 456

Community:
👥 Followers: 523
➕ Following: 142

Content:
📄 Posts: 89
💬 Comments: 456
```

### New User
```
Reactions Received:
❤️ Likes: 5
💡 Helpful: 2
✨ Inspiring: 1
🧠 Thoughtful: 0

Community:
👥 Followers: 3
➕ Following: 12

Content:
📄 Posts: 4
💬 Comments: 8
```

---

## 🎨 Styling

### Card Layout
- **White background** with shadow and border
- **3 sections** separated by borders
- **2-column grid** for statistics
- **Colored backgrounds** for each stat type
- **Large numbers** with small labels

### Color Scheme
- **Like**: Red (#dc2626)
- **Helpful**: Yellow (#ca8a04)
- **Inspiring**: Purple (#9333ea)
- **Thoughtful**: Blue (#2563eb)
- **Community**: Green (#16a34a)
- **Content**: Gray (#4b5563)

### Responsive Design
- **Mobile**: Stacks stats vertically
- **Desktop**: 2-column grid layout
- **Icons**: Scale appropriately
- **Numbers**: Bold and prominent

---

## 🔍 Performance Considerations

### Optimized Queries

All functions use:
- **Single query per statistic type**
- **Aggregation at database level** (COUNT)
- **Efficient joins** on indexed columns
- **Filtering deleted content**

### Caching Potential

Consider adding caching:

```tsx
import { useQuery } from '@tanstack/react-query'

const { data: stats } = useQuery(
  ['userStats', userId],
  () => fetchUserStats(userId),
  {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000  // Keep in cache for 10 minutes
  }
)
```

### Database Performance

Existing indexes support these queries:
- `idx_post_reactions_post_id`
- `idx_comment_reactions_comment_id`
- `idx_posts_user_id`
- `idx_comments_user_id`
- Follows table has proper indexes

---

## 🔐 Privacy & Security

### What's Visible

**Public profiles** (`/user/[username]`):
- ✅ All statistics visible to everyone
- ✅ Reaction counts are public
- ✅ Follower/following counts are public

**Own profile** (`/profile/[username]`):
- ✅ All statistics visible to owner
- ✅ Same data as public profile

### Security

- **RLS policies** protect user data
- **Functions use SECURITY DEFINER** for consistent access
- **Deleted content excluded** from counts
- **No sensitive data** exposed

---

## 📈 Analytics Potential

### Track User Engagement

```sql
-- Most engaged users (by reactions received)
SELECT
  u.username,
  s.*
FROM users u
CROSS JOIN LATERAL get_user_complete_stats(u.id) s
ORDER BY s.total_reactions DESC
LIMIT 20;

-- Most helpful content creators
SELECT
  u.username,
  s.total_helpful,
  s.posts_count
FROM users u
CROSS JOIN LATERAL get_user_complete_stats(u.id) s
WHERE s.posts_count > 0
ORDER BY s.total_helpful DESC
LIMIT 20;

-- Most inspiring users
SELECT
  u.username,
  s.total_inspiring,
  s.followers_count
FROM users u
CROSS JOIN LATERAL get_user_complete_stats(u.id) s
ORDER BY s.total_inspiring DESC
LIMIT 20;
```

### Engagement Metrics

```sql
-- Average reactions per post
SELECT
  u.username,
  CASE
    WHEN s.posts_count > 0
    THEN ROUND(s.total_reactions::NUMERIC / s.posts_count, 2)
    ELSE 0
  END as avg_reactions_per_post
FROM users u
CROSS JOIN LATERAL get_user_complete_stats(u.id) s
WHERE s.posts_count > 0
ORDER BY avg_reactions_per_post DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### Stats Not Loading

**Check:**
- Database migration applied
- Functions exist in database
- User ID is valid

**Debug:**
```sql
-- Test function directly
SELECT * FROM get_user_complete_stats('user-uuid');

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'get_user%';
```

### Counts Seem Wrong

**Verify:**
```sql
-- Manual count of reactions
SELECT COUNT(*)
FROM post_reactions pr
JOIN posts p ON pr.post_id = p.id
WHERE p.user_id = 'user-uuid' AND p.deleted_at IS NULL;

-- Check for deleted content
SELECT COUNT(*) FROM posts WHERE user_id = 'user-uuid' AND deleted_at IS NOT NULL;
```

### Component Not Displaying

**Check:**
- Import path correct
- userId prop passed
- Component has space in layout
- Console for errors

---

## 🧪 Testing Checklist

- [ ] Stats load on profile page
- [ ] Stats load on user page
- [ ] All reaction counts display correctly
- [ ] Follower count matches actual followers
- [ ] Following count matches actual following
- [ ] Posts count accurate
- [ ] Comments count accurate
- [ ] Numbers format with commas (1,234)
- [ ] Loading state shows while fetching
- [ ] Error handling works
- [ ] Responsive on mobile
- [ ] Icons display correctly
- [ ] Colors match design system

---

## 🎉 Summary

You now have a comprehensive user statistics system with:

✅ **Complete Reaction Tracking** - All 4 reaction types counted
✅ **Post & Comment Reactions** - Combined statistics
✅ **Follower/Following Counts** - Separate display
✅ **Content Statistics** - Posts and comments counts
✅ **Beautiful UI** - Card-based, color-coded display
✅ **Optimized Queries** - Single function call for all stats
✅ **Public & Private Views** - Works on both profile types
✅ **Real-time Data** - Always shows current counts
✅ **Performance** - Efficient database aggregation
✅ **Analytics Ready** - Functions available for insights

Users can now see comprehensive engagement metrics on all profiles!
