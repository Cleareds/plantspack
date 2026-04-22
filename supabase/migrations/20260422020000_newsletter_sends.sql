-- Newsletter send log: one row per (user, campaign) to prevent double-sends
-- and to support open/click tracking + compliance queries later.

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign TEXT NOT NULL,           -- e.g. 'weekly-2026-W17' or 're-consent-2026-04-22'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_to TEXT NOT NULL,           -- snapshot of the address at send time
  resend_message_id TEXT,           -- Resend's per-send ID for tracing
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  UNIQUE (user_id, campaign)        -- idempotency guard — retries won't duplicate
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_user_id ON public.newsletter_sends (user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign ON public.newsletter_sends (campaign);

ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

-- Only the service role writes + reads this table. No user-facing access needed.
-- The anon and authenticated roles get nothing (no policies = deny-by-default).

COMMENT ON TABLE public.newsletter_sends IS
  'Audit log of every marketing email sent. UNIQUE(user_id, campaign) prevents double-sends; service-role only (no public policies).';
