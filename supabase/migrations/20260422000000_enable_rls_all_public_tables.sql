-- Defensive: enable RLS on every public-schema table that doesn't already
-- have it. Supabase security advisor flagged at least one table as
-- "publicly accessible" (rls_disabled_in_public). Every table in the
-- public schema must have RLS enabled because the anon key can hit
-- PostgREST directly.
--
-- Safe to run repeatedly — the DO block checks pg_tables.rowsecurity
-- and only toggles tables where it's false.
--
-- IMPORTANT: enabling RLS without any policies means the anon/authenticated
-- roles see an EMPTY table. For tables legitimately exposed publicly
-- (e.g. directory views, seed data), add a SELECT policy in a follow-up
-- migration. For tables that should be service-role-only (staging,
-- aliases, internal counters), the default lock-out is the correct state.
-- The service_role key bypasses RLS so server-side code (API routes,
-- scripts) continues working unaffected.

DO $$
DECLARE
  tbl record;
  enabled_count int := 0;
BEGIN
  FOR tbl IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = false
      -- Exclude PostGIS internal tables (owned by postgres superuser,
      -- read-only SRID lookups, not user data — not a real RLS concern).
      AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
    ORDER BY tablename
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'RLS enabled on public.%', tbl.tablename;
    enabled_count := enabled_count + 1;
  END LOOP;

  IF enabled_count = 0 THEN
    RAISE NOTICE 'All public tables already have RLS enabled. No changes.';
  ELSE
    RAISE NOTICE 'Enabled RLS on % table(s).', enabled_count;
  END IF;
END $$;

-- Add a read-only policy for tables that are legitimately public-read.
-- place_slug_aliases is a legacy-URL redirect lookup — public read is
-- harmless and required for the alias resolver on /place/[old-slug].
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'place_slug_aliases') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'place_slug_aliases' AND policyname = 'slug_aliases_read'
    ) THEN
      EXECUTE 'CREATE POLICY "slug_aliases_read" ON public.place_slug_aliases FOR SELECT USING (true)';
      RAISE NOTICE 'Added slug_aliases_read policy';
    END IF;
  END IF;
END $$;
