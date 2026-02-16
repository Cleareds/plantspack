# Mobile App Debug Notes

## ✅ Fixed Issues

### 1. Places Fetch Error - FIXED
**Problem:** Query was filtering by non-existent `approved` column
**Solution:** Removed `.eq('approved', true)` from usePlaces.ts
**Status:** ✅ Places should now load correctly

### 2. Packs Fetch Error - FIXED
**Problem:** Pack interface didn't match database schema
**Issues fixed:**
- ✅ Updated Pack interface to use `title` (not `name`)
- ✅ Updated to use `creator_id` (not `created_by`)
- ✅ Updated to use `is_published` (not `is_private`)
- ✅ Fixed foreign key reference to `packs_creator_id_fkey`
- ✅ Updated PackCard and PackHeader components to use correct field names
- ✅ Fixed query in usePacks.ts to use `.eq('is_published', true)`
**Status:** ✅ Packs should now load correctly

### 3. Schema Updates - FIXED
**Status:** All type definitions now match actual database schema
- ✅ Icons updated to plantspack9.png
- ✅ PlaceCategory includes 'cafe' and 'store'
- ✅ PackCategory type added
- ✅ Type exports added (Place, Post, Profile, Comment)
- ✅ Pack interface matches database columns

## 🔍 Remaining to Debug

### Posts Not Showing Content
**Symptom:** Only user info visible, not post content

**Debug logging added:**
PostCard.tsx now logs on every render:
```typescript
console.log('PostCard render:', {
  id: post.id,
  hasContent: !!post.content,
  contentLength: post.content?.length,
  content: post.content?.substring(0, 50),
  user: post.user?.username
});
```

**Next steps:**
1. Open the app and navigate to the feed
2. Check Expo Dev Tools Console for the debug logs
3. Look for the logged post data to see:
   - Is `content` empty or undefined?
   - What's the actual content value?
   - Is it a styling issue or data issue?

**Possible causes:**
- Posts in database have empty/null content
- Content is there but not rendering due to styling
- Content is being fetched but not passed to PostCard

**To check database directly:**
```sql
SELECT id, user_id, content, created_at
FROM posts
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

## Database Schema Reference

### places table
Columns: id, name, description, category, latitude, longitude, address, website, phone, is_pet_friendly, created_by, created_at, updated_at
❌ NO `approved` column

### packs table
Columns: id, creator_id, title, description, banner_url, website_url, facebook_url, twitter_url, instagram_url, tiktok_url, category, is_published, view_count, created_at, updated_at
✅ Exists in database

### posts table
Columns: id, user_id, content, privacy, images, image_url, image_urls, video_urls, parent_post_id, post_type, quote_content, engagement_score, deleted_at, created_at, updated_at
✅ Content is NOT NULL in schema
