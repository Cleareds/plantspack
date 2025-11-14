-- ============================================
-- CREATE ADMIN USER
-- Email: hello@cleareds.com
-- Password: Admin2024!SecurePlantsPack
-- ============================================

-- This creates an admin user in Supabase Auth
-- You'll need to run this in Supabase SQL Editor

-- Insert into auth.users (Supabase Auth table)
-- Note: This approach creates a user directly in the auth schema
-- The password will be: Admin2024!SecurePlantsPack

DO $$
DECLARE
  admin_user_id UUID;
  admin_email TEXT := 'hello@cleareds.com';
  admin_username TEXT := 'admin';
BEGIN
  -- Check if admin user already exists in public.users
  SELECT id INTO admin_user_id
  FROM public.users
  WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    -- User doesn't exist in public.users
    -- We need to create them via Supabase Auth first
    -- This part should be done via Supabase Dashboard or API
    RAISE NOTICE 'Admin user not found. Please create user with email % via Supabase Dashboard first.', admin_email;
    RAISE NOTICE 'Then run this script again to promote to admin.';
  ELSE
    -- User exists, promote to admin
    UPDATE public.users
    SET role = 'admin'
    WHERE id = admin_user_id;

    RAISE NOTICE 'User % promoted to admin successfully!', admin_email;
  END IF;
END $$;

-- Alternative: If you want to create the user programmatically via API,
-- use this Node.js script (run separately):
/*

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'hello@cleareds.com',
    password: 'Admin2024!SecurePlantsPack',
    email_confirm: true,
    user_metadata: {
      username: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    return;
  }

  console.log('Auth user created:', authData.user.id);

  // 2. Create/update profile
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      email: 'hello@cleareds.com',
      username: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      bio: 'Platform Administrator'
    });

  if (profileError) {
    console.error('Error creating profile:', profileError);
    return;
  }

  console.log('Admin user created successfully!');
  console.log('Email: hello@cleareds.com');
  console.log('Password: Admin2024!SecurePlantsPack');
}

createAdminUser();

*/

-- MANUAL STEPS:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Email: hello@cleareds.com
-- 4. Password: Admin2024!SecurePlantsPack
-- 5. Auto Confirm User: YES
-- 6. Then run this SQL to promote to admin:

/*
UPDATE public.users
SET role = 'admin'
WHERE email = 'hello@cleareds.com';
*/

-- Verify admin user
SELECT
  id,
  email,
  username,
  role,
  created_at
FROM public.users
WHERE email = 'hello@cleareds.com';
