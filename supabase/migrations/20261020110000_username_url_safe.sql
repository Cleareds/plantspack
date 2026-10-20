-- Usernames must be URL-safe on every write path, not only at sign-up.
-- handle_new_user() has sanitised sign-ups since 2026-07-01, but a profile
-- edit (mobile onboarding, web edit page) could still store "Fillo Milano" or
-- "Green Planet." and break /profile/<username>. This trigger normalises the
-- value on INSERT and UPDATE from any client: whitespace runs -> "_", anything
-- outside [A-Za-z0-9_.-] dropped, leading/trailing "._-" trimmed, length 3..30,
-- and a numeric suffix when the result collides with another account.
-- Case is kept (legacy usernames use capitals and their URLs must not change).
create or replace function public.users_normalize_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  if new.username is null then
    return new;
  end if;
  base := regexp_replace(btrim(new.username), '\s+', '_', 'g');
  base := regexp_replace(base, '[^A-Za-z0-9_.-]', '', 'g');
  base := regexp_replace(base, '^[._-]+|[._-]+$', '', 'g');
  base := regexp_replace(base, '[._-]{2,}', '_', 'g');
  if length(base) < 3 then
    base := 'member_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  base := substr(base, 1, 30);
  candidate := base;
  while exists (select 1 from public.users where username = candidate and id <> new.id) loop
    n := n + 1;
    candidate := substr(base, 1, 30 - length(n::text) - 1) || '_' || n::text;
  end loop;
  new.username := candidate;
  return new;
end
$$;

drop trigger if exists users_normalize_username on public.users;
create trigger users_normalize_username
  before insert or update of username on public.users
  for each row execute function public.users_normalize_username();

-- Normalise the rows that already slipped through (2 on 2026-10-20). The
-- trigger above does the work; the UPDATE just touches the column.
update public.users
  set username = username
  where username ~ '[^A-Za-z0-9_.-]';
