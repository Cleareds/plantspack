-- Cross-database audit fixes (applied via supabase db query on 2026-05-14
-- with explicit user authorisation "Yes update both").
--
-- 1. Luxembourg cross-border misplacement
--    9 places imported from OSM (source='osm-import-2026-04') at
--    lat ~49.6, lng ~6.1 were filed as country='Germany' instead of
--    country='Luxembourg'. The coordinates clearly resolve to
--    Luxembourg city. OSM cross-border boundary confusion.
--
-- 2. "City of X" / "Town of X" admin-name prefixes
--    14 rows held the OSM administrative-boundary form of their city
--    name ("City of London", "Town of Cambridge", "Town of Hempstead",
--    etc.). Each was a single-place outlier that didn't match any
--    canonical city URL. Stripped the prefix so they fold into the
--    real city's directory (e.g. "City of London" -> "London"
--    which has 1,272 places).
--
-- Idempotent: ran-once with returning clauses; this migration file is
-- recorded for history but the changes already exist in production.
-- The conditional WHERE clauses make re-run safe (no rows match).

update public.places
set country = 'Luxembourg'
where city = 'Luxembourg'
  and country = 'Germany'
  and archived_at is null;

update public.places
set city = regexp_replace(city, '^(City of|Town of) ', '')
where (city like 'City of %' or city like 'Town of %')
  and archived_at is null;
