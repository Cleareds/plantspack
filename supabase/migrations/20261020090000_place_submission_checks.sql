-- Automated checks on community (mobile) place submissions.
-- One row per finding. Written by scripts/check-submissions.ts, read by admins.
-- Nothing here deletes or overrides a submission: `before`/`after` hold the
-- exact values an auto-fix changed so it can be rolled back by hand.
create table if not exists public.place_submission_checks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.place_submissions(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  check_type text not null,            -- default_coords | far_from_address | country_mismatch | suspicious_name | geocode_failed | existence
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'applied', 'dismissed', 'resolved')),
  finding text not null,               -- one sentence a human can act on
  evidence jsonb,                      -- geocoder hits, distances, reverse lookup
  before jsonb,                        -- values before an auto-fix (null when nothing changed)
  after jsonb,                         -- values after an auto-fix
  run_tag text,                        -- e.g. submission-check-2026-10-20
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists place_submission_checks_status_idx on public.place_submission_checks (status, created_at desc);
create index if not exists place_submission_checks_submission_idx on public.place_submission_checks (submission_id);
create index if not exists place_submission_checks_place_idx on public.place_submission_checks (place_id);

alter table public.place_submission_checks enable row level security;
-- Service role only (scripts + admin API). No anon/authenticated policies on purpose.
