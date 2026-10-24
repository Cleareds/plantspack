-- The app marks a followed city as seen (last_visited_at, last_seen_score,
-- last_seen_grade) straight from Supabase; the website does it through a route
-- handler with the service role. Allow a user to update only their own rows.
create policy followed_cities_update on public.user_followed_cities
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public event listings (and other public published posts) are readable by
-- signed-out visitors on the website through the server; the app reads posts
-- straight from Supabase, so anon needs the same read of published public rows.
-- Held, rejected, deleted, friends-only and private posts stay hidden.
grant select on public.posts to anon;
drop policy if exists posts_select_anon_public on public.posts;
create policy posts_select_anon_public on public.posts
  for select to anon
  using (deleted_at is null and moderation_status = 'published' and privacy = 'public');
