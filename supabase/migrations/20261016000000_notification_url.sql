-- Optional tap target for a notification row (admin broadcasts).
--
-- Until now the broadcast `url` was only forwarded in the OS push payload, so
-- the in-app bell row had nothing to open. Store it on the row so the web bell
-- and the mobile notifications tab route the same way a push tap does.
--
-- Accepted forms (validated by the broadcast route):
--   plantspack://update            -> mobile in-app update screen; web -> /app
--   plantspack://<path>            -> mobile in-app route /<path>
--   /path                          -> in-app route on the current surface
--   https://...                    -> web: navigate; mobile: deep-link if it is a
--                                     known content URL, otherwise in-app browser
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS url text DEFAULT NULL;

COMMENT ON COLUMN notifications.url IS
  'Optional tap target. plantspack://update = app update screen; plantspack://<path> or /<path> = in-app route; https:// = web link.';
