# Hashtag System Fix - Implementation Guide

## Overview

This directory contains scripts to diagnose and fix hashtag functionality in your PlantsPack application.

## What Was Fixed

### 1. ✅ API Endpoint Fixed

**File**: `src/app/api/hashtags/[tag]/posts/route.ts`

**Change**: Updated to use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY`

**Why**: The RLS policies only allow authenticated users to view posts. Using the service role key bypasses RLS, allowing hashtag pages to display public posts.

## Scripts Available

### 1. `diagnose-hashtags.ts` - Diagnostic Script

**Purpose**: Check the current state of hashtags in your database

**Usage**:
```bash
npx tsx scripts/diagnose-hashtags.ts
```

**What it checks**:
- Total number of hashtags
- Total post-hashtag links
- Posts with hashtags in content
- Posts missing hashtag links
- Recent posts and their hashtag status
- Top hashtags by usage

### 2. `backfill-hashtags.ts` - Backfill Script

**Purpose**: Extract hashtags from existing posts and create the necessary database links

**Usage**:

**Dry run** (preview changes without modifying database):
```bash
npx tsx scripts/backfill-hashtags.ts --dry-run
```

**Live run** (actually modify the database):
```bash
npx tsx scripts/backfill-hashtags.ts
```

**What it does**:
- Scans all posts with `#` in content
- Extracts hashtags using the same regex as the app
- Creates hashtag records if they don't exist
- Links hashtags to posts via `post_hashtags` table
- Updates usage counts automatically (via database trigger)

### 3. `diagnose-hashtags.sql` - SQL Diagnostic

**Purpose**: Manual SQL queries for deep database inspection

**Usage**: Copy and run queries in Supabase SQL Editor

## ⚠️ IMPORTANT: Update Your Service Role Key

Before running the scripts, you need to update your `.env.local` file with the correct service role key:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mfeelaqjbtnypoojhfjp
2. Navigate to **Settings** → **API**
3. Find the **service_role** key in "Project API keys" section
4. Click to reveal the key
5. Copy it
6. Update `.env.local`:

```bash
# Replace this line:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# With your actual service role key:
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

7. Save the file

**⚠️ Security Warning**: The service role key bypasses all RLS policies. NEVER commit this key to version control or expose it in client-side code!

## Step-by-Step Execution

### Step 1: Update Service Role Key
Follow the instructions above to update `.env.local`

### Step 2: Run Diagnostics
```bash
npx tsx scripts/diagnose-hashtags.ts
```

This will show you the current state of your database.

### Step 3: Test Dry Run
```bash
npx tsx scripts/backfill-hashtags.ts --dry-run
```

This previews what changes will be made without actually modifying the database.

### Step 4: Run Backfill (if needed)
```bash
npx tsx scripts/backfill-hashtags.ts
```

This will:
- Extract hashtags from all existing posts
- Create hashtag records
- Link hashtags to posts
- Update usage counts

### Step 5: Verify
1. Run diagnostics again to confirm changes:
   ```bash
   npx tsx scripts/diagnose-hashtags.ts
   ```

2. Visit a hashtag page in your app:
   - Go to any post with a hashtag
   - Click on the hashtag link
   - Verify posts are displayed

3. Test with different hashtags

## Expected Results

After running the backfill script, you should see:

- ✅ Hashtag pages display posts correctly
- ✅ All posts with `#hashtag` in content are linked properly
- ✅ Usage counts are accurate
- ✅ Clicking hashtags in posts navigates to the hashtag page

## Troubleshooting

### Issue: "Total Hashtags: 0" in diagnostics

**Cause**: Service role key is not set correctly or database is empty

**Solution**:
1. Verify you updated `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
2. Verify you're connecting to the right Supabase project
3. Check if you have any posts in the database

### Issue: "Error: Missing Supabase credentials"

**Cause**: Environment variables not loaded

**Solution**: Make sure `.env.local` exists in the project root and contains valid credentials

### Issue: Backfill script shows errors

**Cause**: Database constraints or RLS policies blocking operations

**Solution**:
1. Verify the service role key is correct
2. Check Supabase logs for specific error messages
3. Verify database schema matches migrations

### Issue: Hashtag pages still empty after backfill

**Cause**: Frontend not updated or cache issue

**Solution**:
1. Restart your Next.js development server
2. Clear browser cache
3. Check browser console for errors
4. Verify API endpoint is using service role key

## Database Schema Reference

### Tables Involved

**hashtags**
- `id` (UUID, primary key)
- `tag` (TEXT, unique) - Original case
- `normalized_tag` (TEXT, unique) - Lowercase for searching
- `usage_count` (INTEGER) - Auto-updated by triggers
- `created_at`, `updated_at` (TIMESTAMPTZ)

**post_hashtags** (junction table)
- `id` (UUID, primary key)
- `post_id` (UUID, references posts)
- `hashtag_id` (UUID, references hashtags)
- `created_at` (TIMESTAMPTZ)
- Unique constraint: (post_id, hashtag_id)

**Triggers**:
- `increment_hashtag_usage_trigger` - Increments usage_count on insert
- `decrement_hashtag_usage_trigger` - Decrements usage_count on delete

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Run diagnostics to see current database state
4. Review the API logs in your terminal when running the dev server

## Files Modified

1. ✅ `src/app/api/hashtags/[tag]/posts/route.ts` - Fixed to use service role key
2. ✅ `scripts/diagnose-hashtags.ts` - Created diagnostic script
3. ✅ `scripts/diagnose-hashtags.sql` - Created SQL diagnostics
4. ✅ `scripts/backfill-hashtags.ts` - Created backfill script
5. ⏳ `.env.local` - Needs manual update with correct service role key

---

**Last Updated**: 2025-12-04
