-- User followed cities for score tracking
CREATE TABLE IF NOT EXISTS user_followed_cities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  last_seen_score INTEGER,
  last_seen_grade TEXT,
  last_visited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, city, country)
);

CREATE INDEX IF NOT EXISTS idx_followed_cities_user ON user_followed_cities(user_id);

ALTER TABLE user_followed_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY followed_cities_select ON user_followed_cities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY followed_cities_insert ON user_followed_cities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY followed_cities_delete ON user_followed_cities
  FOR DELETE USING (auth.uid() = user_id);
