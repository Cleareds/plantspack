-- Count taps on the Partner "Book a table" / "Order online" buttons too. Additive.
alter table public.place_action_daily drop constraint if exists place_action_daily_action_check;
alter table public.place_action_daily add constraint place_action_daily_action_check
  check (action in ('directions', 'website', 'phone', 'menu', 'booking', 'order'));

create or replace function public.record_place_action(p_place_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_action not in ('directions', 'website', 'phone', 'menu', 'booking', 'order') then return; end if;
  if not exists (select 1 from public.places where id = p_place_id) then return; end if;
  insert into public.place_action_daily (place_id, action, day, count)
  values (p_place_id, p_action, current_date, 1)
  on conflict (place_id, action, day) do update set count = public.place_action_daily.count + 1;
end;
$$;
grant execute on function public.record_place_action(uuid, text) to anon, authenticated;
