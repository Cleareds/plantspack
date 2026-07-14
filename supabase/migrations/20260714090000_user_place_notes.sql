-- Private per-user notes on places ("what I ordered, who I was with").
-- Strictly personal: owner-only RLS on every operation — no other user,
-- including admins via the API, can read someone's notes. Zero moderation
-- surface by design.

create table if not exists public.user_place_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  note text not null check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index if not exists user_place_notes_user_idx on public.user_place_notes (user_id);

alter table public.user_place_notes enable row level security;

drop policy if exists "own notes select" on public.user_place_notes;
create policy "own notes select" on public.user_place_notes
  for select using (auth.uid() = user_id);

drop policy if exists "own notes insert" on public.user_place_notes;
create policy "own notes insert" on public.user_place_notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "own notes update" on public.user_place_notes;
create policy "own notes update" on public.user_place_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own notes delete" on public.user_place_notes;
create policy "own notes delete" on public.user_place_notes
  for delete using (auth.uid() = user_id);
