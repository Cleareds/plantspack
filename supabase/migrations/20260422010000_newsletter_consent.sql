-- Newsletter consent lifecycle on users + stable unsubscribe token.
--
-- GDPR / PECR / CAN-SPAM require:
--   * Proof of WHEN consent was given (newsletter_opted_in_at)
--   * Proof of HOW it was obtained (newsletter_source)
--   * Preservation of unsubscribe history (newsletter_unsubscribed_at) — never delete
--   * A one-click unsubscribe URL that works without login (marketing_email_token)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS newsletter_opt_in          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_opted_in_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS newsletter_unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS newsletter_source          TEXT,
  ADD COLUMN IF NOT EXISTS marketing_email_token      TEXT;

-- Backfill unique per-user token. Two concatenated gen_random_uuid() values
-- (dashes stripped) give 64 hex chars of entropy — URL-safe without needing
-- pgcrypto. gen_random_uuid is a Postgres 13+ built-in.
UPDATE public.users
SET marketing_email_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE marketing_email_token IS NULL;

-- Now enforce uniqueness (can't do until after backfill since it would fail on NULLs).
ALTER TABLE public.users
  ADD CONSTRAINT users_marketing_email_token_key UNIQUE (marketing_email_token);

-- Partial index for the main query path: active newsletter recipients.
CREATE INDEX IF NOT EXISTS idx_users_newsletter_active
  ON public.users (newsletter_opt_in)
  WHERE newsletter_opt_in = true AND newsletter_unsubscribed_at IS NULL;

COMMENT ON COLUMN public.users.newsletter_opt_in IS
  'Single source of truth for marketing email eligibility. true = may send, false = may not.';
COMMENT ON COLUMN public.users.newsletter_opted_in_at IS
  'When the user consented. GDPR audit requirement.';
COMMENT ON COLUMN public.users.newsletter_unsubscribed_at IS
  'When the user unsubscribed. Preserved indefinitely for compliance audit.';
COMMENT ON COLUMN public.users.newsletter_source IS
  'How consent was obtained: signup | settings-page | re-consent-<date>';
COMMENT ON COLUMN public.users.marketing_email_token IS
  'Stable URL-safe secret for one-click unsubscribe links. Never rotate except on user request.';
