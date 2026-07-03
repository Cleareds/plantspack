-- Multiple contributors per place. Until now a place had exactly one owner
-- (places.created_by). But real cases need more: two people submit the same
-- place (keep one, credit both), or a supporter/editor improves a listing and
-- should be shown next to the original submitter.
--
--   creator      - the person the place is attributed to (mirrors created_by)
--   co_submitter - independently suggested the same place (e.g. duplicate submission we merged)
--   editor       - later improved the listing (future: supporters editing places)
--   contributor  - generic catch-all
CREATE TABLE IF NOT EXISTS public.place_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'contributor' CHECK (role IN ('creator', 'co_submitter', 'editor', 'contributor')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (place_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS place_contributors_place_id_idx ON public.place_contributors (place_id);
CREATE INDEX IF NOT EXISTS place_contributors_user_id_idx ON public.place_contributors (user_id);

-- Contributor credits are public (shown on the place page). Read to everyone;
-- writes only via server routes using the service role.
ALTER TABLE public.place_contributors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS place_contributors_public_read ON public.place_contributors;
CREATE POLICY place_contributors_public_read ON public.place_contributors FOR SELECT USING (true);
