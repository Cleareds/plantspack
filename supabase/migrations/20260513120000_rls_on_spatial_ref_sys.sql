-- Enable RLS on public.spatial_ref_sys to silence the Supabase advisor.
--
-- This is a PostGIS system table - the same ~8,500 rows of coordinate
-- system definitions (EPSG codes, WKT for projections like WGS84) that
-- ship with every PostGIS install. There is nothing private in it, but
-- Supabase's advisor (correctly) flags any table in the public schema
-- without RLS as a hard error since PostgREST exposes those tables to
-- the anonymous role.
--
-- Fix: enable RLS, allow read for everyone, deny writes. Matches the
-- de-facto behavior: PostGIS treats this table as read-only reference
-- data and our app never writes to it (we only read via ST_Transform
-- and similar functions, which run as definer and bypass RLS anyway).
--
-- A simpler "move it out of public" alternative would risk breaking
-- the extension's own internal lookups, so we keep the table where
-- PostGIS expects it.

alter table public.spatial_ref_sys enable row level security;

drop policy if exists "spatial_ref_sys is public reference data" on public.spatial_ref_sys;
create policy "spatial_ref_sys is public reference data"
  on public.spatial_ref_sys
  for select
  to anon, authenticated, service_role
  using (true);
-- No INSERT / UPDATE / DELETE policies = those operations are denied
-- for anon/authenticated (service_role still has its bypass).
