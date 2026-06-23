-- Remote config the mobile app reads on launch to drive the in-app "update
-- available" banner and a hard gate below a genuinely unsupported version.
-- No push involved (App-Store-friendly: informational, links to the store).
--
-- One row per platform. `latest_version` / `min_supported_version` are dotted
-- numeric strings (e.g. '1.2.0'). The app compares its running version:
--   running <  min_supported_version  -> forced (blocking) update screen
--   running <  latest_version         -> soft, dismissible banner
CREATE TABLE IF NOT EXISTS app_release_config (
  platform text PRIMARY KEY CHECK (platform IN ('ios','android')),
  latest_version text NOT NULL DEFAULT '1.0.0',
  min_supported_version text NOT NULL DEFAULT '1.0.0',
  store_url text,
  message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_release_config (platform, latest_version, min_supported_version, store_url) VALUES
  ('ios',     '1.0.0', '1.0.0', NULL),
  ('android', '1.0.0', '1.0.0', NULL)
ON CONFLICT (platform) DO NOTHING;

ALTER TABLE app_release_config ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. signed-out, pre-onboarding) may read it to check their version.
DROP POLICY IF EXISTS "app_release_config public read" ON app_release_config;
CREATE POLICY "app_release_config public read" ON app_release_config
  FOR SELECT USING (true);

-- Only admins may change it from the client; the admin API also uses the
-- service role (which bypasses RLS) so this is defence-in-depth.
DROP POLICY IF EXISTS "app_release_config admin write" ON app_release_config;
CREATE POLICY "app_release_config admin write" ON app_release_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
