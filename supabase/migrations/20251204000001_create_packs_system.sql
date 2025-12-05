-- ============================================
-- PACKS SYSTEM - Core Tables and Policies
-- Created: 2025-12-04
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PACKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,

  -- Social links
  website_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,

  -- Metadata
  category TEXT, -- recipes, places, products, resources, lifestyle
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT title_length CHECK (char_length(title) >= 3 AND char_length(title) <= 100),
  CONSTRAINT description_length CHECK (char_length(description) <= 500)
);

-- ============================================
-- PACK MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.pack_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- admin, moderator, member
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(pack_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'moderator', 'member'))
);

-- ============================================
-- PACK POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.pack_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  added_by_user_id UUID NOT NULL REFERENCES public.users(id),

  -- Organization
  position INTEGER DEFAULT 0,
  section_name TEXT, -- for future: "Appetizers", "Mains", etc.
  is_pinned BOOLEAN DEFAULT false,

  -- Timestamp
  added_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(pack_id, post_id)
);

-- ============================================
-- PACK FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.pack_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(pack_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Packs indexes
CREATE INDEX IF NOT EXISTS idx_packs_creator ON public.packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_packs_category ON public.packs(category);
CREATE INDEX IF NOT EXISTS idx_packs_published ON public.packs(is_published);
CREATE INDEX IF NOT EXISTS idx_packs_created ON public.packs(created_at DESC);

-- Pack members indexes
CREATE INDEX IF NOT EXISTS idx_pack_members_pack ON public.pack_members(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_members_user ON public.pack_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pack_members_role ON public.pack_members(pack_id, role);

-- Pack posts indexes
CREATE INDEX IF NOT EXISTS idx_pack_posts_pack ON public.pack_posts(pack_id, position);
CREATE INDEX IF NOT EXISTS idx_pack_posts_post ON public.pack_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_pack_posts_pinned ON public.pack_posts(pack_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_pack_posts_added_at ON public.pack_posts(added_at DESC);

-- Pack follows indexes
CREATE INDEX IF NOT EXISTS idx_pack_follows_pack ON public.pack_follows(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_follows_user ON public.pack_follows(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update pack updated_at timestamp
CREATE OR REPLACE FUNCTION update_pack_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create admin membership when pack is created
CREATE OR REPLACE FUNCTION create_pack_admin_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pack_members (pack_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Increment pack view count
CREATE OR REPLACE FUNCTION increment_pack_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.packs
  SET view_count = view_count + 1
  WHERE id = NEW.pack_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update pack updated_at
DROP TRIGGER IF EXISTS packs_updated_at_trigger ON public.packs;
CREATE TRIGGER packs_updated_at_trigger
  BEFORE UPDATE ON public.packs
  FOR EACH ROW
  EXECUTE FUNCTION update_pack_updated_at();

-- Trigger to create admin membership automatically
DROP TRIGGER IF EXISTS create_pack_admin_trigger ON public.packs;
CREATE TRIGGER create_pack_admin_trigger
  AFTER INSERT ON public.packs
  FOR EACH ROW
  EXECUTE FUNCTION create_pack_admin_membership();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_follows ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PACKS POLICIES
-- ============================================

-- Anyone can view published packs, creators can view their own unpublished packs
DROP POLICY IF EXISTS "packs_select_policy" ON public.packs;
CREATE POLICY "packs_select_policy" ON public.packs
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR creator_id = auth.uid()
  );

-- Users can create their own packs (tier limit checked in API)
DROP POLICY IF EXISTS "packs_insert_policy" ON public.packs;
CREATE POLICY "packs_insert_policy" ON public.packs
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

-- Users can update their own packs
DROP POLICY IF EXISTS "packs_update_policy" ON public.packs;
CREATE POLICY "packs_update_policy" ON public.packs
  FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Users can delete their own packs
DROP POLICY IF EXISTS "packs_delete_policy" ON public.packs;
CREATE POLICY "packs_delete_policy" ON public.packs
  FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- ============================================
-- PACK MEMBERS POLICIES
-- ============================================

-- Anyone can view members of published packs
DROP POLICY IF EXISTS "pack_members_select_policy" ON public.pack_members;
CREATE POLICY "pack_members_select_policy" ON public.pack_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.packs
      WHERE packs.id = pack_members.pack_id
      AND (packs.is_published = true OR packs.creator_id = auth.uid())
    )
  );

-- Users can join packs as members (role must be 'member')
DROP POLICY IF EXISTS "pack_members_insert_policy" ON public.pack_members;
CREATE POLICY "pack_members_insert_policy" ON public.pack_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
  );

-- Pack admins can add moderators
DROP POLICY IF EXISTS "pack_members_admin_insert_policy" ON public.pack_members;
CREATE POLICY "pack_members_admin_insert_policy" ON public.pack_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_members.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- Users can leave packs (delete their own membership)
DROP POLICY IF EXISTS "pack_members_delete_policy" ON public.pack_members;
CREATE POLICY "pack_members_delete_policy" ON public.pack_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_members.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
    )
  );

-- ============================================
-- PACK POSTS POLICIES
-- ============================================

-- Anyone can view posts in published packs
DROP POLICY IF EXISTS "pack_posts_select_policy" ON public.pack_posts;
CREATE POLICY "pack_posts_select_policy" ON public.pack_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.packs
      WHERE packs.id = pack_posts.pack_id
      AND (packs.is_published = true OR packs.creator_id = auth.uid())
    )
  );

-- Admins and moderators can add posts
DROP POLICY IF EXISTS "pack_posts_insert_policy" ON public.pack_posts;
CREATE POLICY "pack_posts_insert_policy" ON public.pack_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_posts.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'moderator')
    )
  );

-- Admins and moderators can update posts (reorder, pin, etc.)
DROP POLICY IF EXISTS "pack_posts_update_policy" ON public.pack_posts;
CREATE POLICY "pack_posts_update_policy" ON public.pack_posts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_posts.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'moderator')
    )
  );

-- Admins and moderators can remove posts
DROP POLICY IF EXISTS "pack_posts_delete_policy" ON public.pack_posts;
CREATE POLICY "pack_posts_delete_policy" ON public.pack_posts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pack_members pm
      WHERE pm.pack_id = pack_posts.pack_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- PACK FOLLOWS POLICIES
-- ============================================

-- Anyone can view follows
DROP POLICY IF EXISTS "pack_follows_select_policy" ON public.pack_follows;
CREATE POLICY "pack_follows_select_policy" ON public.pack_follows
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can follow packs
DROP POLICY IF EXISTS "pack_follows_insert_policy" ON public.pack_follows;
CREATE POLICY "pack_follows_insert_policy" ON public.pack_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can unfollow packs
DROP POLICY IF EXISTS "pack_follows_delete_policy" ON public.pack_follows;
CREATE POLICY "pack_follows_delete_policy" ON public.pack_follows
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.packs IS 'Curated collections of posts created by users';
COMMENT ON TABLE public.pack_members IS 'Pack membership with roles (admin, moderator, member)';
COMMENT ON TABLE public.pack_posts IS 'Posts curated into packs with ordering and organization';
COMMENT ON TABLE public.pack_follows IS 'Users following packs for notifications';

COMMENT ON COLUMN public.packs.category IS 'recipes, places, products, resources, lifestyle';
COMMENT ON COLUMN public.pack_members.role IS 'admin (creator), moderator (can add posts), member (can view)';
COMMENT ON COLUMN public.pack_posts.position IS 'For custom ordering of posts within pack';
COMMENT ON COLUMN public.pack_posts.is_pinned IS 'Pinned posts appear at top of pack';
