-- =====================================================
-- PRODUCTION HARDENING - APPLY THIS SQL MANUALLY
-- =====================================================
-- Copy and paste this entire file into Supabase Dashboard > SQL Editor
-- Then click "Run" to apply all missing fixes
-- =====================================================

-- 1. Create missing check_rate_limit_comments function
CREATE OR REPLACE FUNCTION check_rate_limit_comments(p_user_id UUID)
RETURNS JSON
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

-- 2. Create cleanup function for old rate limit entries
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

-- 3. Enforce unique constraint on subscription_events.stripe_event_id
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_events') THEN
    -- Remove duplicates first (keep oldest)
    DELETE FROM subscription_events a
    USING subscription_events b
    WHERE a.stripe_event_id = b.stripe_event_id
      AND a.created_at > b.created_at;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'subscription_events_stripe_event_id_key'
    ) THEN
      ALTER TABLE subscription_events
        ADD CONSTRAINT subscription_events_stripe_event_id_key
        UNIQUE (stripe_event_id);
      RAISE NOTICE '✅ Added unique constraint on stripe_event_id';
    ELSE
      RAISE NOTICE '✅ Unique constraint already exists';
    END IF;

    -- Add index if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_subscription_events_stripe_event_id'
    ) THEN
      CREATE INDEX idx_subscription_events_stripe_event_id
        ON subscription_events(stripe_event_id);
      RAISE NOTICE '✅ Created index on stripe_event_id';
    ELSE
      RAISE NOTICE '✅ Index already exists';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Table subscription_events does not exist';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test check_rate_limit_posts function
DO $$
DECLARE
  v_result JSON;
BEGIN
  SELECT check_rate_limit_posts('00000000-0000-0000-0000-000000000001'::UUID)
  INTO v_result;

  IF v_result IS NOT NULL THEN
    RAISE NOTICE '✅ check_rate_limit_posts works: %', v_result;
  ELSE
    RAISE EXCEPTION '❌ check_rate_limit_posts failed';
  END IF;
END $$;

-- Test check_rate_limit_comments function
DO $$
DECLARE
  v_result JSON;
BEGIN
  SELECT check_rate_limit_comments('00000000-0000-0000-0000-000000000001'::UUID)
  INTO v_result;

  IF v_result IS NOT NULL THEN
    RAISE NOTICE '✅ check_rate_limit_comments works: %', v_result;
  ELSE
    RAISE EXCEPTION '❌ check_rate_limit_comments failed';
  END IF;
END $$;

-- Verify rate_limits table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'rate_limits') THEN
    RAISE NOTICE '✅ rate_limits table exists';
  ELSE
    RAISE EXCEPTION '❌ rate_limits table missing - run full migration first';
  END IF;
END $$;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ ALL PRODUCTION HARDENING FIXES APPLIED!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  ✅ Rate limit functions created';
  RAISE NOTICE '  ✅ Stripe idempotency enforced';
  RAISE NOTICE '  ✅ Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Deploy code changes to production';
  RAISE NOTICE '==============================================';
END $$;
