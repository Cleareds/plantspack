-- Social backend for mobile 1.1.0 (2026-10-25).
--
-- Mobile writes straight to Supabase, so every social side effect has to live
-- in Postgres (the web used to create like/comment/follow notifications from
-- the browser via the cookie-only /api/notifications/create, and never sent a
-- push). This migration:
--   1. notifications: new types/entity types, client INSERT closed (it was
--      WITH CHECK (true), so any user could forge a notification for anyone).
--   2. social_notify() + AFTER INSERT triggers on post_likes, post_reactions,
--      comment_reactions, comments, follows, posts (mentions).
--   3. push/email dispatch: AFTER INSERT on notifications -> pg_net POST to
--      /api/notifications/dispatch (same bearer secret as /api/revalidate).
--   4. server-side rate limits for posts and comments (were client-only).
--   5. ban check really applies (permissive duplicates without it dropped).
--   6. hashtags from post text (was a cookie-only web route).
--   7. reports: accept the reasons the web /api/reports sends; alert admin.
--   8. terms acceptance stored (App Store 1.2 / Play UGC).
--   9. get_feed() for the app; directory counts that honour every filter.

-- ---------------------------------------------------------------------------
-- 1. notifications constraints + RLS
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'like','comment','follow','mention','reply','pack_update',
    'submission_received','submission_approved',
    'correction_received','correction_approved','correction_dismissed',
    'report_reviewed','report_dismissed','report_received',
    'place_nearby',
    'announcement'
  ));

alter table public.notifications drop constraint if exists notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check
  check (entity_type is null or entity_type in ('post','comment','place','user','place_review','report'));

-- Only the service role (server routes) and SECURITY DEFINER triggers insert.
drop policy if exists "System can create notifications" on public.notifications;

-- ---------------------------------------------------------------------------
-- 2. social_notify + triggers
-- ---------------------------------------------------------------------------
create or replace function public.social_notify(
  p_recipient uuid,
  p_actor uuid,
  p_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_url text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref boolean;
  v_window interval;
begin
  if p_recipient is null or p_actor is null or p_recipient = p_actor then
    return;
  end if;

  -- Banned actors and actors the recipient blocked never reach the bell.
  if exists (select 1 from users where id = p_actor and is_banned) then
    return;
  end if;
  if exists (select 1 from user_blocks where blocker_id = p_recipient and blocked_id = p_actor) then
    return;
  end if;

  -- Same preference gate the web route used (push_* switches the row off).
  select case p_type
           when 'like' then np.push_likes
           when 'comment' then np.push_comments
           when 'reply' then np.push_comments
           when 'follow' then np.push_follows
           when 'mention' then np.push_mentions
         end
    into v_pref
    from notification_preferences np
   where np.user_id = p_recipient;
  if v_pref is false then
    return;
  end if;

  -- De-duplicate: like/unlike/like or follow/unfollow/follow loops create one
  -- row a day; a burst of comments on one post creates one row per 10 min.
  v_window := case when p_type in ('like','follow','mention') then interval '1 day' else interval '10 minutes' end;
  if exists (
    select 1 from notifications n
     where n.user_id = p_recipient
       and n.actor_id = p_actor
       and n.type = p_type
       and n.entity_id is not distinct from p_entity_id
       and n.created_at > now() - v_window
  ) then
    return;
  end if;

  insert into notifications (user_id, actor_id, type, entity_type, entity_id, url)
  values (p_recipient, p_actor, p_type, p_entity_type, p_entity_id, p_url);
exception when others then
  -- A notification must never break the like/comment/follow that caused it.
  raise warning 'social_notify(%): %', p_type, sqlerrm;
end;
$$;

revoke all on function public.social_notify(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;

-- @username mentions in a text, as lower-case usernames (max 10 per text).
create or replace function public.extract_mentions(p_text text)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}')
    from (
      select regexp_matches(coalesce(p_text, ''), '(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_.]{2,30})', 'g') as m
      limit 10
    ) s
$$;

create or replace function public.notify_mentions(p_text text, p_actor uuid, p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select u.id from users u
     where lower(u.username) = any (public.extract_mentions(p_text))
  loop
    perform public.social_notify(r.id, p_actor, 'mention', 'post', p_post_id, '/post/' || p_post_id);
  end loop;
end;
$$;

revoke all on function public.notify_mentions(text, uuid, uuid) from public, anon, authenticated;

create or replace function public.trg_notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from posts where id = new.post_id and deleted_at is null;
  perform public.social_notify(v_owner, new.user_id, 'like', 'post', new.post_id, '/post/' || new.post_id);
  return new;
end;
$$;

drop trigger if exists notify_post_like on public.post_likes;
create trigger notify_post_like after insert on public.post_likes
  for each row execute function public.trg_notify_post_like();

drop trigger if exists notify_post_reaction on public.post_reactions;
create trigger notify_post_reaction after insert on public.post_reactions
  for each row execute function public.trg_notify_post_like();

create or replace function public.trg_notify_comment_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_post uuid;
begin
  select user_id, post_id into v_owner, v_post from comments where id = new.comment_id and deleted_at is null;
  perform public.social_notify(v_owner, new.user_id, 'like', 'comment', new.comment_id, '/post/' || v_post);
  return new;
end;
$$;

drop trigger if exists notify_comment_reaction on public.comment_reactions;
create trigger notify_comment_reaction after insert on public.comment_reactions
  for each row execute function public.trg_notify_comment_reaction();

create or replace function public.trg_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_owner uuid;
  v_parent_owner uuid;
  v_url text := '/post/' || new.post_id;
begin
  select user_id into v_post_owner from posts where id = new.post_id and deleted_at is null;

  if new.parent_comment_id is not null then
    select user_id into v_parent_owner from comments where id = new.parent_comment_id;
    perform public.social_notify(v_parent_owner, new.user_id, 'reply', 'post', new.post_id, v_url);
  end if;

  if v_post_owner is distinct from v_parent_owner then
    perform public.social_notify(v_post_owner, new.user_id, 'comment', 'post', new.post_id, v_url);
  end if;

  perform public.notify_mentions(new.content, new.user_id, new.post_id);
  return new;
end;
$$;

drop trigger if exists notify_comment on public.comments;
create trigger notify_comment after insert on public.comments
  for each row execute function public.trg_notify_comment();

create or replace function public.trg_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  select username into v_username from users where id = new.follower_id;
  perform public.social_notify(
    new.following_id, new.follower_id, 'follow', 'user', new.follower_id,
    case when v_username is not null then '/profile/' || v_username end
  );
  return new;
end;
$$;

drop trigger if exists notify_follow on public.follows;
create trigger notify_follow after insert on public.follows
  for each row execute function public.trg_notify_follow();

create or replace function public.trg_notify_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.privacy = 'public' and new.moderation_status = 'published' and new.deleted_at is null then
    perform public.notify_mentions(coalesce(new.title, '') || ' ' || coalesce(new.content, ''), new.user_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_post_mentions on public.posts;
create trigger notify_post_mentions after insert on public.posts
  for each row execute function public.trg_notify_post_mentions();

-- ---------------------------------------------------------------------------
-- 3. push + email dispatch for social rows
-- ---------------------------------------------------------------------------
-- System rows (submissions, nearby, broadcasts) already push from the server
-- code that inserts them, so only the social types are dispatched here.
create or replace function public.trg_dispatch_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.type not in ('like','comment','reply','follow','mention','report_received') then
    return new;
  end if;
  begin
    perform net.http_post(
      url     := 'https://www.plantspack.com/api/notifications/dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(public.revalidate_secret(), '')
      ),
      body    := jsonb_build_object('notification_id', new.id)
    );
  exception when others then
    raise warning 'trg_dispatch_notification: % (%)', sqlerrm, new.id;
  end;
  return new;
end;
$$;

drop trigger if exists dispatch_notification on public.notifications;
create trigger dispatch_notification after insert on public.notifications
  for each row execute function public.trg_dispatch_notification();

-- ---------------------------------------------------------------------------
-- 4. server-side rate limits (10 posts / h, 30 comments / h)
-- ---------------------------------------------------------------------------
-- Service-role writes (imports, admin tools) have no auth.uid() and are not
-- limited; admins are not limited either.
create or replace function public.trg_rate_limit_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v json;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  v := public.check_rate_limit_posts(auth.uid());
  if (v->>'allowed')::boolean is false then
    raise exception 'RATE_LIMIT: you can publish 10 posts per hour. Try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists rate_limit_posts on public.posts;
create trigger rate_limit_posts before insert on public.posts
  for each row execute function public.trg_rate_limit_posts();

create or replace function public.trg_rate_limit_comments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v json;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  v := public.check_rate_limit_comments(auth.uid());
  if (v->>'allowed')::boolean is false then
    raise exception 'RATE_LIMIT: you can write 30 comments per hour. Try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists rate_limit_comments on public.comments;
create trigger rate_limit_comments before insert on public.comments
  for each row execute function public.trg_rate_limit_comments();

-- ---------------------------------------------------------------------------
-- 5. ban check: drop the permissive duplicates that OR'ed it away
-- ---------------------------------------------------------------------------
-- The remaining policies ("Users can insert posts", "Users can insert
-- comments", "Users can like posts", "Users can add reactions") check
-- auth.uid() = user_id AND the user is not banned.
drop policy if exists posts_insert on public.posts;
drop policy if exists comments_insert_policy on public.comments;
drop policy if exists post_likes_insert_policy on public.post_likes;
drop policy if exists "Users can add their own reactions" on public.post_reactions;

-- ---------------------------------------------------------------------------
-- 6. hashtags from post text
-- ---------------------------------------------------------------------------
create or replace function public.trg_sync_post_hashtags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tag text;
  v_id uuid;
begin
  for v_tag in
    select distinct lower(m[1])
      from regexp_matches(coalesce(new.content, ''), '#([A-Za-z0-9_]{2,40})', 'g') as m
     limit 15
  loop
    select id into v_id from hashtags where normalized_tag = v_tag limit 1;
    if v_id is null then
      insert into hashtags (tag, normalized_tag, usage_count) values (v_tag, v_tag, 0)
      returning id into v_id;
    end if;
    if not exists (select 1 from post_hashtags where post_id = new.id and hashtag_id = v_id) then
      insert into post_hashtags (post_id, hashtag_id) values (new.id, v_id);
    end if;
  end loop;
  return new;
exception when others then
  raise warning 'trg_sync_post_hashtags: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists sync_post_hashtags on public.posts;
create trigger sync_post_hashtags after insert on public.posts
  for each row execute function public.trg_sync_post_hashtags();

-- ---------------------------------------------------------------------------
-- 7. reports
-- ---------------------------------------------------------------------------
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.reports'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table public.reports drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.reports add constraint reports_reason_check
  check (reason in (
    'spam','harassment','hate_speech','violence','misinformation','nsfw',
    'off_topic','copyright','inappropriate','wrong_info','not_vegan',
    'closed','duplicate','other'
  ));

create or replace function public.trg_notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
begin
  select id into v_admin from users where username = 'admin' limit 1;
  if v_admin is null or v_admin = new.reporter_id then
    return new;
  end if;
  insert into notifications (user_id, actor_id, type, entity_type, entity_id, url, message)
  values (
    v_admin, new.reporter_id, 'report_received', 'report', new.id, '/admin/reports',
    'New report: ' || new.reported_type || ' (' || new.reason || ')'
  );
  return new;
exception when others then
  raise warning 'trg_notify_report: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notify_report on public.reports;
create trigger notify_report after insert on public.reports
  for each row execute function public.trg_notify_report();

-- ---------------------------------------------------------------------------
-- 8. terms acceptance
-- ---------------------------------------------------------------------------
alter table public.users add column if not exists terms_accepted_at timestamptz;

create or replace function public.accept_terms()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update users set terms_accepted_at = coalesce(terms_accepted_at, now())
   where id = auth.uid()
  returning terms_accepted_at
$$;

create or replace function public.my_terms_accepted_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select terms_accepted_at from users where id = auth.uid()
$$;

revoke all on function public.accept_terms() from public, anon;
revoke all on function public.my_terms_accepted_at() from public, anon;
grant execute on function public.accept_terms() to authenticated;
grant execute on function public.my_terms_accepted_at() to authenticated;

-- ---------------------------------------------------------------------------
-- 9a. get_feed for the app
-- ---------------------------------------------------------------------------
-- Users the caller must not see: people they blocked or muted, and people who
-- blocked them (RLS on user_blocks hides that direction, hence DEFINER).
create or replace function public.my_hidden_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select blocked_id from user_blocks where blocker_id = auth.uid()
  union select blocker_id from user_blocks where blocked_id = auth.uid()
  union select muted_id from user_mutes where muter_id = auth.uid()
$$;

revoke all on function public.my_hidden_user_ids() from public;
grant execute on function public.my_hidden_user_ids() to anon, authenticated;
-- p_mode: 'all' | 'following'.  p_category: null (everything), 'reviews', or a
-- post category.  p_sort: 'recent' (keyset on p_before/p_before_id) |
-- 'top_week' | 'top_all' (p_offset).  SECURITY INVOKER: RLS still applies.
create or replace function public.get_feed(
  p_mode text default 'all',
  p_category text default null,
  p_sort text default 'recent',
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_offset int default 0,
  p_limit int default 20
) returns jsonb
language sql
stable
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  hidden as (
    select uid from public.my_hidden_user_ids() as uid
  ),
  followed as (
    select following_id as uid from follows, me where follower_id = me.uid
  ),
  post_rows as (
    select 'post'::text as kind, p.id, p.created_at, p.user_id,
           (select count(*) from post_likes l where l.post_id = p.id)
           + 2 * (select count(*) from comments c where c.post_id = p.id and c.deleted_at is null) as score
      from posts p
      join users u on u.id = p.user_id
     where coalesce(p_category, '') <> 'reviews'
       and p.privacy = 'public'
       and p.moderation_status = 'published'
       and p.deleted_at is null
       and u.is_banned is not true
       and p.parent_post_id is null
       -- Imported recipes/events by the admin account have their own screens.
       and not (u.username = 'admin' and p.category in ('recipe','event'))
       and (p_category is null or p.category = p_category)
  ),
  review_rows as (
    select 'review'::text as kind, r.id, r.created_at, r.user_id,
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
    select * from review_rows
  ),
  filtered as (
    select c.* from candidates c
     where c.user_id not in (select uid from hidden where uid is not null)
       and (p_mode <> 'following' or c.user_id in (select uid from followed))
       and (p_sort <> 'top_week' or c.created_at > now() - interval '7 days')
       and (p_sort <> 'recent' or p_before is null
            or c.created_at < p_before
            or (c.created_at = p_before and c.id < p_before_id))
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
                            from users u where u.id = pg.user_id),
               'author_followed_by_me', exists (select 1 from followed f where f.uid = pg.user_id),
               'post', case when pg.kind = 'post' then (
                 select jsonb_build_object(
                   'id', p.id, 'slug', p.slug, 'title', p.title, 'content', p.content, 'category', p.category,
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
                   'liked_by_me', exists (select 1 from post_likes l, me where l.post_id = p.id and l.user_id = me.uid)
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
$$;

grant execute on function public.get_feed(text, text, text, timestamptz, uuid, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9b. directory counts that honour every place filter
-- ---------------------------------------------------------------------------
create or replace function public.directory_city_counts(
  p_country text,
  p_vegan_only boolean default false,
  p_category text default null,
  p_subcategory text default null,
  p_cuisine text default null,
  p_pet boolean default false,
  p_min_places int default 5
) returns table (city text, country text, place_count bigint, fully_vegan_count bigint)
language sql
stable
set search_path = public
as $$
  select p.city, min(p.country) as country, count(*) as place_count,
         count(*) filter (where p.vegan_level = 'fully_vegan') as fully_vegan_count
    from places p
   where p.archived_at is null
     and p.city is not null
     and lower(p.country) = lower(p_country)
     and (not p_vegan_only or p.vegan_level = 'fully_vegan')
     and (p_category is null or p.category = p_category)
     and (p_subcategory is null or p.subcategory = p_subcategory)
     and (p_cuisine is null or p_cuisine = any (p.cuisine_types))
     and (not p_pet or p.is_pet_friendly)
   group by p.city
  having count(*) >= case when p_vegan_only or p_category is not null or p_subcategory is not null
                               or p_cuisine is not null or p_pet then 1 else p_min_places end
   order by count(*) desc
$$;

create or replace function public.directory_country_counts(
  p_vegan_only boolean default false,
  p_category text default null,
  p_subcategory text default null,
  p_cuisine text default null,
  p_pet boolean default false
) returns table (country text, place_count bigint, city_count bigint, fully_vegan_count bigint)
language sql
stable
set search_path = public
as $$
  select p.country, count(*) as place_count, count(distinct p.city) as city_count,
         count(*) filter (where p.vegan_level = 'fully_vegan') as fully_vegan_count
    from places p
   where p.archived_at is null
     and p.country is not null
     and (not p_vegan_only or p.vegan_level = 'fully_vegan')
     and (p_category is null or p.category = p_category)
     and (p_subcategory is null or p.subcategory = p_subcategory)
     and (p_cuisine is null or p_cuisine = any (p.cuisine_types))
     and (not p_pet or p.is_pet_friendly)
   group by p.country
   order by count(*) desc
$$;

grant execute on function public.directory_city_counts(text, boolean, text, text, text, boolean, int) to anon, authenticated;
grant execute on function public.directory_country_counts(boolean, text, text, text, boolean) to anon, authenticated;
