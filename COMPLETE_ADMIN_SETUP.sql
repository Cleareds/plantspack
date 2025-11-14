-- ============================================
-- COMPLETE ADMIN SYSTEM SETUP - ALL IN ONE
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================
--
-- This script:
-- 1. Creates all admin/moderation tables
-- 2. Adds admin columns to users table
-- 3. Creates helper functions
-- 4. Sets up RLS policies
-- 5. Creates admin user (hello@cleareds.com / Admin2024!SecurePlantsPack)
--
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- ============================================

-- PART 1: ADMIN SYSTEM TABLES AND COLUMNS
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
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON public.admin_logs(resource_type, resource_id);

-- Update contact_submissions table (already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN user_id UUID REFERENCES public.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN reviewed_by UUID REFERENCES public.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions' AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.contact_submissions ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON public.contact_submissions(user_id);

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('post', 'comment', 'user', 'place')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'violence', 'misinformation',
    'nsfw', 'off_topic', 'copyright', 'other'
  )),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_type_id ON public.reports(reported_type, reported_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_active
ON public.reports(reporter_id, reported_type, reported_id, status)
WHERE status IN ('pending', 'reviewing');

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- Create user_mutes table
CREATE TABLE IF NOT EXISTS public.user_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(muter_id, muted_id),
  CHECK (muter_id != muted_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON public.user_mutes(muter_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muted ON public.user_mutes(muted_id);

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action_time
ON public.rate_limits(user_id, action_type, created_at DESC);

-- ============================================
-- PART 2: ENABLE RLS
-- ============================================

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_muted(p_muter_id UUID, p_muted_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_mutes
    WHERE muter_id = p_muter_id AND muted_id = p_muted_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION log_rate_limit(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (p_user_id, p_action_type);

  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: RLS POLICIES
-- ============================================

-- Admin logs policies
DROP POLICY IF EXISTS "admin_logs_admin_view" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_view" ON public.admin_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "admin_logs_admin_insert" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_insert" ON public.admin_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Contact submissions policies
DROP POLICY IF EXISTS "contact_submissions_insert" ON public.contact_submissions;
CREATE POLICY "contact_submissions_insert" ON public.contact_submissions
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_submissions_admin_view" ON public.contact_submissions;
CREATE POLICY "contact_submissions_admin_view" ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "contact_submissions_admin_update" ON public.contact_submissions;
CREATE POLICY "contact_submissions_admin_update" ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Reports policies
DROP POLICY IF EXISTS "reports_user_insert" ON public.reports;
CREATE POLICY "reports_user_insert" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_user_view_own" ON public.reports;
CREATE POLICY "reports_user_view_own" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_admin_view_all" ON public.reports;
CREATE POLICY "reports_admin_view_all" ON public.reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- User blocks policies
DROP POLICY IF EXISTS "user_blocks_manage" ON public.user_blocks;
CREATE POLICY "user_blocks_manage" ON public.user_blocks
  FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- User mutes policies
DROP POLICY IF EXISTS "user_mutes_manage" ON public.user_mutes;
CREATE POLICY "user_mutes_manage" ON public.user_mutes
  FOR ALL TO authenticated
  USING (auth.uid() = muter_id)
  WITH CHECK (auth.uid() = muter_id);

-- Rate limits policies
DROP POLICY IF EXISTS "rate_limits_system" ON public.rate_limits;
CREATE POLICY "rate_limits_system" ON public.rate_limits
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 5: UPDATE POSTS POLICY
-- ============================================

DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "posts_select_with_blocks" ON public.posts;
DROP POLICY IF EXISTS "posts_select_basic" ON public.posts;

-- Create posts policy with block filtering
DO $$
DECLARE
  has_deleted_at BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'deleted_at'
  ) INTO has_deleted_at;

  IF has_deleted_at THEN
    CREATE POLICY "posts_select_with_blocks" ON public.posts
      FOR SELECT TO authenticated
      USING (
        deleted_at IS NULL
        AND (
          privacy = 'public'
          OR posts.user_id = auth.uid()
          OR (
            privacy = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.follows
              WHERE follows.follower_id = auth.uid()
              AND follows.following_id = posts.user_id
            )
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub1
          WHERE ub1.blocker_id = auth.uid()
          AND ub1.blocked_id = posts.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub2
          WHERE ub2.blocker_id = posts.user_id
          AND ub2.blocked_id = auth.uid()
        )
      );
  ELSE
    CREATE POLICY "posts_select_with_blocks" ON public.posts
      FOR SELECT TO authenticated
      USING (
        (
          privacy = 'public'
          OR posts.user_id = auth.uid()
          OR (
            privacy = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.follows
              WHERE follows.follower_id = auth.uid()
              AND follows.following_id = posts.user_id
            )
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub1
          WHERE ub1.blocker_id = auth.uid()
          AND ub1.blocked_id = posts.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub2
          WHERE ub2.blocker_id = posts.user_id
          AND ub2.blocked_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- PART 6: GRANTS
-- ============================================

GRANT SELECT, INSERT ON public.admin_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_submissions TO authenticated;
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
-- PART 7: CREATE ADMIN USER
-- ============================================

DO $$
DECLARE
  admin_user_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Generate UUID for admin user
  admin_user_id := gen_random_uuid();

  -- Hash password using crypt (password: Admin2024!SecurePlantsPack)
  encrypted_password := crypt('Admin2024!SecurePlantsPack', gen_salt('bf'));

  -- Insert into auth.users table
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_user_id,
    'authenticated',
    'authenticated',
    'hello@cleareds.com',
    encrypted_password,
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{"username":"admin","first_name":"Admin","last_name":"User"}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into auth.identities table (only if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities
    WHERE user_id = admin_user_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      format('{"sub":"%s","email":"hello@cleareds.com"}', admin_user_id)::jsonb,
      'email',
      admin_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    email,
    username,
    role,
    bio,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'hello@cleareds.com',
    'admin',
    'admin',
    'Platform Administrator',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      username = 'admin',
      bio = 'Platform Administrator';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'ADMIN SYSTEM SETUP COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Admin user created successfully!';
  RAISE NOTICE 'Email: hello@cleareds.com';
  RAISE NOTICE 'Password: Admin2024!SecurePlantsPack';
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Start dev server: npm run dev';
  RAISE NOTICE '2. Login with the credentials above';
  RAISE NOTICE '3. Visit: http://localhost:3000/admin';
  RAISE NOTICE '============================================';
END $$;
