-- Bulk-remove one tag from many places in a single SQL statement.
-- Replaces a per-place await loop in /api/admin/data-quality (dismiss
-- action), turning N round-trips into 1 atomic update.
CREATE OR REPLACE FUNCTION bulk_remove_place_tag(
  p_place_ids uuid[],
  p_tag text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE places
  SET tags = array_remove(COALESCE(tags, ARRAY[]::text[]), p_tag),
      updated_at = NOW()
  WHERE id = ANY(p_place_ids);
$$;

REVOKE ALL ON FUNCTION bulk_remove_place_tag(uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION bulk_remove_place_tag(uuid[], text) TO service_role;
