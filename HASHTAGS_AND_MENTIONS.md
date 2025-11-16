# Hashtags and Mentions System

Complete implementation of hashtags and @mentions for PlantsPack social platform.

## 🎯 Features Implemented

### ✅ Hashtag System
- **Automatic extraction**: Hashtags (#vegan, #recipes, etc.) are automatically extracted from posts
- **Dedicated pages**: Each hashtag has its own page showing all related posts
- **Clickable hashtags**: All hashtags in posts are clickable and link to hashtag pages
- **Usage tracking**: System tracks how many times each hashtag is used
- **Trending hashtags**: Widget shows trending hashtags based on recent activity
- **Case insensitive**: #Vegan and #vegan are treated as the same hashtag

### ✅ Mention System
- **@username mentions**: Mention users with @username syntax
- **Automatic notifications**: Mentioned users receive instant notifications
- **Clickable mentions**: All mentions link to user profiles
- **User resolution**: System validates mentions against real usernames
- **Notification integration**: Uses existing notification system

---

## 📁 Files Created/Modified

### New Files:

1. **Database Migration**
   - `supabase/migrations/20251114000003_create_hashtags_and_mentions.sql`
   - Creates hashtags, post_hashtags tables
   - Adds mentioned_users column to posts
   - Creates functions for trending hashtags
   - Implements usage count tracking

2. **Utilities**
   - `src/lib/hashtags.ts`
   - Extract hashtags and mentions from text
   - Resolve usernames to user IDs
   - Get/create hashtags in database
   - Search and trending functions

3. **API Endpoint**
   - `src/app/api/hashtags/[tag]/posts/route.ts`
   - Fetches posts by hashtag
   - Includes pagination support
   - Returns hashtag metadata

4. **Hashtag Page**
   - `src/app/hashtag/[tag]/page.tsx`
   - Displays all posts with specific hashtag
   - Shows hashtag usage statistics
   - Infinite scroll / load more

5. **Trending Widget**
   - `src/components/hashtags/TrendingHashtags.tsx`
   - Shows top trending hashtags
   - Displays usage counts
   - Recent activity indicators

### Modified Files:

1. **Post Creation**
   - `src/components/posts/CreatePost.tsx`
   - Extracts hashtags and mentions on submit
   - Saves hashtags to database
   - Sends notifications to mentioned users

2. **Text Display**
   - `src/components/ui/LinkifiedText.tsx`
   - Makes hashtags clickable (green text)
   - Makes mentions clickable (blue text)
   - Preserves URL linking functionality

---

## 🗄️ Database Schema

### Tables Created

#### `hashtags`
```sql
- id: UUID (primary key)
- tag: TEXT (original case)
- normalized_tag: TEXT (lowercase, unique)
- usage_count: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `post_hashtags`
```sql
- id: UUID (primary key)
- post_id: UUID (references posts)
- hashtag_id: UUID (references hashtags)
- created_at: TIMESTAMPTZ
```

### Columns Added

#### `posts.mentioned_users`
```sql
- mentioned_users: UUID[] (array of user IDs)
```

### Functions

#### `get_posts_by_hashtag(hashtag_text, limit, offset)`
Returns posts containing a specific hashtag with pagination.

#### `get_trending_hashtags(days_back, result_limit)`
Returns trending hashtags based on recent usage.

### Triggers

- **Auto-increment usage count**: When post_hashtag is created
- **Auto-decrement usage count**: When post_hashtag is deleted

---

## 🚀 How It Works

### Hashtag Flow

1. **User creates post** with content: "Love this #vegan #recipe!"
2. **System extracts hashtags**: ["vegan", "recipe"]
3. **System creates/finds hashtags** in database
4. **System links hashtags to post** via post_hashtags table
5. **Usage counts updated** automatically via triggers
6. **Hashtags rendered** as clickable links in the UI

### Mention Flow

1. **User creates post** with content: "Great post @johndoe!"
2. **System extracts mentions**: ["johndoe"]
3. **System resolves username** to user ID
4. **System saves mention** to post.mentioned_users
5. **System sends notification** to @johndoe
6. **Mention rendered** as clickable link to user profile

---

## 💡 Usage Examples

### Creating Posts with Hashtags

```typescript
// User types:
"Just made an amazing #vegan #burger with #plantbased ingredients! 🌱"

// System automatically:
// 1. Creates/finds hashtags: vegan, burger, plantbased
// 2. Links them to the post
// 3. Renders them as clickable green links
```

### Mentioning Users

```typescript
// User types:
"Thanks @sarah for this amazing #recipe idea!"

// System automatically:
// 1. Resolves @sarah to user ID
// 2. Saves sarah's ID to mentioned_users array
// 3. Sends notification to Sarah
// 4. Renders @sarah as clickable blue link
```

### Using Trending Hashtags Widget

```tsx
import TrendingHashtags from '@/components/hashtags/TrendingHashtags'

// In your sidebar or feed
<TrendingHashtags
  limit={10}        // Show top 10 hashtags
  daysBack={7}      // Based on last 7 days
/>
```

---

## 🎨 UI Elements

### Hashtag Styling
- **Color**: Green (#10b981)
- **Hover**: Darker green with underline
- **Format**: `#hashtag`
- **Link**: `/hashtag/[tag]`

### Mention Styling
- **Color**: Blue (#3b82f6)
- **Hover**: Darker blue with underline
- **Format**: `@username`
- **Link**: `/user/[username]`

### Hashtag Page Features
- Large hashtag icon and title
- Total post count
- List of all posts with hashtag
- Load more pagination
- Empty state for new hashtags

---

## 📱 API Endpoints

### GET `/api/hashtags/[tag]/posts`

Fetch posts containing a specific hashtag.

**Parameters:**
- `tag` (path): Hashtag to search for
- `limit` (query): Number of posts to return (default: 20)
- `offset` (query): Pagination offset (default: 0)

**Response:**
```json
{
  "posts": [...],
  "hashtag": {
    "tag": "vegan",
    "usage_count": 42
  },
  "hasMore": true
}
```

---

## 🔍 Search & Discovery

### Hashtag Search

```typescript
import { searchHashtags } from '@/lib/hashtags'

// Search for hashtags starting with "veg"
const results = await searchHashtags('veg', 10)
// Returns: [{ tag: 'vegan', usageCount: 150 }, ...]
```

### Trending Hashtags

```typescript
import { getTrendingHashtags } from '@/lib/hashtags'

// Get top 10 trending hashtags from last 7 days
const trending = await getTrendingHashtags(10, 7)
```

---

## 🔐 Security & Validation

### Hashtag Validation
- **Minimum length**: 2 characters
- **Maximum length**: 50 characters
- **Allowed characters**: Letters, numbers, underscores
- **Regex**: `#[a-zA-Z0-9_]{2,50}`

### Mention Validation
- **Minimum length**: 2 characters
- **Maximum length**: 30 characters
- **Allowed characters**: Letters, numbers, underscores
- **Regex**: `@[a-zA-Z0-9_]{2,30}`
- **Verification**: Only real usernames trigger notifications

### RLS Policies
- ✅ Anyone can view hashtags (public data)
- ✅ Service role manages hashtag creation
- ✅ Public posts visible on hashtag pages
- ✅ Private posts excluded from hashtag feeds

---

## 🚀 Deployment Steps

### 1. Apply Database Migration

```bash
# Using Supabase CLI
npx supabase db push

# Or manually in Supabase Dashboard SQL Editor
# Run: supabase/migrations/20251114000003_create_hashtags_and_mentions.sql
```

### 2. Verify Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('hashtags', 'post_hashtags');

-- Check mentioned_users column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'posts'
AND column_name = 'mentioned_users';

-- Test trending function
SELECT * FROM get_trending_hashtags(7, 10);
```

### 3. Deploy Code

```bash
# Build and deploy
npm run build
npx vercel --prod
```

### 4. Test Features

1. **Test Hashtag Creation**:
   - Create post with: "I love #vegan food! #plantbased"
   - Verify hashtags are clickable
   - Click hashtag to visit hashtag page

2. **Test Mentions**:
   - Create post with: "Thanks @username!"
   - Verify mention is clickable
   - Check that user received notification

3. **Test Hashtag Page**:
   - Visit `/hashtag/vegan`
   - Verify posts are displayed
   - Check usage count is shown

---

## 🎯 Advanced Features

### Hashtag Analytics

```sql
-- Most popular hashtags all-time
SELECT tag, usage_count
FROM hashtags
ORDER BY usage_count DESC
LIMIT 20;

-- Hashtag growth over time
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as new_posts
FROM post_hashtags
WHERE hashtag_id = 'uuid-here'
GROUP BY day
ORDER BY day DESC;
```

### Mention Statistics

```sql
-- Most mentioned users
SELECT
  unnest(mentioned_users) as user_id,
  COUNT(*) as mention_count
FROM posts
WHERE mentioned_users IS NOT NULL
GROUP BY user_id
ORDER BY mention_count DESC
LIMIT 20;
```

---

## 🎨 Customization Options

### Change Hashtag Color

In `src/components/ui/LinkifiedText.tsx`:

```tsx
// Change from green to custom color
className="text-purple-600 hover:text-purple-700..."
```

### Change Trending Widget Limit

```tsx
<TrendingHashtags
  limit={20}        // Show more hashtags
  daysBack={30}     // Longer time period
/>
```

### Disable Mention Notifications

In `src/components/posts/CreatePost.tsx`:

```tsx
// Comment out or remove the notification sending code
// Lines 291-313
```

---

## 🧪 Testing Checklist

- [ ] Create post with hashtags
- [ ] Verify hashtags are clickable
- [ ] Click hashtag and view hashtag page
- [ ] Verify posts appear on hashtag page
- [ ] Create post with mentions
- [ ] Verify mention is clickable
- [ ] Check mentioned user received notification
- [ ] Test hashtag with different cases (#Vegan vs #vegan)
- [ ] Test invalid hashtags (too short, special chars)
- [ ] Test invalid mentions (non-existent users)
- [ ] Verify trending hashtags widget displays
- [ ] Test pagination on hashtag pages
- [ ] Check usage counts increment correctly

---

## 📊 Performance Considerations

### Indexes Created
- `idx_hashtags_normalized_tag` - Fast hashtag lookup
- `idx_hashtags_usage_count` - Efficient trending queries
- `idx_post_hashtags_post_id` - Fast post -> hashtags
- `idx_post_hashtags_hashtag_id` - Fast hashtag -> posts
- `idx_posts_mentioned_users` - GIN index for mention searches

### Optimization Tips
1. **Pagination**: Hashtag pages use limit/offset for large result sets
2. **Caching**: Consider caching trending hashtags (updates every hour)
3. **Batch operations**: Hashtag creation uses transactions
4. **Denormalization**: Usage counts stored for fast access

---

## 🐛 Troubleshooting

### Hashtags Not Saving

**Check:**
- Migration applied successfully
- hashtags and post_hashtags tables exist
- Service role key is set in environment

**Fix:**
```sql
-- Verify tables
SELECT * FROM hashtags LIMIT 1;
SELECT * FROM post_hashtags LIMIT 1;
```

### Mentions Not Sending Notifications

**Check:**
- Username exists in database
- Notification system is working
- User has notification preferences enabled

**Debug:**
```tsx
// Add logging in CreatePost.tsx
console.log('Resolved usernames:', mentionedUserIds)
```

### Hashtag Page 404

**Check:**
- Migration created get_posts_by_hashtag function
- RLS policies allow public read

**Verify:**
```sql
-- Test function
SELECT * FROM get_posts_by_hashtag('vegan', 20, 0);
```

---

## 🎉 Summary

You now have a complete hashtag and mention system with:

✅ **Automatic hashtag extraction** from posts
✅ **Dedicated hashtag pages** with all related posts
✅ **Clickable hashtags** in green throughout the app
✅ **@mention system** with notifications
✅ **Clickable mentions** linking to user profiles
✅ **Trending hashtags widget** showing popular tags
✅ **Usage tracking** with automatic counts
✅ **Full database schema** with RLS policies
✅ **Optimized queries** with proper indexes
✅ **Search functionality** for hashtag discovery

All features are production-ready and follow best practices for social media platforms!
