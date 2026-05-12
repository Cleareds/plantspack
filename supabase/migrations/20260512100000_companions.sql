-- Companions feature (admin POC, designed to scale to all users later).
--
-- Each authenticated user can adopt exactly ONE companion. Species is
-- locked to the three we support today (chicken, pig, cow). Name is
-- user-chosen, 1-32 chars after trim.
--
-- Growth is derived from created_at — no need to denormalise. The UI
-- maps elapsed-days -> stage (baby / juvenile / adult). Stage tuning
-- lives in app code, not the DB, so we can iterate without migration.
--
-- Forward-compat slot: metadata jsonb holds future per-user state we
-- haven't designed yet (accessories, milestone unlocks, last-fed
-- timestamps, mood). Adding a typed column later is cheaper than
-- ripping out a wrong schema; we deliberately keep the strict columns
-- small until each new feature is real.
--
-- RLS: every user can only read + write their OWN companion row.
-- Service role can read everything (admin tooling). No public read
-- access — companions are private to the user.

create table if not exists public.companions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  species text not null check (species in ('chicken','pig','cow')),
  name text not null check (length(trim(name)) between 1 and 32),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One companion per user. Switching species/name updates the same
  -- row; deletion gives a fresh adoption with a new created_at, which
  -- resets growth — by design.
  unique (user_id)
);

create index if not exists companions_user_id_idx on public.companions (user_id);

-- updated_at trigger so we don't have to set it in every UPDATE.
create or replace function public.companions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists companions_touch_updated_at on public.companions;
create trigger companions_touch_updated_at
  before update on public.companions
  for each row
  execute function public.companions_touch_updated_at();

-- RLS
alter table public.companions enable row level security;

drop policy if exists "user reads own companion" on public.companions;
create policy "user reads own companion"
  on public.companions
  for select
  using (auth.uid() = user_id);

drop policy if exists "user inserts own companion" on public.companions;
create policy "user inserts own companion"
  on public.companions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user updates own companion" on public.companions;
create policy "user updates own companion"
  on public.companions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user deletes own companion" on public.companions;
create policy "user deletes own companion"
  on public.companions
  for delete
  using (auth.uid() = user_id);
