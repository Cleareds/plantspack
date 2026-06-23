-- Widen the notifications type + entity_type checks so we can notify users
-- about place submission / correction lifecycle events and new nearby places.
--
-- New types:
--   submission_received   — we got your suggested place (ack)
--   submission_approved   — your suggested place is now live
--   correction_received   — we got your correction (ack)
--   correction_approved   — your correction was applied
--   place_nearby          — a new place opened in a city you follow / call home
-- New entity_type 'place' → entity_id holds the place UUID; the bell links to
-- /place/{entity_id} (the place route resolves UUIDs as well as slugs).

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'like','comment','follow','mention','reply','pack_update',
    'submission_received','submission_approved',
    'correction_received','correction_approved',
    'place_nearby'
  ));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check
  CHECK (entity_type IS NULL OR entity_type IN ('post','comment','place'));
