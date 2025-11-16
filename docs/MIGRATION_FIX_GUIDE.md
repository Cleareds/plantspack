# Migration Error Fix - "column user_id does not exist"

## ✅ ISSUE FIXED

The error was caused by function parameter names conflicting with table column names in PostgreSQL.

### What was wrong:
```sql
-- OLD (BROKEN)
CREATE FUNCTION is_admin(user_id UUID) ...
  WHERE id = user_id  -- Ambiguous! Which user_id?
```

### What's fixed:
```sql
-- NEW (FIXED)
CREATE FUNCTION is_admin(p_user_id UUID) ...
  WHERE id = p_user_id  -- Clear! It's the parameter
```

## 🚀 HOW TO APPLY THE FIX

### Option 1: Using Supabase CLI (Recommended)

```bash
# Make sure you're in the project directory
cd /Users/antonkravchuk/sidep/Cleareds/plantspack

# Push the updated migration
npx supabase db push
```

### Option 2: Manual Application in Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the entire contents of:
   `supabase/migrations/20251113100000_admin_moderation_safety_system.sql`
5. Paste into SQL Editor
6. Click **Run**

---

## ✨ WHAT WAS CHANGED

### 1. Fixed Function Parameter Names
All helper functions now use `p_` prefix to avoid column name conflicts:

- `is_admin(user_id)` → `is_admin(p_user_id)`
- `is_user_blocked(blocker_id, blocked_id)` → `is_user_blocked(p_blocker_id, p_blocked_id)`
- `is_user_muted(muter_id, muted_id)` → `is_user_muted(p_muter_id, p_muted_id)`
- `check_rate_limit(...)` → Uses `p_` prefix for all params
- `log_rate_limit(user_id, ...)` → Uses `p_user_id`

### 2. Made Posts Policy Creation Conditional

The migration now checks if `deleted_at` column exists before creating policies that reference it:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT ... WHERE column_name = 'deleted_at') THEN
    -- Create policy with deleted_at filter
  ELSE
    -- Create policy without deleted_at filter
  END IF;
END $$;
```

This ensures the migration works whether or not the soft-delete migration has been applied.

### 3. Added More Policy Drops

Now drops all possible variations of existing policies:
- `posts_select_policy`
- `Users can view posts`
- `Public posts are viewable by everyone`
- `posts_select_with_blocks`

---

## 🧪 TESTING THE MIGRATION

After applying the migration, test these queries in SQL Editor:

```sql
-- 1. Verify tables exist
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
  );
-- Should return 6 rows

-- 2. Verify functions work
SELECT is_admin('00000000-0000-0000-0000-000000000000');
-- Should return false

-- 3. Verify users table has role column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('role', 'is_banned', 'ban_reason');
-- Should return 3 rows

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'admin_logs',
    'contact_submissions',
    'reports',
    'user_blocks',
    'user_mutes',
    'rate_limits'
  );
-- Should show rowsecurity = true for all
```

---

## ⚠️ TROUBLESHOOTING

### Error: "relation already exists"

This means you're running the migration on a database that already has some of these tables.

**Solution:**
```sql
-- Drop existing tables first (DANGER: This will delete data!)
DROP TABLE IF EXISTS public.admin_logs CASCADE;
DROP TABLE IF EXISTS public.contact_submissions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.user_blocks CASCADE;
DROP TABLE IF EXISTS public.user_mutes CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Then run the migration again
```

### Error: "column already exists"

The users table already has the role column.

**Solution:**
```sql
-- Check what columns exist
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users';

-- The migration uses IF NOT EXISTS, so this shouldn't happen
-- If it does, the migration file is being run multiple times
```

### Error: "function already exists"

**Solution:** Functions use `CREATE OR REPLACE` so this shouldn't happen. If it does:
```sql
-- Drop functions manually
DROP FUNCTION IF EXISTS is_admin(UUID);
DROP FUNCTION IF EXISTS is_user_blocked(UUID, UUID);
DROP FUNCTION IF EXISTS is_user_muted(UUID, UUID);
DROP FUNCTION IF EXISTS check_rate_limit(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS log_rate_limit(UUID, TEXT);

-- Then run the migration again
```

---

## ✅ SUCCESS INDICATORS

After successful migration, you should be able to:

1. **Create admin user:**
   ```bash
   node scripts/create-admin-user.js
   ```

2. **Access admin dashboard:**
   - Login with hello@cleareds.com
   - Navigate to http://localhost:3000/admin
   - See the dashboard load without errors

3. **Query new tables:**
   ```sql
   SELECT * FROM public.reports LIMIT 1;
   SELECT * FROM public.user_blocks LIMIT 1;
   ```

4. **Use helper functions:**
   ```sql
   SELECT is_admin(auth.uid());
   ```

---

## 📝 NEXT STEPS AFTER MIGRATION

1. **Create the admin user** (if not done):
   ```bash
   node scripts/create-admin-user.js
   ```

2. **Test the admin dashboard**:
   ```bash
   npm run dev
   # Visit http://localhost:3000/admin
   ```

3. **Continue with Phase 2** implementation:
   - Build admin CRUD pages
   - Implement report functionality
   - Add safety features

---

## 🆘 STILL HAVING ISSUES?

If you're still getting errors, please share:

1. **The exact error message** from Supabase
2. **Which line** it's occurring on
3. **Your database version**:
   ```sql
   SELECT version();
   ```

Common issues:
- **Old Supabase CLI**: Update with `npm install -g supabase`
- **Not linked to project**: Run `npx supabase link`
- **Network issues**: Check connection to Supabase
- **Permission issues**: Ensure you have admin access to your Supabase project

---

**Last Updated:** November 13, 2025
**Status:** Migration Fixed ✅
