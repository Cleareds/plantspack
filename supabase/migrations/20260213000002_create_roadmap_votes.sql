-- Create roadmap_votes table
CREATE TABLE IF NOT EXISTS public.roadmap_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL CHECK (feature_id IN (
    'ios-app',
    'android-app',
    'better-packs',
    'internal-messaging',
    'fixes-stability',
    'remove-ai',
    'improve-ai',
    'improve-notifications'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX idx_roadmap_votes_user ON public.roadmap_votes(user_id);
CREATE INDEX idx_roadmap_votes_feature ON public.roadmap_votes(feature_id);
CREATE INDEX idx_roadmap_votes_created ON public.roadmap_votes(created_at DESC);

-- RLS Policies
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes
CREATE POLICY "Roadmap votes are publicly readable"
  ON public.roadmap_votes
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users with Support or Premium can insert votes
CREATE POLICY "Support and Premium users can vote"
  ON public.roadmap_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.subscription_tier IN ('medium', 'premium')
      AND users.is_banned = false
    )
  );

-- Users can only delete their own votes (if needed)
CREATE POLICY "Users can delete own votes"
  ON public.roadmap_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
