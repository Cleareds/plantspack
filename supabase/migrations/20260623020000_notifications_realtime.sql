-- Enable Supabase Realtime for the notifications table so the mobile app's
-- tab-bar unread badge updates live (mobileapp/src/store/notificationStore.ts
-- subscribes to postgres_changes filtered by user_id). Realtime still honours
-- the existing RLS SELECT policy ("Users can view own notifications"), so each
-- client only receives its own rows.
--
-- This does NOT alter the notifications schema (no columns/types change) — it
-- only adds the table to the realtime publication. Idempotent + safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
