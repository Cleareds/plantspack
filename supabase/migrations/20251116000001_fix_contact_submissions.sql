-- Ensure contact_submissions table exists with all required columns
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contact_submissions'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE contact_submissions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add reviewed_by if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contact_submissions'
        AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE contact_submissions ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add reviewed_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contact_submissions'
        AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE contact_submissions ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;

    -- Add admin_notes if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contact_submissions'
        AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE contact_submissions ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_reviewed_by ON contact_submissions(reviewed_by);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Service role can manage contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "contact_submissions_insert" ON contact_submissions;
DROP POLICY IF EXISTS "contact_submissions_admin_view" ON contact_submissions;
DROP POLICY IF EXISTS "contact_submissions_admin_update" ON contact_submissions;

-- Allow anyone to submit (including anonymous users)
CREATE POLICY "Anyone can insert contact submissions"
  ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Admin users can view all submissions
CREATE POLICY "Admins can view all contact submissions"
  ON contact_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admin users can update submissions
CREATE POLICY "Admins can update contact submissions"
  ON contact_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_contact_submissions_updated_at_trigger ON contact_submissions;
CREATE TRIGGER update_contact_submissions_updated_at_trigger
    BEFORE UPDATE ON contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_submissions_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT ON contact_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON contact_submissions TO authenticated;

