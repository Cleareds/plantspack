-- Production Hardening Migration
-- 1. Rate limiting table and RPC
-- 2. Stripe webhook idempotency

-- =====================================================
-- 1. RATE LIMITING INFRASTRUCTURE
-- =====================================================

-- Create rate_limits table for durable rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(identifier, action, window_end)
  WHERE window_end > NOW();

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON rate_limits(window_end)
  WHERE window_end < NOW();

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_limit_id UUID;
BEGIN
  -- Calculate window boundaries
  v_window_start := date_trunc('minute', NOW());
  v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

  -- Try to get or create rate limit entry
  INSERT INTO rate_limits (identifier, action, count, window_start, window_end)
  VALUES (p_identifier, p_action, 1, v_window_start, v_window_end)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET
    count = rate_limits.count + 1,
    updated_at = NOW()
  RETURNING id, count INTO v_limit_id, v_current_count;

  -- Check if limit exceeded
  IF v_current_count > p_max_requests THEN
    RETURN json_build_object(
      'allowed', false,
      'current', v_current_count,
      'limit', p_max_requests,
      'reset_at', v_window_end,
      'retry_after', EXTRACT(EPOCH FROM (v_window_end - NOW()))::INTEGER
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'current', v_current_count,
    'limit', p_max_requests,
    'remaining', p_max_requests - v_current_count,
    'reset_at', v_window_end
  );
END;
$$;

-- Specific rate limit function for posts (called by CreatePost.tsx)
CREATE OR REPLACE FUNCTION check_rate_limit_posts(
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 10 posts per hour
  RETURN check_rate_limit(
    p_user_id::TEXT,
    'post_creation',
    10,
    3600
  );
END;
$$;

-- Specific rate limit function for comments
CREATE OR REPLACE FUNCTION check_rate_limit_comments(
  p_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 30 comments per hour
  RETURN check_rate_limit(
    p_user_id::TEXT,
    'comment_creation',
    30,
    3600
  );
END;
$$;

-- Cleanup function for old rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_end < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- RLS policies for rate_limits (admin only)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. STRIPE WEBHOOK IDEMPOTENCY
-- =====================================================

-- Add unique constraint on subscription_events.stripe_event_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_events') THEN
    -- Try to add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'subscription_events_stripe_event_id_key'
    ) THEN
      -- First, remove any duplicate entries (keep the one with smallest id = oldest)
      DELETE FROM subscription_events
      WHERE id IN (
        SELECT id
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY stripe_event_id ORDER BY id) AS rn
          FROM subscription_events
          WHERE stripe_event_id IS NOT NULL
        ) t
        WHERE t.rn > 1
      );

      -- Now add the unique constraint
      ALTER TABLE subscription_events
        ADD CONSTRAINT subscription_events_stripe_event_id_key
        UNIQUE (stripe_event_id);

      RAISE NOTICE 'Added unique constraint on subscription_events.stripe_event_id';
    END IF;
  ELSE
    RAISE NOTICE 'Table subscription_events does not exist, skipping unique constraint';
  END IF;
END $$;

-- Create index on stripe_event_id for fast lookups
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_events') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_subscription_events_stripe_event_id'
    ) THEN
      CREATE INDEX idx_subscription_events_stripe_event_id
        ON subscription_events(stripe_event_id);
      RAISE NOTICE 'Created index on subscription_events.stripe_event_id';
    END IF;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify rate limit functions exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit_posts'
  ) THEN
    RAISE EXCEPTION 'Rate limit function check_rate_limit_posts not created!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit_comments'
  ) THEN
    RAISE EXCEPTION 'Rate limit function check_rate_limit_comments not created!';
  END IF;

  RAISE NOTICE '✅ Production hardening migration completed successfully';
END $$;
