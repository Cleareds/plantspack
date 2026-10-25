-- push_likes defaults to false for every user (554/554), and the old web rule
-- used push_* to skip the notification ROW, so likes never reached the bell.
-- From now on push_* gates only the phone push (dispatch route); the in-app
-- bell always gets the row. Blocks, bans and de-duplication are unchanged.

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

  -- push_* preferences gate only the phone push (checked in
  -- /api/notifications/dispatch); the bell always gets the row.
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

