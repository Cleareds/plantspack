-- Pre-import staging table + verification log
-- Every external source writes here first. Import to places only happens after
-- the quality gate (website-verify, vegan-signal, score) and either an auto-
-- import threshold or operator confirmation via /admin/staging.
-- See /Users/antonkravchuk/.claude/plans/warm-zooming-petal.md §9 / §15a.

CREATE TABLE IF NOT EXISTS place_staging (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identification (idempotent key)
  source              TEXT NOT NULL,                       -- 'foursquare-strict-vegan-2026-04-18'
  source_id           TEXT NOT NULL,                       -- fsq_place_id / osm_ref / ...
  raw                 JSONB NOT NULL,                      -- original adapter payload

  -- Canonical fields from adapter (pre-verify)
  name                TEXT NOT NULL,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  city                TEXT,
  country             TEXT,
  address             TEXT,
  website             TEXT,
  phone               TEXT,
  categories          TEXT[],
  date_refreshed      DATE,                                -- from the source when known

  -- Tier-1 hard-filter outcome (from src/lib/places/quality-gate.ts)
  required_fields_ok  BOOLEAN,
  freshness_ok        BOOLEAN,
  chain_filtered      BOOLEAN,
  duplicate_of        UUID REFERENCES places(id),          -- matched existing place, won't import

  -- Tier-2 website-verify outcome
  website_ok          BOOLEAN,
  website_checked_at  TIMESTAMPTZ,
  website_signal      JSONB,                               -- {status, redirects, title, desc, og, ld_json, lang, menu_links}

  -- Vegan-signal scorer output
  vegan_level         TEXT,                                -- 'fully_vegan' | 'vegan_friendly' | 'vegetarian_reject' | 'unknown'
  vegan_confidence    NUMERIC(3,2),                        -- 0..1
  vegan_evidence      JSONB,                               -- [{rule, excerpt}]

  -- Overall score + decision (src/lib/places/score.ts)
  quality_score       NUMERIC(5,2),                        -- 0..100
  decision            TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'auto_import' | 'needs_review' | 'reject'
  decision_reason     TEXT,

  -- Operator triage
  operator_action     TEXT,                                -- 'approved' | 'rejected' | 'escalated'
  operator_user_id    UUID REFERENCES users(id),
  operator_note       TEXT,
  operator_decided_at TIMESTAMPTZ,

  -- Terminal state
  imported_place_id   UUID REFERENCES places(id),          -- set once row becomes a place

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One staged row per source-item; reruns are idempotent.
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_place_staging_decision   ON place_staging (decision);
CREATE INDEX IF NOT EXISTS idx_place_staging_source     ON place_staging (source);
CREATE INDEX IF NOT EXISTS idx_place_staging_score      ON place_staging (quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_place_staging_country    ON place_staging (country);
CREATE INDEX IF NOT EXISTS idx_place_staging_imported   ON place_staging (imported_place_id) WHERE imported_place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_place_staging_operator   ON place_staging (operator_user_id) WHERE operator_user_id IS NOT NULL;

-- RLS: admins only. Staging is never public.
ALTER TABLE place_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY place_staging_admin_all ON place_staging
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- ---------------------------------------------------------------------------
-- Verification log: history of every automated re-verify on a live place.
-- Powers continuous-drift alerts in data-quality.yml weekly audit.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS place_verification_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id          UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_type        TEXT NOT NULL,           -- 'website-head' | 'website-scrape' | 'vegan-resignal' | 'google-closure' | 'fsq-status'
  result            JSONB NOT NULL,          -- {status, notes, tags_added, tags_removed, signal_before, signal_after}
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_verification_log_place ON place_verification_log (place_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_verification_log_type  ON place_verification_log (check_type, checked_at DESC);

ALTER TABLE place_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY place_verification_log_admin_read ON place_verification_log
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- service role inserts directly; no public write access.
