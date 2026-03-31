-- Recipe reviews table (mirrors place_reviews)
CREATE TABLE IF NOT EXISTS recipe_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  images text[] DEFAULT '{}',
  video_url text,
  deleted_at timestamptz,
  edited_at timestamptz,
  edit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- RLS
ALTER TABLE recipe_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipe reviews" ON recipe_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reviews" ON recipe_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON recipe_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own reviews" ON recipe_reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_recipe_reviews_post ON recipe_reviews(post_id);
CREATE INDEX idx_recipe_reviews_user ON recipe_reviews(user_id);
