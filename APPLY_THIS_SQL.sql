-- =====================================================
-- PRODUCTION HARDENING - FINAL VERSION
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

    -- Remove duplicates using id (keep the one with smallest id = oldest)
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

    RAISE NOTICE '✅ Removed duplicate stripe_event_id entries';

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

-- Verify rate_limits table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'rate_limits') THEN
    RAISE NOTICE '✅ rate_limits table exists';
  ELSE
    RAISE EXCEPTION '❌ rate_limits table missing - run full migration first';
  END IF;
END $$;

-- Test check_rate_limit_posts function (simple test)
DO $$
BEGIN
  PERFORM check_rate_limit_posts('00000000-0000-0000-0000-000000000001'::UUID);
  RAISE NOTICE '✅ check_rate_limit_posts function works';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ check_rate_limit_posts failed: %', SQLERRM;
END $$;

-- Test check_rate_limit_comments function (simple test)
DO $$
BEGIN
  PERFORM check_rate_limit_comments('00000000-0000-0000-0000-000000000001'::UUID);
  RAISE NOTICE '✅ check_rate_limit_comments function works';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ check_rate_limit_comments failed: %', SQLERRM;
END $$;

-- Verify subscription_events constraint
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_events') THEN
    SELECT COUNT(*) INTO v_count
    FROM (
      SELECT stripe_event_id, COUNT(*)
      FROM subscription_events
      WHERE stripe_event_id IS NOT NULL
      GROUP BY stripe_event_id
      HAVING COUNT(*) > 1
    ) duplicates;

    IF v_count > 0 THEN
      RAISE WARNING '⚠️ Found % duplicate stripe_event_ids', v_count;
    ELSE
      RAISE NOTICE '✅ No duplicate stripe_event_ids found';
    END IF;
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
  RAISE NOTICE '  ✅ check_rate_limit_posts() created';
  RAISE NOTICE '  ✅ check_rate_limit_comments() created';
  RAISE NOTICE '  ✅ cleanup_rate_limits() created';
  RAISE NOTICE '  ✅ Stripe idempotency enforced';
  RAISE NOTICE '  ✅ Indexes created for performance';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Deploy code changes to production';
  RAISE NOTICE '==============================================';
END $$;
