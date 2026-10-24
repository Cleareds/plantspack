-- Trust columns on places are PlantsPack's public claim, not the editor's.
--
-- The "Users can update their places" policy (20260323300000) lets a creator
-- or a verified owner UPDATE any column of their row through supabase-js.
-- The web API (PATCH /api/places/[id]) and the mobile app already route a
-- non-admin vegan_level change into place_corrections for admin review, but a
-- direct PostgREST call under the owner's JWT bypassed both. This trigger
-- closes that path at the database.
--
-- Rule: a request running as the `authenticated` role that is not an admin
-- (public.is_admin(), 20261020100000) may not change vegan_level,
-- verification_level, verification_method, verification_status or
-- is_verified. service_role (server scripts, admin client) and the postgres
-- role are unaffected. INSERTs are unaffected: a new community place sets its
-- own initial vegan_level and goes through the submission review.

create or replace function public.places_trust_columns_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and not public.is_admin() then
    if new.vegan_level         is distinct from old.vegan_level
    or new.verification_level  is distinct from old.verification_level
    or new.verification_method is distinct from old.verification_method
    or new.verification_status is distinct from old.verification_status
    or new.is_verified         is distinct from old.is_verified then
      raise exception
        'vegan_level and verification fields can only be changed by an admin. '
        'Suggest the change instead: it is reviewed in /admin/data-quality.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.places_trust_columns_admin_only() from public;

drop trigger if exists places_trust_columns_admin_only on public.places;
create trigger places_trust_columns_admin_only
  before update on public.places
  for each row
  execute function public.places_trust_columns_admin_only();

comment on function public.places_trust_columns_admin_only() is
  'Non-admin authenticated users (creators, verified owners) cannot change vegan_level or verification_* on places; they suggest via place_corrections.';
