# Database Migration Instructions

## Applying the Place Reviews Migration

The migration `20260205000001_create_place_reviews_and_pack_places.sql` needs to be applied to production to enable place reviews functionality.

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **plantspack**
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the contents of `supabase/migrations/20260205000001_create_place_reviews_and_pack_places.sql`
6. Paste into the SQL editor
7. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Link your project (if not already linked)
supabase link --project-ref mfeelaqjbtnypoojhfjp

# Push migrations to production
supabase db push
```

### What the Migration Does

This migration creates:

1. **place_reviews table** - Star-rated reviews for places (1-5 stars)
2. **place_review_reactions table** - Reactions to reviews (like, helpful, etc.)
3. **pack_places table** - Links places to packs
4. **RLS policies** - Security policies for all tables
5. **Helper functions** - Rating calculations and aggregations

### Verification

After applying the migration, verify it worked:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('place_reviews', 'place_review_reactions', 'pack_places');

-- Should return 3 rows
```

### Troubleshooting

If you get errors about existing tables:
- The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
- If tables already exist, those statements will be skipped

If you get permission errors:
- Make sure you're using an account with database admin access
- Check that your service role key has proper permissions
