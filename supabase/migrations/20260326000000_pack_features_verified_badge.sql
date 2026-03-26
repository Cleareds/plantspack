-- Pack notifications + verified badges

-- Add pack_update notification type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'reply', 'pack_update'));

-- Add is_verified column to places and posts for admin verification badge
ALTER TABLE places ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
