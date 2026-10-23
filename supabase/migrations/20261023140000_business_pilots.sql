-- Pilot places for the business tools (2026-10-23). Additive only.
-- Before the public launch, a pilot place's owner can use every owner tool
-- and the place's menu, deals, events and buttons are shown publicly, as if
-- the tools were live for that place only. Managed by admins in /admin/business.
create table if not exists public.business_pilots (
  place_id  uuid primary key references public.places(id) on delete cascade,
  added_by  uuid references public.users(id) on delete set null,
  note      text,
  created_at timestamptz not null default now()
);
alter table public.business_pilots enable row level security;
-- Which places are pilots is not secret; clients use it to decide what to show.
drop policy if exists business_pilots_public_read on public.business_pilots;
create policy business_pilots_public_read on public.business_pilots for select to anon, authenticated using (true);
grant select on table public.business_pilots to anon, authenticated;
grant all on table public.business_pilots to service_role;
