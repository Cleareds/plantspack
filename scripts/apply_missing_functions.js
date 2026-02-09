#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SQL = `
-- Create missing check_rate_limit_comments function
CREATE OR REPLACE FUNCTION check_rate_limit_comments(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 30 comments per hour
  RETURN check_rate_limit(
    p_user_id::TEXT,
    'comment_creation',
    30,
    3600
  );
END;
$$;

-- Create cleanup function if missing
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_end < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
`

async function applySQL() {
  console.log('Applying missing functions via Supabase SQL Editor...\n')
  console.log('Please execute this SQL in your Supabase Dashboard:\n')
  console.log('=' + '='.repeat(60))
  console.log(SQL)
  console.log('=' + '='.repeat(60))
  console.log('\nOR: Copy and paste into Supabase SQL Editor manually')
}

applySQL()
