-- Add notification types for the community-report + correction lifecycle so we
-- can tell reporters/correctors when their input was acted on or dismissed:
--   report_reviewed     -> we updated the listing based on your vegan report
--   report_dismissed    -> we checked your report and kept the current info (rare)
--   correction_dismissed-> we reviewed your correction and kept the current info
-- (correction_approved already exists for the accepted case.)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'like','comment','follow','mention','reply','pack_update',
    'submission_received','submission_approved',
    'correction_received','correction_approved','correction_dismissed',
    'report_reviewed','report_dismissed',
    'place_nearby',
    'announcement'
  ));
