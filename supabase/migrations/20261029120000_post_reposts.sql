-- Reposts: a one-tap "share inside PlantsPack", separate from the external
-- Share (system share sheet / social links). Stored like likes, not as a copy
-- in posts: the old web path (posts.post_type='share' + a copy of the content)
-- was never used (0 rows) and would have counted copies as posts, gone through
-- moderation again and kept stale text after an edit.
--
-- get_feed shows a repost as the original post with "<name> reposted" on top,
-- at the time of the repost (Newest only; Top sorts rank the original once).
-- A post appears once per page set: the newest of its rows wins.

-- Surrogate id as the primary key, NOT primary key (user_id, post_id): with a
-- composite key made of the two foreign keys, PostgREST treats the table as a
-- many-to-many junction between posts and users, and every existing embed like
-- posts?select=*,users(...) fails with PGRST201 "more than one relationship"
-- (broke the web for ~10 min on 2026-10-29 until the key was changed).
create table if not exists public.post_reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_reposts_user_post_key unique (user_id, post_id)
);
create index if not exists post_reposts_post_idx on public.post_reposts (post_id);
create index if not exists post_reposts_created_idx on public.post_reposts (created_at desc);

alter table public.post_reposts enable row level security;

drop policy if exists post_reposts_select on public.post_reposts;
create policy post_reposts_select on public.post_reposts
  for select to anon, authenticated using (true);

-- Only public, published, live originals; banned members cannot repost.
drop policy if exists post_reposts_insert on public.post_reposts;
create policy post_reposts_insert on public.post_reposts
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users u where u.id = auth.uid() and u.is_banned is not true)
    and exists (
      select 1 from public.posts p
       where p.id = post_id
         and p.privacy = 'public'
         and p.moderation_status = 'published'
         and p.deleted_at is null
         and p.parent_post_id is null
    )
  );

drop policy if exists post_reposts_delete on public.post_reposts;
create policy post_reposts_delete on public.post_reposts
  for delete to authenticated using (auth.uid() = user_id);

grant select on public.post_reposts to anon;
grant select, insert, delete on public.post_reposts to authenticated;
grant select, insert, update, delete on public.post_reposts to service_role;

-- Bell notification for the author (no phone push: dispatch only handles the
-- older social types).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type = any (array[
  'like','comment','follow','mention','reply','repost','pack_update','submission_received','submission_approved',
  'correction_received','correction_approved','correction_dismissed','report_reviewed','report_dismissed',
  'report_received','place_nearby','announcement','venue_update'
]::text[]));

create or replace function public.trg_notify_post_repost()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from posts where id = new.post_id and deleted_at is null;
  perform public.social_notify(v_owner, new.user_id, 'repost', 'post', new.post_id, '/post/' || new.post_id);
  return new;
end;
$$;

drop trigger if exists notify_post_repost on public.post_reposts;
create trigger notify_post_repost
  after insert on public.post_reposts
  for each row execute function public.trg_notify_post_repost();

-- Feed with reposts. Same signature and output as before, plus
-- post.repost_count, post.reposted_by_me and item.reposted_by.
create or replace function public.get_feed(
  p_mode text default 'all',
  p_category text default null,
  p_sort text default 'recent',
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_offset int default 0,
  p_limit int default 20
)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with me as (select auth.uid() as uid),
  hidden as (
    select uid from public.my_hidden_user_ids() as uid
  ),
  followed as (
    select following_id as uid from follows, me where follower_id = me.uid
  ),
  live_posts as (
    select p.* from posts p
      join users u on u.id = p.user_id
     where coalesce(p_category, '') <> 'reviews'
       and p.privacy = 'public'
       and p.moderation_status = 'published'
       and p.deleted_at is null
       and u.is_banned is not true
       and p.parent_post_id is null
       and (p_category is null or p.category = p_category)
  ),
  -- user_id = who put the row in the feed (author, or the reposter);
  -- author_id = who wrote it.
  post_rows as (
    select 'post'::text as kind, p.id, p.created_at, p.user_id, p.user_id as author_id, null::uuid as reposter_id,
           (select count(*) from post_likes l where l.post_id = p.id)
           + 2 * (select count(*) from comments c where c.post_id = p.id and c.deleted_at is null)
           + 2 * (select count(*) from post_reposts r where r.post_id = p.id) as score
      from live_posts p
      join users u on u.id = p.user_id
     -- Imported recipes/events by the admin account have their own screens.
     where not (u.username = 'admin' and p.category in ('recipe','event'))
  ),
  repost_rows as (
    select 'post'::text as kind, p.id, r.created_at, r.user_id, p.user_id as author_id, r.user_id as reposter_id,
           0::bigint as score
      from post_reposts r
      join live_posts p on p.id = r.post_id
      join users ru on ru.id = r.user_id
     where p_sort = 'recent'
       and ru.is_banned is not true
  ),
  review_rows as (
    select 'review'::text as kind, r.id, r.created_at, r.user_id, r.user_id as author_id, null::uuid as reposter_id,
           (select count(*) from place_review_reactions x where x.review_id = r.id) as score
      from place_reviews r
      join users u on u.id = r.user_id
     where (p_category is null or p_category = 'reviews')
       and r.deleted_at is null
       and u.is_banned is not true
  ),
  candidates as (
    select * from post_rows
    union all
    select * from repost_rows
    union all
    select * from review_rows
  ),
  visible as (
    select c.* from candidates c
     where c.user_id not in (select uid from hidden where uid is not null)
       and c.author_id not in (select uid from hidden where uid is not null)
       and (p_mode <> 'following' or c.user_id in (select uid from followed))
       and (p_sort <> 'top_week' or c.created_at > now() - interval '7 days')
  ),
  -- One row per post: the newest (a fresh repost lifts the post).
  deduped as (
    select distinct on (kind, id) * from visible
     order by kind, id, created_at desc
  ),
  filtered as (
    select * from deduped c
     where p_sort <> 'recent' or p_before is null
        or c.created_at < p_before
        or (c.created_at = p_before and c.id < p_before_id)
  ),
  page as (
    select * from filtered
     order by case when p_sort = 'recent' then 0 else score end desc,
              created_at desc, id desc
     offset case when p_sort = 'recent' then 0 else greatest(p_offset, 0) end
     limit least(greatest(p_limit, 1), 50)
  )
  select coalesce(jsonb_agg(item order by ord), '[]'::jsonb)
    from (
      select row_number() over (order by case when p_sort = 'recent' then 0 else pg.score end desc,
                                         pg.created_at desc, pg.id desc) as ord,
             jsonb_build_object(
               'kind', pg.kind,
               'id', pg.id,
               'created_at', pg.created_at,
               'score', pg.score,
               'author', (select jsonb_build_object('id', u.id, 'username', u.username, 'first_name', u.first_name,
                                                    'last_name', u.last_name, 'avatar_url', u.avatar_url)
                            from users u where u.id = pg.author_id),
               'author_followed_by_me', exists (select 1 from followed f where f.uid = pg.author_id),
               'reposted_by', case when pg.reposter_id is not null then (
                 select jsonb_build_object('id', u.id, 'username', u.username, 'first_name', u.first_name,
                                           'last_name', u.last_name, 'avatar_url', u.avatar_url)
                   from users u where u.id = pg.reposter_id) end,
               'post', case when pg.kind = 'post' then (
                 select jsonb_build_object(
                   'id', p.id, 'slug', p.slug, 'title', p.title, 'content', p.content, 'category', p.category,
                   'created_at', p.created_at,
                   'images', coalesce(
                     case when jsonb_typeof(p.images::jsonb) = 'array' and jsonb_array_length(p.images::jsonb) > 0 then p.images::jsonb end,
                     case when p.image_urls is not null and array_length(p.image_urls, 1) > 0 then to_jsonb(p.image_urls) end,
                     case when p.image_url is not null then jsonb_build_array(p.image_url) end,
                     '[]'::jsonb),
                   'recipe_data', p.recipe_data, 'event_data', p.event_data, 'product_data', p.product_data,
                   'secondary_tags', p.secondary_tags, 'is_pinned', p.is_pinned, 'edited_at', p.edited_at,
                   'place', (select jsonb_build_object('id', pl.id, 'slug', pl.slug, 'name', pl.name, 'city', pl.city,
                                                       'country', pl.country, 'vegan_level', pl.vegan_level,
                                                       'main_image_url', pl.main_image_url)
                               from places pl where pl.id = p.place_id),
                   'like_count', (select count(*) from post_likes l where l.post_id = p.id),
                   'comment_count', (select count(*) from comments c where c.post_id = p.id and c.deleted_at is null),
                   'repost_count', (select count(*) from post_reposts r where r.post_id = p.id),
                   'liked_by_me', exists (select 1 from post_likes l, me where l.post_id = p.id and l.user_id = me.uid),
                   'reposted_by_me', exists (select 1 from post_reposts r, me where r.post_id = p.id and r.user_id = me.uid)
                 ) from posts p where p.id = pg.id) end,
               'review', case when pg.kind = 'review' then (
                 select jsonb_build_object(
                   'id', r.id, 'rating', r.rating, 'content', r.content, 'images', r.images, 'dishes', r.dishes,
                   'place', (select jsonb_build_object('id', pl.id, 'slug', pl.slug, 'name', pl.name, 'city', pl.city,
                                                       'country', pl.country, 'vegan_level', pl.vegan_level,
                                                       'main_image_url', pl.main_image_url)
                               from places pl where pl.id = r.place_id),
                   'reaction_count', pg.score
                 ) from place_reviews r where r.id = pg.id) end
             ) as item
        from page pg
    ) s
$function$;

grant execute on function public.get_feed(text, text, text, timestamptz, uuid, int, int) to anon, authenticated;
