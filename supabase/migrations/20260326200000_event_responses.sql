-- Event responses: interested/going
CREATE TABLE IF NOT EXISTS event_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('interested', 'going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_event_responses_post ON event_responses(post_id);
CREATE INDEX idx_event_responses_user ON event_responses(user_id);

-- RLS
ALTER TABLE event_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event responses"
  ON event_responses FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own responses"
  ON event_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses"
  ON event_responses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own responses"
  ON event_responses FOR DELETE USING (auth.uid() = user_id);
