-- Place corrections: users suggest edits, admins approve
CREATE TABLE IF NOT EXISTS place_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  corrections JSONB NOT NULL,
  note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_corrections_status ON place_corrections(status);
CREATE INDEX IF NOT EXISTS idx_place_corrections_place ON place_corrections(place_id);

ALTER TABLE place_corrections ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert
CREATE POLICY place_corrections_insert ON place_corrections
  FOR INSERT WITH CHECK (true);

-- Users can read their own
CREATE POLICY place_corrections_read_own ON place_corrections
  FOR SELECT USING (auth.uid() = user_id);

-- Service role handles admin operations
