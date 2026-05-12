-- Companions: lifecycle + multi-companion support.
--
-- Changes from the initial migration:
--   1. Drop UNIQUE(user_id). A user can now hold multiple companions
--      concurrently. Per-tier concurrency limits are enforced in app
--      code (admin=3, free=1, paid tiers TBD).
--   2. Add lifespan_days int default 50. A companion is "alive" while
--      now() < created_at + lifespan_days * interval '1 day'. After
--      that they have passed, no longer count against the concurrency
--      cap, but the row is preserved for history.
--
-- We intentionally keep the lifespan as a per-row column (not a
-- per-user-tier constant) so future features can extend lifespan via
-- in-app actions ("feed kale, +5 days") without schema changes.

alter table public.companions
  drop constraint if exists companions_user_id_key;

alter table public.companions
  add column if not exists lifespan_days int not null default 50
  check (lifespan_days between 1 and 3650);

-- Index for fast "list this user's companions, newest first" queries.
create index if not exists companions_user_created_idx
  on public.companions (user_id, created_at desc);
