-- Post spam controls without AI (2026-10-20).
-- 1. New accounts (< 24 h) that post an outbound link get the post HELD, not
--    published. Held posts are visible to their author and to admins only.
-- 2. Banning an account soft-deletes everything it posted (posts, comments,
--    place reviews). Nothing is hard-deleted.
-- Pattern that motivated this: three SEO spam posts in 90 days, every one from
-- an account younger than 15 minutes, every one with exactly one link.

-- is_admin(): usable inside policies without tripping users-table RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.users where id = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon, service_role;

alter table public.posts
  add column if not exists moderation_status text not null default 'published'
  check (moderation_status in ('published', 'held', 'rejected'));
create index if not exists posts_moderation_held_idx
  on public.posts (created_at desc) where moderation_status <> 'published';

-- 1. Hold rule --------------------------------------------------------------
create or replace function public.posts_hold_new_account_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
begin
  -- Admin tooling and the blog insert with an explicit status; respect it.
  if new.moderation_status is distinct from 'published' then
    return new;
  end if;
  select created_at, role, is_banned into u from public.users where id = new.user_id;
  if u is null or u.role = 'admin' then
    return new;
  end if;
  if u.is_banned then
    new.moderation_status := 'rejected';
    return new;
  end if;
  if u.created_at > now() - interval '24 hours'
     and (coalesce(new.content, '') || ' ' || coalesce(new.title, '')) ~* '(https?://|www\.)' then
    new.moderation_status := 'held';
  end if;
  return new;
end
$$;

drop trigger if exists posts_hold_new_account_links on public.posts;
create trigger posts_hold_new_account_links
  before insert on public.posts
  for each row execute function public.posts_hold_new_account_links();

-- 2. Ban cascade ------------------------------------------------------------
create or replace function public.users_ban_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_banned and not coalesce(old.is_banned, false) then
    update public.posts set deleted_at = now(), moderation_status = 'rejected'
      where user_id = new.id and deleted_at is null;
    update public.comments set deleted_at = now()
      where user_id = new.id and deleted_at is null;
    update public.place_reviews set deleted_at = now()
      where user_id = new.id and deleted_at is null;
  end if;
  return new;
end
$$;

drop trigger if exists users_ban_cascade on public.users;
create trigger users_ban_cascade
  after update of is_banned on public.users
  for each row execute function public.users_ban_cascade();

-- 3. Readers: held/rejected posts are visible to their author and admins only.
drop policy if exists "posts_select_policy" on public.posts;
create policy "posts_select_policy"
  on public.posts
  for select
  to authenticated
  using (
    deleted_at is null
    and (moderation_status = 'published' or user_id = auth.uid() or public.is_admin())
    and (
      privacy = 'public'
      or user_id = auth.uid()
      or (
        privacy = 'friends'
        and exists (
          select 1 from public.follows
          where follower_id = auth.uid() and following_id = posts.user_id
        )
      )
    )
  );
comment on policy "posts_select_policy" on public.posts is
  'Privacy + deletion + moderation hold (held/rejected posts: author and admins only)';
