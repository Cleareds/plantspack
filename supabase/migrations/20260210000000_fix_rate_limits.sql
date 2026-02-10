-- Fix rate_limits table and apply all production hardening
-- This fixes the IMMUTABLE function error and applies everything correctly

-- 1. Drop and recreate rate_limits table with correct structure
DROP TABLE IF EXISTS rate_limits CASCADE;

CREATE TABLE rate_limits (
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

-- Indexes WITHOUT predicates (no NOW() function)
CREATE INDEX idx_rate_limits_lookup
  ON rate_limits(identifier, action, window_end);

CREATE INDEX idx_rate_limits_window_end
  ON rate_limits(window_end);

-- 2. Drop existing functions first
DROP FUNCTION IF EXISTS check_rate_limit_posts(UUID);
DROP FUNCTION IF EXISTS check_rate_limit_comments(UUID);
DROP FUNCTION IF EXISTS cleanup_rate_limits();
DROP FUNCTION IF EXISTS check_rate_limit(TEXT, TEXT, INTEGER, INTEGER);

-- Create base rate limit function
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
  v_window_start := date_trunc('minute', NOW());
  v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

  INSERT INTO rate_limits (identifier, action, count, window_start, window_end)
  VALUES (p_identifier, p_action, 1, v_window_start, v_window_end)
  ON CONFLICT (identifier, action, window_start)
  DO UPDATE SET
    count = rate_limits.count + 1,
    updated_at = NOW()
  RETURNING id, count INTO v_limit_id, v_current_count;

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

-- 3. Create check_rate_limit_posts function
CREATE OR REPLACE FUNCTION check_rate_limit_posts(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN check_rate_limit(
    p_user_id::TEXT,
    'post_creation',
    10,
    3600
  );
END;
$$;

-- 4. Create check_rate_limit_comments function
CREATE OR REPLACE FUNCTION check_rate_limit_comments(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN check_rate_limit(
    p_user_id::TEXT,
    'comment_creation',
    30,
    3600
  );
END;
$$;

-- 5. Create cleanup function
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

-- 6. RLS policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. Stripe webhook idempotency
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_events') THEN
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

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'subscription_events_stripe_event_id_key'
    ) THEN
      ALTER TABLE subscription_events
        ADD CONSTRAINT subscription_events_stripe_event_id_key
        UNIQUE (stripe_event_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_subscription_events_stripe_event_id'
    ) THEN
      CREATE INDEX idx_subscription_events_stripe_event_id
        ON subscription_events(stripe_event_id);
    END IF;
  END IF;
END $$;
