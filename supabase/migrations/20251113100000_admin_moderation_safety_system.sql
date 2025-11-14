-- ============================================
-- COMPREHENSIVE ADMIN, MODERATION, AND SAFETY SYSTEM
-- This migration adds all infrastructure for:
-- - Admin roles and permissions
-- - Content reporting and moderation
-- - User blocking and muting
-- - Contact form storage
-- - Rate limiting tracking
-- ============================================

-- ============================================
-- 1. ADMIN SYSTEM
-- ============================================

-- Add role column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Add admin-related columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES public.users(id);

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- 'user', 'post', 'comment', 'place', 'report'
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin logs
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON public.admin_logs(resource_type, resource_id);

-- ============================================
-- 2. CONTACT FORMS STORAGE
-- ============================================

-- Note: contact_submissions table already exists, just add missing columns
DO $$
BEGIN
  -- Add user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN user_id UUID REFERENCES public.users(id);
  END IF;

  -- Add reviewed_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN reviewed_by UUID REFERENCES public.users(id);
  END IF;

  -- Add reviewed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  -- Add admin_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- Update status constraint to include admin values (if using different values)
-- Note: Keeping existing values ('new', 'in_progress', 'resolved', 'closed')
-- No need to change existing constraint

-- Indexes for contact submissions
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON public.contact_submissions(user_id);

-- ============================================
-- 3. REPORTS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('post', 'comment', 'user', 'place')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'misinformation',
    'nsfw',
    'off_topic',
    'copyright',
    'other'
  )),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_type_id ON public.reports(reported_type, reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- Prevent duplicate reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_active
ON public.reports(reporter_id, reported_type, reported_id, status)
WHERE status IN ('pending', 'reviewing');

-- ============================================
-- 4. USER BLOCKING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Indexes for blocks
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- ============================================
-- 5. USER MUTING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

-- Indexes for mutes
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON public.user_mutes(muter_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted ON public.user_mutes(muted_id);

-- ============================================
-- 6. RATE LIMITING TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'post_create', 'comment_create', 'report_create'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for rate limit checks (window-based queries)
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_time
ON public.rate_limits(user_id, action_type, created_at DESC);

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Admin logs: Only admins can view
CREATE POLICY "admin_logs_admin_view" ON public.admin_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_logs_admin_insert" ON public.admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Contact submissions: Users can insert, admins can view all
CREATE POLICY "contact_submissions_insert" ON public.contact_submissions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "contact_submissions_admin_view" ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "contact_submissions_admin_update" ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Reports: Users can create and view their own, admins can view all
CREATE POLICY "reports_user_insert" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_user_view_own" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE POLICY "reports_admin_view_all" ON public.reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- User blocks: Users can manage their own blocks
CREATE POLICY "user_blocks_manage" ON public.user_blocks
  FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- User mutes: Users can manage their own mutes
CREATE POLICY "user_mutes_manage" ON public.user_mutes
  FOR ALL TO authenticated
  USING (auth.uid() = muter_id)
  WITH CHECK (auth.uid() = muter_id);

-- Rate limits: System managed
CREATE POLICY "rate_limits_system" ON public.rate_limits
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is muted
CREATE OR REPLACE FUNCTION is_user_muted(p_muter_id UUID, p_muted_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_mutes
    WHERE muter_id = p_muter_id AND muted_id = p_muted_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_actions INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO action_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  RETURN action_count < p_max_actions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log rate limit action
CREATE OR REPLACE FUNCTION log_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (p_user_id, p_action_type);

  -- Clean up old entries (older than 1 day)
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. UPDATE EXISTING RLS POLICIES TO RESPECT BLOCKS
-- ============================================

-- Drop existing posts SELECT policy
DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "posts_select_with_blocks" ON public.posts;

-- Note: We'll create a basic policy here that works with the current schema
-- The block filtering can be added later once all migrations are applied
-- This prevents issues with column references and migration ordering

-- Create basic SELECT policy (will be enhanced later with block filtering)
CREATE POLICY "posts_select_basic" ON public.posts
  FOR SELECT TO authenticated
  USING (
    privacy = 'public'
    OR posts.user_id = auth.uid()
    OR (
      privacy = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid()
        AND following_id = posts.user_id
      )
    )
  );

-- ============================================
-- 10. GRANTS
-- ============================================

GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT SELECT, INSERT ON public.contact_submissions TO authenticated;
GRANT ALL ON public.reports TO authenticated;
GRANT ALL ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_mutes TO authenticated;
GRANT ALL ON public.rate_limits TO authenticated;

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_muted(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_rate_limit(UUID, TEXT) TO authenticated;

-- ============================================
-- 11. COMMENTS
-- ============================================

COMMENT ON TABLE public.admin_logs IS 'Audit trail of all admin actions';
COMMENT ON TABLE public.contact_submissions IS 'Contact form submissions from users';
COMMENT ON TABLE public.reports IS 'User reports for content moderation';
COMMENT ON TABLE public.user_blocks IS 'User blocking relationships - prevents all interaction';
COMMENT ON TABLE public.user_mutes IS 'User muting relationships - hides content without blocking';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting tracking for spam prevention';

COMMENT ON FUNCTION is_admin(UUID) IS 'Check if user has admin role';
COMMENT ON FUNCTION is_user_blocked(UUID, UUID) IS 'Check if user A has blocked user B';
COMMENT ON FUNCTION is_user_muted(UUID, UUID) IS 'Check if user A has muted user B';
COMMENT ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) IS 'Check if user has exceeded rate limit for action';
COMMENT ON FUNCTION log_rate_limit(UUID, TEXT) IS 'Log a rate-limited action';
