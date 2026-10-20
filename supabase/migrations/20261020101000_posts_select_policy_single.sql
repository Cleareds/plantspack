-- The previous migration found no policy named posts_select_policy on the live
-- database, so other SELECT policies exist under different names. RLS policies
-- are OR-ed: any permissive SELECT policy that ignores moderation_status would
-- let held posts through. Keep exactly one SELECT policy on posts.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'posts' and cmd = 'SELECT'
      and policyname <> 'posts_select_policy'
  loop
    execute format('drop policy if exists %I on public.posts', pol.policyname);
  end loop;
end $$;

-- Anonymous readers go through the server (service role) today; if an anon
-- SELECT policy is ever added, it must carry the same moderation condition.
