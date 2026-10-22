-- Paid business tools (Partner plan), 2026-10-23. Additive only.
--
-- place_plans          which places pay (Stripe) or were granted the plan by an admin
-- place_deals          deals a Partner venue offers (public read only while the plan is active)
-- place_action_daily   taps on directions / website / phone / menu, per place per day
-- place_follower_messages  log of messages sent to a city's followers (1 per month cap)
-- notifications.type   + 'venue_update'
-- city_place_view_median()  city comparison for detailed stats (service role only)
--
-- Rule kept everywhere: a plan buys tools, never position, label or review changes.

-- Plan record ---------------------------------------------------------------
create table if not exists public.place_plans (
  place_id               uuid primary key references public.places(id) on delete cascade,
  plan                   text not null default 'partner' check (plan in ('partner')),
  status                 text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  source                 text not null check (source in ('stripe', 'admin')),
  billing_interval       text check (billing_interval in ('month', 'year')),
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  current_period_end     timestamptz,
  granted_by             uuid references public.users(id) on delete set null,
  note                   text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
alter table public.place_plans enable row level security;
-- No client policies: read and written through API routes / the Stripe webhook.
grant all on table public.place_plans to service_role;

create or replace function public.place_has_partner_plan(p_place_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.place_plans
    where place_id = p_place_id and status in ('active', 'past_due')
      and (current_period_end is null or current_period_end > now() - interval '3 days')
  );
$$;
grant execute on function public.place_has_partner_plan(uuid) to anon, authenticated, service_role;

-- Deals ---------------------------------------------------------------------
create table if not exists public.place_deals (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 80),
  details     text check (details is null or char_length(details) <= 400),
  audience    text not null default 'everyone' check (audience in ('everyone', 'supporters')),
  starts_on   date not null default current_date,
  ends_on     date,
  status      text not null default 'active' check (status in ('active', 'paused')),
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index if not exists place_deals_place_idx on public.place_deals (place_id, status);
alter table public.place_deals enable row level security;
drop policy if exists place_deals_public_read on public.place_deals;
create policy place_deals_public_read on public.place_deals
  for select to anon, authenticated
  using (
    status = 'active'
    and starts_on <= current_date
    and (ends_on is null or ends_on >= current_date)
    and public.place_has_partner_plan(place_id)
  );
grant select on table public.place_deals to anon, authenticated;
grant all on table public.place_deals to service_role;

-- Tap counters (detailed stats) --------------------------------------------
-- Identifier-free, like content_view_daily: no user, IP or cookie stored.
create table if not exists public.place_action_daily (
  place_id uuid not null references public.places(id) on delete cascade,
  action   text not null check (action in ('directions', 'website', 'phone', 'menu')),
  day      date not null default current_date,
  count    integer not null default 0,
  primary key (place_id, action, day)
);
alter table public.place_action_daily enable row level security;
grant all on table public.place_action_daily to service_role;

create or replace function public.record_place_action(p_place_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_action not in ('directions', 'website', 'phone', 'menu') then return; end if;
  if not exists (select 1 from public.places where id = p_place_id) then return; end if;
  insert into public.place_action_daily (place_id, action, day, count)
  values (p_place_id, p_action, current_date, 1)
  on conflict (place_id, action, day) do update set count = public.place_action_daily.count + 1;
end;
$$;
grant execute on function public.record_place_action(uuid, text) to anon, authenticated;

-- Follower messages ---------------------------------------------------------
create table if not exists public.place_follower_messages (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  sent_by     uuid references public.users(id) on delete set null,
  message     text not null check (char_length(message) between 10 and 200),
  recipients  integer not null default 0,
  test_only   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists place_follower_messages_place_idx on public.place_follower_messages (place_id, created_at);
alter table public.place_follower_messages enable row level security;
grant all on table public.place_follower_messages to service_role;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'like','comment','follow','mention','reply','pack_update',
    'submission_received','submission_approved',
    'correction_received','correction_approved','correction_dismissed',
    'report_reviewed','report_dismissed',
    'place_nearby',
    'announcement',
    'venue_update'
  ));

-- City comparison -----------------------------------------------------------
create or replace function public.city_place_view_median(p_city text, p_country text, p_days integer default 30)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(percentile_cont(0.5) within group (order by v), 0)::numeric
  from (
    select p.id, coalesce(sum(c.views), 0) as v
    from public.places p
    left join public.content_view_daily c
      on c.entity_type = 'place' and c.entity_id = p.id and c.day >= current_date - p_days
    where p.city = p_city and p.country = p_country and p.archived_at is null
    group by p.id
  ) t;
$$;
revoke all on function public.city_place_view_median(text, text, integer) from public, anon, authenticated;
grant execute on function public.city_place_view_median(text, text, integer) to service_role;
