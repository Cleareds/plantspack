-- Track non-Stripe donor sources (Buy Me a Coffee one-time donations,
-- direct transfers, etc.) without polluting the subscription_tier enum
-- which is tied to the Stripe subscription state machine.
--
-- subscription_tier stays 'free' for one-time donors so Stripe webhooks
-- can't accidentally overwrite their donor record. donor_source is the
-- separate signal that lets us include them on the supporters wall with
-- a different visual treatment.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS donor_source TEXT;

COMMENT ON COLUMN public.users.donor_source IS 'One-time donation source if applicable: bmc_one_time (Buy Me a Coffee), bank_transfer, etc. Independent of subscription_tier (which is Stripe-managed).';

-- Backfill: Valeriia (@tsu) donated via Buy Me a Coffee. We do not have a
-- BMC integration yet, so this is set manually. When we wire up BMC webhooks
-- later, the integration should populate this column automatically.
UPDATE public.users
SET donor_source = 'bmc_one_time'
WHERE username = 'tsu';
