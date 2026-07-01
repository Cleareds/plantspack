-- Community place reports (Closed / Wrong hours / vegan-status flags) submitted
-- from the place-page report UI.
--
-- Previously we stored ONLY a community_report:* tag on the place — anonymous,
-- with no reporter and no source. This table records WHO reported it (when signed
-- in) plus an optional free-text "how do you know?" note, so admins can follow up
-- on the evidence. The tag write is KEPT for backward compatibility (the
-- data-quality queues read tags); this table is purely additive.

CREATE TABLE IF NOT EXISTS public.place_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS place_reports_place_id_idx ON public.place_reports (place_id);
CREATE INDEX IF NOT EXISTS place_reports_created_at_idx ON public.place_reports (created_at DESC);

-- All access is via server routes using the service role (which bypasses RLS).
-- Enable RLS with NO public policies so anon/auth clients can't read or write it
-- directly (reports are submitted through /api/places/[id]/report, read through
-- the admin data-quality API).
ALTER TABLE public.place_reports ENABLE ROW LEVEL SECURITY;
