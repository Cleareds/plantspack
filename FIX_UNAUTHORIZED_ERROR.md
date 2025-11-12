# 🔧 Fix "Unauthorized" Error - Quick Guide

## Problem
When trying to edit or delete posts, you get:
```json
{"error": "Unauthorized"}
```

When trying to share posts, you get:
```json
{
  "code": "PGRST204",
  "message": "Could not find the 'post_type' column of 'posts' in the schema cache"
}
```

## Root Cause
Your Supabase database is missing:
1. ❌ Required columns for sharing/quoting
2. ❌ RLS (Row Level Security) policies for UPDATE operations

## ✅ Solution (3 minutes)

### Option 1: One-Click Fix (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **SQL Editor** (left sidebar)

2. **Run the Complete Fix**
   - Open the file: `scripts/APPLY_THIS_IN_SUPABASE.sql`
   - Copy the **ENTIRE** contents
   - Paste into SQL Editor
   - Click **RUN** (bottom right)

3. **Verify Success**
   - You should see green success messages
   - Check the "Messages" tab for confirmation

4. **Test**
   - Try editing a post ✅
   - Try deleting a post ✅
   - Try sharing a post ✅

### Option 2: Diagnose First (If you want to check what's missing)

1. **Check Current State**
   - Open `scripts/check-database.sql`
   - Copy contents into Supabase SQL Editor
   - Click **RUN**
   - Review what columns/policies are missing

2. **Then Apply Fix**
   - Follow Option 1 above

### Option 3: Use Supabase CLI

```bash
# Make sure you're logged in
npx supabase login

# Link your project (if not already)
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push
```

## What Gets Fixed

### Columns Added:
- ✅ `post_type` - For share/quote functionality
- ✅ `parent_post_id` - Reference to original post
- ✅ `quote_content` - User's quote text
- ✅ `deleted_at` - Soft delete support
- ✅ `edited_at` - Edit tracking
- ✅ `edit_count` - Edit counter
- ✅ `images` - Array for multiple images

### RLS Policies Added:
- ✅ `Users can view posts` (SELECT)
- ✅ `Users can insert posts` (INSERT)
- ✅ `Users can update their own posts` (UPDATE) ← **This fixes the Unauthorized error**
- ✅ Similar policies for comments, likes, etc.

## Verification

After running the migration, verify in Supabase Dashboard:

### 1. Check Columns
- Go to **Table Editor** → **posts**
- Scroll right
- You should see: `post_type`, `parent_post_id`, `quote_content`, `deleted_at`, `edited_at`, `images`

### 2. Check Policies
- Go to **Authentication** → **Policies**
- Select **posts** table
- You should see:
  - ✅ "Users can view posts" (SELECT)
  - ✅ "Users can insert posts" (INSERT)
  - ✅ "Users can update their own posts" (UPDATE)

### 3. Test Features
- **Edit Post**: Click 3-dot menu → Edit → Should work ✅
- **Delete Post**: Click 3-dot menu → Delete → Should work ✅
- **Share Post**: Click share button → Should work ✅

## Troubleshooting

### Still getting "Unauthorized"?

1. **Check if policies exist:**
   ```sql
   SELECT policyname, cmd FROM pg_policies
   WHERE tablename = 'posts';
   ```
   Should show policies for SELECT, INSERT, and UPDATE

2. **Check if user is authenticated:**
   - Open browser DevTools → Network tab
   - Check the PUT request headers
   - Should have `Authorization: Bearer ...` header

3. **Try clearing browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear cookies for plantspack.com

### Still getting "post_type" error?

1. **Verify column exists:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'posts' AND column_name = 'post_type';
   ```
   Should return 1 row

2. **If missing, add manually:**
   ```sql
   ALTER TABLE posts
   ADD COLUMN post_type TEXT
   CHECK (post_type IN ('original', 'share', 'quote'))
   DEFAULT 'original';
   ```

## Need More Help?

- Check Supabase logs: **Logs** → **Database** in dashboard
- Check browser console for errors: F12 → Console tab
- Verify auth is working: Check Network tab for 401/403 errors

## Files Reference

- `scripts/APPLY_THIS_IN_SUPABASE.sql` - Complete fix (run this!)
- `scripts/check-database.sql` - Diagnostic queries
- `MIGRATIONS_GUIDE.md` - Detailed migration guide
