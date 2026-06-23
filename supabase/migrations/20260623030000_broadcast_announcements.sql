-- Admin broadcast support. Adds an 'announcement' notification type (admin
-- "message to all users") and a per-user opt-in for receiving announcements as
-- an OS push. The in-app bell shows announcements to everyone regardless; the
-- opt-in only gates the OS push, per App Store Review Guideline 4.5.4 (promo /
-- marketing push requires explicit consent + an in-app opt-out).
--
-- Shared table change — coordinated with the mobile build that reads these.

-- 1) Allow type='announcement'. Recreate the CHECK with the full current set.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'like','comment','follow','mention','reply','pack_update',
    'submission_received','submission_approved',
    'correction_received','correction_approved',
    'place_nearby',
    'announcement'
  ));

-- 2) Opt-in flag for announcement OS push. Default FALSE = explicit opt-in
--    required before any promotional push is sent (compliance). The existing
--    master switch user_preferences.push_notifications still applies on top.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS push_announcements BOOLEAN NOT NULL DEFAULT FALSE;
