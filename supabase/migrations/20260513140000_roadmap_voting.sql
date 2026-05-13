-- Roadmap voting evolution: the existing roadmap_votes table is
-- one-shot (you submit a batch, can't change later). Tighten the
-- schema so the API can switch to toggle semantics.
--
-- Existing shape:
--   id uuid, user_id uuid, feature_id text, created_at
--   (no uniqueness constraint - the "you have already voted" check
--   is enforced at the app layer, which means re-votes are blocked
--   by a 400, not the DB)
--
-- Changes:
--   1. Backfill safety: dedupe any historical duplicate rows
--      (user_id, feature_id) before adding the constraint.
--   2. Add UNIQUE (user_id, feature_id) so we can use upsert /
--      ON CONFLICT semantics in the toggle API.
--   3. Add an index on feature_id for the vote-count aggregation.
--   4. RLS: enable + add policies. The existing API uses the user's
--      session client (not service role) for writes, so RLS needs
--      to allow supporters to insert their own row and delete it
--      again for the toggle UX. Reads stay world-public so non-
--      supporters can see the totals before they decide to support.

-- Dedupe before adding the unique constraint, just in case.
delete from public.roadmap_votes a
using public.roadmap_votes b
where a.created_at < b.created_at
  and a.user_id = b.user_id
  and a.feature_id = b.feature_id;

alter table public.roadmap_votes
  drop constraint if exists roadmap_votes_user_feature_key;
alter table public.roadmap_votes
  add constraint roadmap_votes_user_feature_key unique (user_id, feature_id);

create index if not exists roadmap_votes_feature_idx
  on public.roadmap_votes (feature_id);

alter table public.roadmap_votes enable row level security;

drop policy if exists "roadmap votes are public" on public.roadmap_votes;
create policy "roadmap votes are public"
  on public.roadmap_votes
  for select
  using (true);

drop policy if exists "supporters can vote" on public.roadmap_votes;
create policy "supporters can vote"
  on public.roadmap_votes
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.subscription_tier in ('medium', 'premium')
    )
  );

drop policy if exists "users can remove their own vote" on public.roadmap_votes;
create policy "users can remove their own vote"
  on public.roadmap_votes
  for delete
  to authenticated
  using (auth.uid() = user_id);
