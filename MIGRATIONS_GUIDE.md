# Database Migrations Guide

This guide explains how to apply the required database migrations to fix:
1. ❌ `post_type` column missing error when sharing posts
2. ❌ "Unauthorized" error when editing/deleting posts

## Quick Fix - Option 1: Use Supabase CLI (Recommended)

```bash
# Apply all migrations at once
npx supabase db push
```

Or use the helper script:
```bash
./scripts/apply-migrations.sh
```

## Option 2: Manual Application (Supabase Dashboard)

If the CLI doesn't work, apply migrations manually:

### Step 1: Add Missing Columns
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251112000001_ensure_all_columns_exist.sql`
4. Paste and click **Run**

This will add:
- `post_type` column (for share/quote posts)
- `parent_post_id` column (reference to original post)
- `quote_content` column (user's quote text)
- `deleted_at`, `edited_at`, `edit_count` (soft delete support)
- `images` array column (multiple images)

### Step 2: Fix RLS Policies
1. Stay in **SQL Editor**
2. Copy the contents of `supabase/migrations/20251112000000_add_post_update_delete_policies.sql`
3. Paste and click **Run**

This will add policies for:
- ✅ INSERT posts (users can create posts)
- ✅ UPDATE posts (users can edit their own posts)
- ✅ DELETE likes (users can unlike posts)
- ✅ And similar policies for comments, follows, places, etc.

## Verify Installation

After applying migrations, verify in Supabase Dashboard:

### Check Columns Exist:
1. Go to **Table Editor** → **posts** table
2. Scroll right to see new columns:
   - `post_type`
   - `parent_post_id`
   - `quote_content`
   - `deleted_at`
   - `edited_at`
   - `images`

### Check RLS Policies:
1. Go to **Authentication** → **Policies**
2. Select **posts** table
3. Verify these policies exist:
   - ✅ "Users can view posts" (SELECT)
   - ✅ "Users can insert posts" (INSERT)
   - ✅ "Users can update their own posts" (UPDATE)

## Testing

After migrations are applied, test:

1. **Share/Quote Post:**
   - Click share button on any post
   - Select "Share" or "Quote"
   - Should work without "post_type" error ✅

2. **Edit Post:**
   - Click 3-dot menu on your own post
   - Click "Edit post"
   - Should work without "Unauthorized" error ✅

3. **Delete Post:**
   - Click 3-dot menu on your own post
   - Click "Delete post"
   - Should work without "Unauthorized" error ✅

## Troubleshooting

### "Could not find the 'post_type' column"
- Run migration: `20251112000001_ensure_all_columns_exist.sql`
- Or manually add columns via SQL Editor

### "Unauthorized" when editing/deleting
- Run migration: `20251112000000_add_post_update_delete_policies.sql`
- Check RLS policies are created in Supabase dashboard

### "Policy already exists" error
- The migrations use `DROP POLICY IF EXISTS` so they're safe to re-run
- If error persists, manually drop conflicting policies first

## Migration Files Created

1. **20251112000001_ensure_all_columns_exist.sql**
   - Idempotent (safe to run multiple times)
   - Adds all missing columns for sharing/editing features

2. **20251112000000_add_post_update_delete_policies.sql**
   - Complete RLS policy setup
   - Covers all CRUD operations for all tables

## Need Help?

If migrations fail or errors persist:
1. Check Supabase logs in dashboard
2. Verify you have proper database permissions
3. Try applying migrations one at a time
4. Check for conflicting policies in Authentication → Policies
