-- User Preferences System Migration
-- Adds comprehensive user preference tracking for personalized feeds

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Content interests (explicit preferences)
  interest_tags TEXT[] DEFAULT '{}', -- e.g., ['cooking', 'restaurants', 'activism', 'health']
  dietary_preferences TEXT[] DEFAULT '{}', -- e.g., ['raw_vegan', 'high_protein', 'budget_friendly']
  content_type_preferences JSONB DEFAULT '{"recipe": 1.0, "restaurant_review": 1.0, "lifestyle": 1.0, "activism": 1.0, "general": 1.0, "question": 1.0}',
  
  -- Geographic preferences
  prefer_local_content BOOLEAN DEFAULT true,
  location_radius_km INTEGER DEFAULT 50, -- Radius for "local" content
  preferred_locations TEXT[] DEFAULT '{}', -- Cities/regions of interest
  
  -- Feed behavior preferences
  feed_algorithm_preference TEXT DEFAULT 'relevancy' CHECK (feed_algorithm_preference IN ('relevancy', 'recent', 'popular')),
  show_friend_activity BOOLEAN DEFAULT true,
  mature_content_filter BOOLEAN DEFAULT false,
  
  -- Language and accessibility
  preferred_languages TEXT[] DEFAULT '{"en"}',
  accessibility_high_contrast BOOLEAN DEFAULT false,
  accessibility_large_text BOOLEAN DEFAULT false,
  
  -- Privacy preferences
  share_view_analytics BOOLEAN DEFAULT true,
  share_interaction_data BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create user interaction patterns table (implicit preferences)
CREATE TABLE public.user_interaction_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Content interaction scores (learned from behavior)
  tag_affinity_scores JSONB DEFAULT '{}', -- {"recipe": 0.8, "restaurant": 0.3, ...}
  content_type_scores JSONB DEFAULT '{}', -- Engagement scores by content type
  author_affinity_scores JSONB DEFAULT '{}', -- Which authors user engages with most
  
  -- Temporal patterns
  active_hours INTEGER[] DEFAULT '{}', -- Hours when user is most active (0-23)
  preferred_post_length TEXT DEFAULT 'medium' CHECK (preferred_post_length IN ('short', 'medium', 'long')),
  
  -- Social patterns
  network_similarity_score REAL DEFAULT 0.5, -- How similar user's interests are to their network
  discovery_openness REAL DEFAULT 0.7, -- How open user is to new content (0-1)
  
  -- Calculated metrics
  engagement_velocity REAL DEFAULT 1.0, -- How quickly user typically engages with new content
  session_duration_avg INTEGER DEFAULT 300, -- Average session length in seconds
  
  -- Update tracking
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  calculation_version INTEGER DEFAULT 1
);

-- Create indexes for performance
CREATE UNIQUE INDEX idx_user_preferences_user_id ON public.user_preferences (user_id);
CREATE UNIQUE INDEX idx_user_interaction_patterns_user_id ON public.user_interaction_patterns (user_id);
CREATE INDEX idx_user_preferences_interest_tags ON public.user_preferences USING GIN (interest_tags);
CREATE INDEX idx_user_preferences_location ON public.user_preferences USING GIN (preferred_locations);
CREATE INDEX idx_user_interaction_patterns_last_calculated ON public.user_interaction_patterns (last_calculated);

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default preferences for new user
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create default interaction patterns
  INSERT INTO public.user_interaction_patterns (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create preferences when user is created
CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_preferences();

-- Function to update user interaction patterns based on activity
CREATE OR REPLACE FUNCTION update_user_interaction_patterns(
  target_user_id UUID,
  interaction_type TEXT,
  content_tags TEXT[],
  content_type TEXT,
  author_id UUID DEFAULT NULL,
  interaction_strength REAL DEFAULT 1.0
)
RETURNS VOID AS $$
DECLARE
  current_patterns RECORD;
  updated_tag_scores JSONB := '{}';
  updated_content_scores JSONB := '{}';
  updated_author_scores JSONB := '{}';
  tag_name TEXT;
  decay_factor REAL := 0.95; -- How much to decay existing scores
  learning_rate REAL := 0.1; -- How much new interactions influence scores
BEGIN
  -- Get current patterns
  SELECT * INTO current_patterns 
  FROM public.user_interaction_patterns 
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    -- Create default patterns if they don't exist
    INSERT INTO public.user_interaction_patterns (user_id) VALUES (target_user_id);
    SELECT * INTO current_patterns 
    FROM public.user_interaction_patterns 
    WHERE user_id = target_user_id;
  END IF;
  
  -- Update tag affinity scores
  updated_tag_scores := current_patterns.tag_affinity_scores;
  FOREACH tag_name IN ARRAY content_tags
  LOOP
    updated_tag_scores := jsonb_set(
      updated_tag_scores,
      ARRAY[tag_name],
      to_jsonb(
        GREATEST(0, LEAST(1, 
          COALESCE((updated_tag_scores->tag_name)::REAL, 0.5) * decay_factor + 
          interaction_strength * learning_rate
        ))
      )
    );
  END LOOP;
  
  -- Update content type scores
  updated_content_scores := current_patterns.content_type_scores;
  updated_content_scores := jsonb_set(
    updated_content_scores,
    ARRAY[content_type],
    to_jsonb(
      GREATEST(0, LEAST(1,
        COALESCE((updated_content_scores->content_type)::REAL, 0.5) * decay_factor +
        interaction_strength * learning_rate
      ))
    )
  );
  
  -- Update author affinity scores if author provided
  IF author_id IS NOT NULL THEN
    updated_author_scores := current_patterns.author_affinity_scores;
    updated_author_scores := jsonb_set(
      updated_author_scores,
      ARRAY[author_id::TEXT],
      to_jsonb(
        GREATEST(0, LEAST(1,
          COALESCE((updated_author_scores->(author_id::TEXT))::REAL, 0.5) * decay_factor +
          interaction_strength * learning_rate
        ))
      )
    );
  END IF;
  
  -- Update the patterns
  UPDATE public.user_interaction_patterns
  SET 
    tag_affinity_scores = updated_tag_scores,
    content_type_scores = updated_content_scores,
    author_affinity_scores = COALESCE(updated_author_scores, author_affinity_scores),
    last_calculated = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's content preferences score for a post
CREATE OR REPLACE FUNCTION calculate_user_content_affinity(
  target_user_id UUID,
  post_tags TEXT[],
  post_content_type TEXT,
  post_author_id UUID
)
RETURNS REAL AS $$
DECLARE
  preferences RECORD;
  patterns RECORD;
  affinity_score REAL := 0.5; -- Base score
  tag_score REAL := 0;
  content_type_score REAL := 0;
  author_score REAL := 0;
  tag_name TEXT;
  tag_count INTEGER := 0;
BEGIN
  -- Get user preferences and patterns
  SELECT * INTO preferences FROM public.user_preferences WHERE user_id = target_user_id;
  SELECT * INTO patterns FROM public.user_interaction_patterns WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN 0.5; -- Default neutral score
  END IF;
  
  -- Calculate tag affinity (40% of score)
  IF post_tags IS NOT NULL AND array_length(post_tags, 1) > 0 THEN
    FOREACH tag_name IN ARRAY post_tags
    LOOP
      tag_score := tag_score + COALESCE((patterns.tag_affinity_scores->tag_name)::REAL, 0.5);
      tag_count := tag_count + 1;
    END LOOP;
    
    IF tag_count > 0 THEN
      tag_score := tag_score / tag_count;
    ELSE
      tag_score := 0.5;
    END IF;
  ELSE
    tag_score := 0.5;
  END IF;
  
  -- Calculate content type affinity (30% of score)
  content_type_score := COALESCE(
    (patterns.content_type_scores->post_content_type)::REAL, 
    (preferences.content_type_preferences->post_content_type)::REAL,
    0.5
  );
  
  -- Calculate author affinity (30% of score)
  author_score := COALESCE(
    (patterns.author_affinity_scores->(post_author_id::TEXT))::REAL,
    0.5
  );
  
  -- Combine scores with weights
  affinity_score := (tag_score * 0.4) + (content_type_score * 0.3) + (author_score * 0.3);
  
  -- Ensure score is between 0 and 1
  RETURN GREATEST(0, LEAST(1, affinity_score));
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interaction_patterns ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only view their own interaction patterns
CREATE POLICY "Users can view own patterns" ON public.user_interaction_patterns
  FOR SELECT USING (user_id = auth.uid());

-- System can update interaction patterns
CREATE POLICY "System can update patterns" ON public.user_interaction_patterns
  FOR UPDATE USING (true);

-- Create default preferences for existing users
INSERT INTO public.user_preferences (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_interaction_patterns (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT SELECT ON public.user_interaction_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_user_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_interaction_patterns(UUID, TEXT, TEXT[], TEXT, UUID, REAL) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_content_affinity(UUID, TEXT[], TEXT, UUID) TO authenticated;