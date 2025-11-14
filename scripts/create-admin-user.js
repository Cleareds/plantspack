#!/usr/bin/env node

/**
 * Create Admin User Script
 * Creates an admin user with email: hello@cleareds.com
 *
 * Usage: node scripts/create-admin-user.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ADMIN_EMAIL = 'hello@cleareds.com';
const ADMIN_PASSWORD = 'Admin2024!SecurePlantsPack';
const ADMIN_USERNAME = 'admin';

async function createAdminUser() {
  console.log('🚀 Creating admin user...\n');

  try {
    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', ADMIN_EMAIL);

    if (checkError) {
      console.error('❌ Error checking existing users:', checkError);
      return;
    }

    if (existingUsers && existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.role === 'admin') {
        console.log('✅ Admin user already exists!');
        console.log(`📧 Email: ${ADMIN_EMAIL}`);
        console.log(`👤 User ID: ${existingUser.id}`);
        console.log('\n⚠️  If you forgot the password, reset it in Supabase Dashboard');
        return;
      } else {
        // User exists but is not admin - promote them
        console.log('👤 User exists, promoting to admin...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Error promoting user to admin:', updateError);
          return;
        }

        console.log('✅ User promoted to admin successfully!');
        console.log(`📧 Email: ${ADMIN_EMAIL}`);
        console.log(`👤 User ID: ${existingUser.id}`);
        return;
      }
    }

    // Create new user
    console.log('Creating new admin user...');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: ADMIN_USERNAME,
        first_name: 'Admin',
        last_name: 'User'
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError);
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Create profile in users table
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: ADMIN_EMAIL,
        username: ADMIN_USERNAME,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        bio: 'Platform Administrator',
        avatar_url: null
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return;
    }

    console.log('✅ Profile created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email:    ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    console.log(`👤 Username: ${ADMIN_USERNAME}`);
    console.log(`🆔 User ID:  ${authData.user.id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('🔗 Access admin dashboard at: /admin');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
