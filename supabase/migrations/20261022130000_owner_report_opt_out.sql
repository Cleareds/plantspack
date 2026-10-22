-- Monthly owner report (business tools, 2026-10-22). Verified owners get a
-- short monthly summary of their own listing by default; this flag records
-- that they switched it off (one-click link in every email, or the dashboard).
-- Additive only. Read and written by the service role through API routes and
-- scripts/owner-monthly-report.ts; no client grant is added.

alter table public.users
  add column if not exists owner_report_opt_out boolean not null default false;

comment on column public.users.owner_report_opt_out is
  'true = the owner switched off the monthly owner report. Separate from newsletter_opt_in.';
