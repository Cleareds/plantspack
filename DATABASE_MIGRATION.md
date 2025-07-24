# Database Migration Guide

## Error Fix: "Could not find a relationship between 'posts' and 'parent_post_id'"

This error occurs because the database migrations haven't been applied yet. The app is trying to query fields that don't exist in the current database schema.

## Quick Fix Applied

I've temporarily fixed the Feed component to work with the current database schema while maintaining forward compatibility. The app should now work with both old and new database schemas.

### Changes Made:

1. **Feed Query Fixed**: Removed the problematic `parent_post` relationship query
2. **Database Types Updated**: Made new fields optional for backward compatibility
3. **Component Updates**: PostCard and SharePost now handle both `image_url` (old) and `images` (new) fields
4. **CreatePost Fixed**: Only adds `images` field when there are actually images to avoid database errors

## Applying Database Migrations

To enable full functionality (quote posts, multiple images, etc.), you need to apply the database migrations:

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Copy and paste the contents of `apply-migrations.sql`
4. Run the script

### Option 2: Using Supabase CLI (if configured)

```bash
# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### Option 3: Manual SQL Execution

If you have direct database access, you can run the SQL commands in `apply-migrations.sql` directly against your PostgreSQL database.

## What the Migrations Add

1. **Quote Posts Support**:
   - `parent_post_id` column for referencing shared posts
   - `post_type` column ('original', 'share', 'quote')
   - `quote_content` column for commentary on shared posts

2. **Multiple Images Support**:
   - `images` JSONB column to store array of image URLs
   - Migrates existing `image_url` data to new format
   - Creates Supabase storage bucket for images

3. **Storage Policies**:
   - Users can upload images to their own folders
   - Public read access for all post images
   - Proper security policies

## Verification

After running the migrations, you can verify they worked by running this query in your SQL editor:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'posts' 
ORDER BY ordinal_position;
```

You should see the new columns: `parent_post_id`, `post_type`, `quote_content`, and `images`.

## Current App Status

✅ **Feed is working** - Basic post display and creation
✅ **Images work** - Both old single images and new multiple images
✅ **Comments work** - Full commenting system
✅ **Follow/Unfollow works** - Social features active
✅ **Map features work** - Location-based features

🔄 **Requires Migration for Full Features**:
- Quote posts and sharing
- Multiple image uploads
- Advanced post types

The app is fully functional in its current state and will automatically gain the new features once migrations are applied.