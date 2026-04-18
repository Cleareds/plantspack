-- Unified data-quality pipeline schema additions
-- See /Users/antonkravchuk/.claude/plans/warm-zooming-petal.md

-- Soft-delete: honors CLAUDE.md "never delete" while still letting admin hide
-- merged duplicates, confirmed-closed places, and rejected imports.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT;

-- Verification state derived + refined over time.
-- 'admin_verified'     — is_verified=true (admin/owner marked)
-- 'community_verified' — confirmed via community_report:confirmed
-- 'automated'          — passed an automated check (e.g. website alive)
-- 'unverified'         — default (community-imported, not yet confirmed)
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS verification_status TEXT;

-- Explains how the category got assigned (rule id or hint). Useful for admin
-- review in the "Suspected Wrong Category" tab.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS categorization_note TEXT;

-- Stable external refs for future sources. (fsq / vegguide already exist.)
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS osm_ref TEXT,
  ADD COLUMN IF NOT EXISTS happycow_id TEXT;

-- Backfill verification_status from existing is_verified.
UPDATE places
   SET verification_status = CASE WHEN is_verified = TRUE THEN 'admin_verified' ELSE 'unverified' END
 WHERE verification_status IS NULL;

-- Indexes for admin dashboard tabs + public-facing archived filter.
CREATE INDEX IF NOT EXISTS idx_places_archived_at ON places (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_verification_status ON places (verification_status);
CREATE INDEX IF NOT EXISTS idx_places_osm_ref ON places (osm_ref) WHERE osm_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_happycow_id ON places (happycow_id) WHERE happycow_id IS NOT NULL;
