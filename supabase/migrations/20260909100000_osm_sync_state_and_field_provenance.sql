-- Foundations for the two-way OSM sync. See docs/osm-sync-plan.md.
--
-- Two tables, no data changes to `places`:
--
--   osm_sync_state          which OSM element a place tracks, plus the OSM tag
--                           snapshot at last sync. That snapshot is the merge
--                           BASE: without it we can only compare "ours vs
--                           theirs" and cannot tell who changed what, which is
--                           what makes a safe three-way merge impossible today.
--
--   place_field_provenance  who last set each field. A row with locked = true
--                           means a human set this value and the sync must
--                           never overwrite it. This is the mechanism behind
--                           "user-contributed data is the source of truth" -
--                           `updated_at` cannot do it, because 44,987 of the
--                           45,007 OSM-linked rows have been touched by bulk
--                           scripts and look identical to a human edit.
--
-- The UNIQUE index on places.osm_ref is deliberately NOT here: 287 osm_ref
-- values are currently claimed by two live rows each, so it would fail. It
-- lands in a follow-up migration once those are resolved.

-- ---------------------------------------------------------------------------
-- osm_sync_state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.osm_sync_state (
  place_id        UUID PRIMARY KEY REFERENCES public.places(id) ON DELETE CASCADE,
  -- 'node:123' / 'way:456' / 'relation:789' - same shape as places.osm_ref.
  osm_ref         TEXT NOT NULL,
  osm_version     INTEGER,
  osm_timestamp   TIMESTAMPTZ,
  osm_changeset   BIGINT,
  -- OSM tags as of the last successful sync. The merge base.
  base_tags       JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ok | conflict | vanished | retagged. `vanished` and `retagged` are review
  -- states, never triggers for an automatic archive: an element leaving OSM
  -- does not mean the venue closed.
  last_status     TEXT NOT NULL DEFAULT 'ok'
    CHECK (last_status IN ('ok', 'conflict', 'vanished', 'retagged')),
  last_error      TEXT,
  CONSTRAINT osm_sync_state_ref_format CHECK (osm_ref ~ '^(node|way|relation):[0-9]+$'),
  -- One place per element and one element per place: the whole point.
  CONSTRAINT osm_sync_state_ref_unique UNIQUE (osm_ref)
);

CREATE INDEX IF NOT EXISTS idx_osm_sync_state_status
  ON public.osm_sync_state (last_status)
  WHERE last_status <> 'ok';

CREATE INDEX IF NOT EXISTS idx_osm_sync_state_synced
  ON public.osm_sync_state (last_synced_at);

COMMENT ON TABLE public.osm_sync_state IS
  'Per-place OSM sync bookkeeping. base_tags is the three-way merge base (OSM tags at last sync). See docs/osm-sync-plan.md.';

-- ---------------------------------------------------------------------------
-- place_field_provenance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_field_provenance (
  place_id     UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  -- Column name on `places`, e.g. 'name', 'opening_hours', 'vegan_level'.
  field        TEXT NOT NULL,
  -- 'user' | 'admin' | 'osm' | 'import:<source tag>'
  source       TEXT NOT NULL,
  -- true = a human set this. The OSM sync must never overwrite a locked field.
  locked       BOOLEAN NOT NULL DEFAULT false,
  updated_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, field)
);

CREATE INDEX IF NOT EXISTS idx_place_field_provenance_locked
  ON public.place_field_provenance (place_id)
  WHERE locked;

COMMENT ON TABLE public.place_field_provenance IS
  'Who last set each place field. locked = true means a human owns it and the OSM sync must leave it alone. See docs/osm-sync-plan.md.';

-- ---------------------------------------------------------------------------
-- RLS: both tables are internal sync bookkeeping. No anon or authenticated
-- access at all; only the service role (which bypasses RLS) touches them.
-- Enabled with no policies = deny by default, which is what we want here.
-- ---------------------------------------------------------------------------
ALTER TABLE public.osm_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_field_provenance ENABLE ROW LEVEL SECURITY;
