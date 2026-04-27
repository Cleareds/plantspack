-- Fix registration crash: create_default_user_preferences() fires as a trigger
-- on public.users INSERT but references user_interaction_patterns which was
-- never created in production (partial migration). Also, the function is not
-- SECURITY DEFINER, so even if the table existed it would fail when called
-- from a non-superuser context with RLS enabled.
--
-- This migration:
-- 1. Creates user_interaction_patterns if it doesn't exist
-- 2. Recreates the trigger function as SECURITY DEFINER

-- Create user_interaction_patterns if missing (partial previous migration)
CREATE TABLE IF NOT EXISTS public.user_interaction_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tag_affinity_scores JSONB DEFAULT '{}',
  content_type_scores JSONB DEFAULT '{}',
  author_affinity_scores JSONB DEFAULT '{}',
  active_hours INTEGER[] DEFAULT '{}',
  preferred_post_length TEXT DEFAULT 'medium' CHECK (preferred_post_length IN ('short', 'medium', 'long')),
  network_similarity_score REAL DEFAULT 0.5,
  discovery_openness REAL DEFAULT 0.7,
  engagement_velocity REAL DEFAULT 1.0,
  session_duration_avg INTEGER DEFAULT 300,
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  calculation_version INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_interaction_patterns_user_id
  ON public.user_interaction_patterns (user_id);

ALTER TABLE public.user_interaction_patterns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_interaction_patterns'
      AND policyname = 'Users can view own patterns'
  ) THEN
    CREATE POLICY "Users can view own patterns"
      ON public.user_interaction_patterns FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_interaction_patterns'
      AND policyname = 'Users can insert own patterns'
  ) THEN
    CREATE POLICY "Users can insert own patterns"
      ON public.user_interaction_patterns FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_interaction_patterns'
      AND policyname = 'System can update patterns'
  ) THEN
    CREATE POLICY "System can update patterns"
      ON public.user_interaction_patterns FOR UPDATE
      USING (true);
  END IF;
END $$;

GRANT SELECT, INSERT ON public.user_interaction_patterns TO authenticated;

-- Backfill rows for existing users who are missing them
INSERT INTO public.user_interaction_patterns (user_id)
SELECT id FROM public.users
WHERE id NOT IN (SELECT user_id FROM public.user_interaction_patterns)
ON CONFLICT (user_id) DO NOTHING;

-- Recreate the trigger function as SECURITY DEFINER so it bypasses RLS
-- regardless of the calling security context (email confirmation, API insert, etc.)
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_interaction_patterns (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
