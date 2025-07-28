-- Enhanced Post Metadata Migration
-- Adds rich metadata collection for intelligent feed algorithms

-- Add metadata columns to existing posts table
ALTER TABLE public.posts 
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN location_city TEXT,
ADD COLUMN location_region TEXT,
ADD COLUMN place_id UUID REFERENCES public.places(id),
ADD COLUMN mood TEXT CHECK (mood IN ('positive', 'educational', 'question', 'celebration', 'neutral')),
ADD COLUMN content_type TEXT DEFAULT 'general' CHECK (content_type IN ('recipe', 'restaurant_review', 'lifestyle', 'activism', 'general', 'question')),
ADD COLUMN engagement_score REAL DEFAULT 0.0,
ADD COLUMN view_count INTEGER DEFAULT 0,
ADD COLUMN language TEXT DEFAULT 'en',
ADD COLUMN is_featured BOOLEAN DEFAULT false;

-- Create post analytics table for detailed tracking
CREATE TABLE public.post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'share', 'save', 'report')),
  duration_seconds INTEGER, -- For view events
  metadata JSONB DEFAULT '{}', -- Additional event-specific data
  user_agent TEXT, -- Browser/device info (anonymized)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX idx_posts_tags ON public.posts USING GIN (tags);
CREATE INDEX idx_posts_location_city ON public.posts (location_city);
CREATE INDEX idx_posts_content_type ON public.posts (content_type);
CREATE INDEX idx_posts_engagement_score ON public.posts (engagement_score DESC);
CREATE INDEX idx_posts_mood ON public.posts (mood);
CREATE INDEX idx_posts_created_at_engagement ON public.posts (created_at DESC, engagement_score DESC);
CREATE INDEX idx_post_analytics_post_id ON public.post_analytics (post_id);
CREATE INDEX idx_post_analytics_event_type ON public.post_analytics (event_type);
CREATE INDEX idx_post_analytics_created_at ON public.post_analytics (created_at DESC);

-- Create function to update engagement score based on interactions
CREATE OR REPLACE FUNCTION calculate_engagement_score(post_uuid UUID)
RETURNS REAL AS $$
DECLARE
  like_count INTEGER := 0;
  comment_count INTEGER := 0;
  view_count INTEGER := 0;
  share_count INTEGER := 0;
  hours_since_created REAL := 0;
  engagement_score REAL := 0;
BEGIN
  -- Get basic metrics
  SELECT COUNT(*) INTO like_count FROM public.post_likes WHERE post_id = post_uuid;
  SELECT COUNT(*) INTO comment_count FROM public.comments WHERE post_id = post_uuid;
  SELECT COUNT(*) INTO view_count FROM public.post_analytics 
    WHERE post_id = post_uuid AND event_type = 'view';
  SELECT COUNT(*) INTO share_count FROM public.post_analytics 
    WHERE post_id = post_uuid AND event_type = 'share';
  
  -- Calculate hours since creation
  SELECT EXTRACT(EPOCH FROM (now() - created_at)) / 3600 INTO hours_since_created
    FROM public.posts WHERE id = post_uuid;
  
  -- Calculate engagement score with time decay
  -- Formula: (likes * 3 + comments * 5 + shares * 4 + views * 0.1) / (1 + hours_since_created * 0.1)
  engagement_score := (like_count * 3.0 + comment_count * 5.0 + share_count * 4.0 + view_count * 0.1) 
                     / (1.0 + hours_since_created * 0.1);
  
  -- Update the post with new engagement score
  UPDATE public.posts SET engagement_score = engagement_score WHERE id = post_uuid;
  
  RETURN engagement_score;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update engagement score when likes/comments change
CREATE OR REPLACE FUNCTION update_post_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Update engagement score for the affected post
  PERFORM calculate_engagement_score(
    CASE 
      WHEN TG_TABLE_NAME = 'post_likes' THEN COALESCE(NEW.post_id, OLD.post_id)
      WHEN TG_TABLE_NAME = 'comments' THEN COALESCE(NEW.post_id, OLD.post_id)
      WHEN TG_TABLE_NAME = 'post_analytics' THEN COALESCE(NEW.post_id, OLD.post_id)
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_engagement_on_like
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_engagement_score();

CREATE TRIGGER update_engagement_on_comment
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_post_engagement_score();

CREATE TRIGGER update_engagement_on_analytics
  AFTER INSERT ON public.post_analytics
  FOR EACH ROW EXECUTE FUNCTION update_post_engagement_score();

-- RLS Policies for post_analytics
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analytics data
CREATE POLICY "Users can view own analytics" ON public.post_analytics
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own analytics events
CREATE POLICY "Users can insert own analytics" ON public.post_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to extract tags from post content using simple keyword matching
CREATE OR REPLACE FUNCTION extract_content_tags(content_text TEXT)
RETURNS TEXT[] AS $$
DECLARE
  tags TEXT[] := '{}';
  content_lower TEXT := lower(content_text);
BEGIN
  -- Recipe-related tags
  IF content_lower ~* '\b(recipe|cook|bake|ingredient|dish|meal|food)\b' THEN
    tags := array_append(tags, 'recipe');
  END IF;
  
  -- Restaurant-related tags
  IF content_lower ~* '\b(restaurant|cafe|diner|eatery|menu|review)\b' THEN
    tags := array_append(tags, 'restaurant');
  END IF;
  
  -- Health-related tags
  IF content_lower ~* '\b(health|healthy|nutrition|vitamin|protein|fitness)\b' THEN
    tags := array_append(tags, 'health');
  END IF;
  
  -- Environment-related tags
  IF content_lower ~* '\b(environment|eco|sustainable|climate|planet|green)\b' THEN
    tags := array_append(tags, 'environment');
  END IF;
  
  -- Activism-related tags
  IF content_lower ~* '\b(activism|rights|ethical|justice|campaign|awareness)\b' THEN
    tags := array_append(tags, 'activism');
  END IF;
  
  -- Lifestyle tags
  IF content_lower ~* '\b(lifestyle|living|daily|routine|journey|experience)\b' THEN
    tags := array_append(tags, 'lifestyle');
  END IF;
  
  -- Community tags
  IF content_lower ~* '\b(community|group|meet|event|gathering|social)\b' THEN
    tags := array_append(tags, 'community');
  END IF;
  
  RETURN tags;
END;
$$ LANGUAGE plpgsql;

-- Update existing posts with auto-generated tags
UPDATE public.posts 
SET tags = extract_content_tags(content),
    content_type = CASE 
      WHEN lower(content) ~* '\b(recipe|cook|bake|ingredient)\b' THEN 'recipe'
      WHEN lower(content) ~* '\b(restaurant|cafe|review|menu)\b' THEN 'restaurant_review'
      WHEN lower(content) ~* '\b(activism|rights|ethical|justice)\b' THEN 'activism'
      WHEN lower(content) ~* '\b(lifestyle|living|journey)\b' THEN 'lifestyle'
      WHEN content LIKE '%?%' OR lower(content) ~* '\b(question|help|advice|how)\b' THEN 'question'
      ELSE 'general'
    END,
    mood = CASE 
      WHEN lower(content) ~* '\b(love|amazing|great|awesome|happy|excited|celebration)\b' THEN 'positive'
      WHEN lower(content) ~* '\b(learn|tip|advice|information|guide|tutorial)\b' THEN 'educational'
      WHEN content LIKE '%?%' OR lower(content) ~* '\b(question|help|advice|how)\b' THEN 'question'
      WHEN lower(content) ~* '\b(achievement|success|milestone|proud|accomplished)\b' THEN 'celebration'
      ELSE 'neutral'
    END;

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.post_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION extract_content_tags(TEXT) TO authenticated;