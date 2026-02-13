-- Migration: Business Claim System
-- Creates tables for place ownership claims and verified owners

-- =====================================================
-- Table: place_claim_requests
-- Purpose: Track claim requests from users wanting to claim business ownership
-- =====================================================
CREATE TABLE IF NOT EXISTS public.place_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Claim form data
  first_name TEXT NOT NULL CHECK (char_length(first_name) >= 1 AND char_length(first_name) <= 100),
  last_name TEXT NOT NULL CHECK (char_length(last_name) >= 1 AND char_length(last_name) <= 100),
  email TEXT NOT NULL CHECK (char_length(email) <= 254 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  proof_description TEXT NOT NULL CHECK (char_length(proof_description) >= 10 AND char_length(proof_description) <= 1000),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Admin review metadata
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints: one active claim per user per place
  CONSTRAINT place_claim_requests_unique_user_place
    UNIQUE(place_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_place_claim_requests_place_id
  ON public.place_claim_requests(place_id);

CREATE INDEX IF NOT EXISTS idx_place_claim_requests_user_id
  ON public.place_claim_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_place_claim_requests_status
  ON public.place_claim_requests(status);

CREATE INDEX IF NOT EXISTS idx_place_claim_requests_created_at
  ON public.place_claim_requests(created_at DESC);

-- =====================================================
-- Table: place_owners
-- Purpose: Store verified business owners (one owner per place)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.place_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claim_request_id UUID REFERENCES public.place_claim_requests(id),

  -- Verification metadata
  verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  verified_by UUID NOT NULL REFERENCES public.users(id), -- Admin who approved

  -- Owner can be removed by admin (soft delete)
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES public.users(id),
  removal_reason TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraint: one owner per place (only one active owner)
  CONSTRAINT place_owners_unique_place
    UNIQUE(place_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_place_owners_place_id
  ON public.place_owners(place_id);

CREATE INDEX IF NOT EXISTS idx_place_owners_user_id
  ON public.place_owners(user_id);

CREATE INDEX IF NOT EXISTS idx_place_owners_active
  ON public.place_owners(place_id)
  WHERE removed_at IS NULL;

-- =====================================================
-- RLS Policies: place_claim_requests
-- =====================================================
ALTER TABLE public.place_claim_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "place_claim_requests_select_own"
  ON public.place_claim_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "place_claim_requests_select_admin"
  ON public.place_claim_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can create requests (with ban check)
CREATE POLICY "place_claim_requests_insert"
  ON public.place_claim_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = true
    )
  );

-- Only admins can update requests (for approval/rejection)
CREATE POLICY "place_claim_requests_update_admin"
  ON public.place_claim_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies: place_owners
-- =====================================================
ALTER TABLE public.place_owners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active owners (public information)
CREATE POLICY "place_owners_select_active"
  ON public.place_owners
  FOR SELECT
  USING (removed_at IS NULL);

-- Only admins can insert owners
CREATE POLICY "place_owners_insert_admin"
  ON public.place_owners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update owners
CREATE POLICY "place_owners_update_admin"
  ON public.place_owners
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get active owner for a place
CREATE OR REPLACE FUNCTION public.get_place_owner(p_place_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.first_name,
    u.last_name,
    u.avatar_url,
    po.verified_at
  FROM public.place_owners po
  JOIN public.users u ON u.id = po.user_id
  WHERE po.place_id = p_place_id
    AND po.removed_at IS NULL
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_place_owner(UUID) TO authenticated, anon;

-- Function to get all places owned by a user
CREATE OR REPLACE FUNCTION public.get_user_owned_places(p_user_id UUID)
RETURNS TABLE (
  place_id UUID,
  place_name TEXT,
  place_address TEXT,
  place_category TEXT,
  verified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address,
    p.category,
    po.verified_at
  FROM public.place_owners po
  JOIN public.places p ON p.id = po.place_id
  WHERE po.user_id = p_user_id
    AND po.removed_at IS NULL
  ORDER BY po.verified_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_owned_places(UUID) TO authenticated, anon;

-- Function to check if user has pending claim for a place
CREATE OR REPLACE FUNCTION public.check_user_claim_status(p_user_id UUID, p_place_id UUID)
RETURNS TABLE (
  has_claim BOOLEAN,
  claim_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  rejection_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as has_claim,
    pcr.id,
    pcr.status,
    pcr.created_at,
    pcr.rejection_reason
  FROM public.place_claim_requests pcr
  WHERE pcr.user_id = p_user_id
    AND pcr.place_id = p_place_id
  LIMIT 1;

  -- If no claim found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TEXT;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_user_claim_status(UUID, UUID) TO authenticated, anon;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_place_claim_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_place_claim_requests_updated_at
  BEFORE UPDATE ON public.place_claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_place_claim_requests_updated_at();
