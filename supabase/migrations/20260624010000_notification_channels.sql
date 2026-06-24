-- Per-channel targeting for broadcast announcements.
--
-- NULL = delivered to every channel (web bell + mobile in-app + OS push). This
-- is the default and keeps every existing row and every transactional
-- notification (likes, follows, submissions, nearby, ...) visible everywhere
-- with no backfill.
--
-- For an admin broadcast we store the selected subset of {'web','ios','android'}.
-- Each client shows a row only when its surface key is in `channels` (or channels
-- IS NULL): the web bell uses 'web'; the mobile app uses the device platform
-- ('ios' | 'android'). Push fan-out is filtered separately by token platform.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT NULL;

COMMENT ON COLUMN notifications.channels IS
  'Target channels. NULL = all channels (default). Subset of {web,ios,android}. A surface shows a row when channels IS NULL OR <surface key> = ANY(channels); web key = web, mobile key = device platform.';
