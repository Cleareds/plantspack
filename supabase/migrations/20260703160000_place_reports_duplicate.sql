-- Support duplicate reports: a duplicate flags TWO listings, so a report needs
-- to point at the partner place as well as the reported one. related_place_id
-- is nullable (user reports may only name the other listing in free-text note;
-- the batch dedup audit fills it in). ON DELETE SET NULL so archiving/merging a
-- place never orphans the report row.
ALTER TABLE public.place_reports
  ADD COLUMN IF NOT EXISTS related_place_id uuid REFERENCES public.places(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS place_reports_type_status_idx ON public.place_reports (type, status);
