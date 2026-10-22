-- Owner-published menus (business tools, 2026-10-22).
--
-- A verified owner uploads a photo or PDF, the menu scanner extracts dishes,
-- the owner checks them and publishes. Additive only: two new tables, one
-- nullable column on tool_scans and a superset of its tool CHECK.
--
-- Writes happen only through /api/business/places/[id]/menu* with the
-- service role after getAuthority() (owner or admin). Clients can only read
-- published menus, so the place page and the mobile app use the anon key.

create table if not exists public.place_menus (
  place_id    uuid primary key references public.places(id) on delete cascade,
  status      text not null default 'draft' check (status in ('draft', 'published')),
  checked_at  timestamptz,
  source      text not null default 'owner',
  updated_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.place_menus is
  'One menu per place, published by its verified owner (or an admin). checked_at = when the owner last confirmed it. Vegan marks are the venue''s own, not a PlantsPack verification.';

create table if not exists public.place_menu_items (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.place_menus(place_id) on delete cascade,
  section     text check (section is null or char_length(section) <= 80),
  name        text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 400),
  price       numeric(10, 2) check (price is null or price >= 0),
  currency    text check (currency is null or char_length(currency) <= 8),
  is_vegan    boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists place_menu_items_place_idx on public.place_menu_items (place_id, position);

alter table public.place_menus enable row level security;
alter table public.place_menu_items enable row level security;

drop policy if exists place_menus_public_read on public.place_menus;
create policy place_menus_public_read on public.place_menus
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists place_menu_items_public_read on public.place_menu_items;
create policy place_menu_items_public_read on public.place_menu_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.place_menus m
    where m.place_id = place_menu_items.place_id and m.status = 'published'
  ));

-- Read-only for clients; RLS above limits it to published menus.
grant select on table public.place_menus to anon, authenticated;
grant select on table public.place_menu_items to anon, authenticated;
grant all on table public.place_menus to service_role;
grant all on table public.place_menu_items to service_role;

-- Menu imports are logged like other AI scans so the global daily spend
-- kill switch covers them. place_id lets the import quota count per place.
alter table public.tool_scans add column if not exists place_id uuid references public.places(id) on delete set null;
create index if not exists tool_scans_place_idx on public.tool_scans (place_id, created_at) where place_id is not null;

alter table public.tool_scans drop constraint if exists tool_scans_tool_check;
alter table public.tool_scans
  add constraint tool_scans_tool_check
  check (tool in ('ingredient', 'menu', 'barcode', 'owner_menu'));
