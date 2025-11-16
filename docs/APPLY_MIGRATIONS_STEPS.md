# 🔧 Step-by-Step Migration Application

## The Problem
The migration was trying to reference columns and tables in the wrong order, causing "column does not exist" errors.

## 🚀 EASIEST SOLUTION: Use the All-in-One SQL File

**Copy and paste `COMPLETE_ADMIN_SETUP.sql` directly into Supabase SQL Editor.**

This single file includes:
- ✅ All tables creation
- ✅ All helper functions
- ✅ All RLS policies
- ✅ Admin user creation
- ✅ Everything in correct order

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `COMPLETE_ADMIN_SETUP.sql`
3. Paste and click Run
4. Done! Admin system ready to use

**Login credentials:**
- Email: hello@cleareds.com
- Password: Admin2024!SecurePlantsPack

---

## Alternative: Step-by-Step Approach

If you prefer to apply migrations in separate steps:

1. **First migration**: Create all tables and basic policies
2. **Second migration**: Enhance policies with block filtering

---

## 🚀 STEP-BY-STEP INSTRUCTIONS

### Step 1: Apply First Migration

**Option A: Using Supabase CLI**
```bash
npx supabase db push
```

**Option B: Manual (Supabase Dashboard)**
1. Go to https://app.supabase.com
2. Navigate to **SQL Editor**
3. Open file: `supabase/migrations/20251113100000_admin_moderation_safety_system.sql`
4. Copy ALL contents
5. Paste into SQL Editor
6. Click **Run**

**Expected result:** ✅ Success message, no errors

---

### Step 2: Verify First Migration Worked

Run this in SQL Editor:

```sql
-- Check if tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'admin_logs',
    'contact_submissions',
    'reports',
    'user_blocks',
    'user_mutes',
    'rate_limits'
  )
ORDER BY table_name;
```

**Expected result:** Should return 6 rows

---

### Step 3: Apply Second Migration

**Option A: Using Supabase CLI**
```bash
npx supabase db push
```

**Option B: Manual (Supabase Dashboard)**
1. Still in **SQL Editor**
2. Open file: `supabase/migrations/20251113100002_add_block_filtering_to_posts.sql`
3. Copy ALL contents
4. Paste into SQL Editor
5. Click **Run**

**Expected result:** ✅ Policy created successfully

---

### Step 4: Create Admin User

```bash
node scripts/create-admin-user.js
```

**Expected output:**
```
🚀 Creating admin user...
✅ Auth user created: <uuid>
✅ Profile created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 ADMIN USER CREATED SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:    hello@cleareds.com
🔑 Password: Admin2024!SecurePlantsPack
```

---

### Step 5: Test Admin Dashboard

```bash
# Start dev server
npm run dev

# Open browser
# Go to: http://localhost:3000

# Login with:
# Email: hello@cleareds.com
# Password: Admin2024!SecurePlantsPack

# Navigate to: http://localhost:3000/admin
```

**Expected result:** ✅ Admin dashboard loads with stats

---

## 🧪 VERIFICATION QUERIES

Run these in Supabase SQL Editor to verify everything works:

```sql
-- 1. Check all tables exist
SELECT
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'posts', 'comments', 'follows', 'places',
    'admin_logs', 'contact_submissions', 'reports',
    'user_blocks', 'user_mutes', 'rate_limits'
  );
-- Should return: 11

-- 2. Check users table has admin columns
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('role', 'is_banned', 'ban_reason')
ORDER BY column_name;
-- Should return: 3 rows

-- 3. Test helper functions
SELECT
  is_admin('00000000-0000-0000-0000-000000000000') as is_admin_test,
  is_user_blocked('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001') as block_test;
-- Should return: false, false

-- 4. Check RLS is enabled on new tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('reports', 'user_blocks', 'user_mutes')
ORDER BY tablename;
-- Should show: true for all

-- 5. Check policies exist
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'reports', 'user_blocks', 'contact_submissions')
ORDER BY tablename, policyname;
-- Should return multiple policies
```

---

## ❌ IF YOU GET ERRORS

### Error: "table already exists"

**This means you already ran part of the migration.**

**Solution:**
```sql
-- Check what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%block%' OR table_name LIKE '%report%'
ORDER BY table_name;

-- If they exist, skip Step 1 and go to Step 2
```

### Error: "policy already exists"

**Solution:**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "posts_select_basic" ON public.posts;
DROP POLICY IF EXISTS "posts_select_with_blocks" ON public.posts;

-- Then run the migration again
```

### Error: "function already exists"

**This is fine!** Functions use `CREATE OR REPLACE`, so duplicates are handled automatically.

### Error: "relation does not exist"

**This means a table is missing.**

**Solution:**
1. Start over from Step 1
2. Make sure first migration completes successfully before Step 3

---

## 🎯 WHAT EACH MIGRATION DOES

### Migration 1: `20251113100000_admin_moderation_safety_system.sql`

**Creates:**
- ✅ 6 new tables (admin_logs, contact_submissions, reports, user_blocks, user_mutes, rate_limits)
- ✅ Adds columns to users table (role, is_banned, ban_reason, etc.)
- ✅ Creates 5 helper functions
- ✅ Sets up RLS policies on all new tables
- ✅ Creates basic SELECT policy for posts (without block filtering)

### Migration 2: `20251113100002_add_block_filtering_to_posts.sql`

**Updates:**
- ✅ Replaces basic posts policy with enhanced version
- ✅ Adds block filtering (users can't see posts from blocked users)
- ✅ Conditionally checks for deleted_at column

---

## 📊 SUCCESS CHECKLIST

After completing all steps, you should have:

- [x] 6 new database tables
- [x] Users table enhanced with admin/ban columns
- [x] 5 working helper functions
- [x] RLS policies on all tables
- [x] Admin user created (hello@cleareds.com)
- [x] Admin dashboard accessible at /admin
- [x] Dashboard shows real statistics

---

## 🆘 STILL STUCK?

If migrations still fail, try this **nuclear option**:

### Option: Apply Directly in SQL Editor (No Migration Files)

1. Go to Supabase Dashboard → SQL Editor
2. Copy the ENTIRE contents of `20251113100000_admin_moderation_safety_system.sql`
3. Paste and Run
4. Wait for success
5. Copy the ENTIRE contents of `20251113100002_add_block_filtering_to_posts.sql`
6. Paste and Run
7. Continue with Step 4 (Create admin user)

This bypasses the CLI entirely and ensures the SQL runs exactly as written.

---

## 📞 SUPPORT

If you're still getting the same error after following these steps:

1. **Copy the EXACT error message** (all of it)
2. **Note which step** you're on (1, 2, 3, 4, or 5)
3. **Share the output** of this query:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

This will help diagnose what's already in your database.

---

**Last Updated:** November 13, 2025
**Status:** Ready to Apply ✅
