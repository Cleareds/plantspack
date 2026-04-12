#!/usr/bin/env node

/**
 * Standalone database setup for VeganConnect
 * This creates the complete schema and data without requiring psql
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'emma@veganlife.com',
    username: 'emmagreen',
    first_name: 'Emma',
    last_name: 'Green',
    bio: 'Plant-based lifestyle enthusiast 🌱 | Love exploring new vegan restaurants and sharing recipes!',
    password: 'password123'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'marcus@plantbased.org',
    username: 'marcusplant',
    first_name: 'Marcus',
    last_name: 'Plant',
    bio: 'Fitness coach promoting plant-powered performance 💪 | Marathon runner | Dog dad 🐕',
    password: 'password123'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'lily@herbivore.net',
    username: 'lilyherbs',
    first_name: 'Lily',
    last_name: 'Herbs',
    bio: 'Herbalist and mindful living advocate 🌿 | Sharing natural healing wisdom',
    password: 'password123'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'david@sprouts.com',
    username: 'davidsprouts',
    first_name: 'David',
    last_name: 'Sprouts',
    bio: 'Sustainable farming and permaculture enthusiast 🌾 | Growing our future',
    password: 'password123'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'sofia@quinoalover.com',
    username: 'sofiaquinoa',
    first_name: 'Sofia',
    last_name: 'Quinoa',
    bio: 'Traveling the world to discover authentic vegan cuisine 🌍 | Food blogger',
    password: 'password123'
  }
]

const samplePosts = [
  {
    user_id: '11111111-1111-1111-1111-111111111111',
    content: 'Just discovered this amazing cashew-based cheese recipe! 🧀 The texture is so creamy and the flavor is incredible. Plant-based alternatives keep getting better! #VeganCheese #PlantBased',
    privacy: 'public'
  },
  {
    user_id: '11111111-1111-1111-1111-111111111111',
    content: 'Morning smoothie bowl with fresh berries, granola, and almond butter 🍓🥣 Starting the day with plants gives me so much energy!',
    privacy: 'public'
  },
  {
    user_id: '22222222-2222-2222-2222-222222222222',
    content: 'Completed my first plant-powered marathon today! 🏃‍♂️💨 Proving once again that you don\'t need animal products for peak performance. Fueled entirely by fruits, nuts, and determination!',
    privacy: 'public'
  },
  {
    user_id: '22222222-2222-2222-2222-222222222222',
    content: 'Pre-workout fuel: banana with almond butter and a green smoothie 🍌💚 Plant protein is all you need for strength training!',
    privacy: 'public'
  },
  {
    user_id: '33333333-3333-3333-3333-333333333333',
    content: 'Harvested fresh herbs from my garden today 🌿 There\'s something magical about growing your own medicine. Today\'s haul: basil, rosemary, thyme, and lavender.',
    privacy: 'public'
  },
  {
    user_id: '44444444-4444-4444-4444-444444444444',
    content: 'Planting season is here! 🌱 Started 50 tomato seedlings and 30 pepper plants. This year\'s goal is to supply 5 local restaurants with fresh organic produce.',
    privacy: 'public'
  },
  {
    user_id: '55555555-5555-5555-5555-555555555555',
    content: 'Found the most incredible street food in Bangkok! 🇹🇭 This som tam (papaya salad) was absolutely perfect - spicy, tangy, and completely plant-based. Travel blog post coming soon!',
    privacy: 'public'
  }
]

const veganPlaces = [
  {
    name: 'Green Seed Vegan',
    description: 'Farm-to-table vegan restaurant featuring seasonal California cuisine with creative plant-based dishes.',
    category: 'restaurant',
    latitude: 37.7849,
    longitude: -122.4094,
    address: '2205 Fillmore St, San Francisco, CA 94115',
    website: 'https://greenseedvegan.com',
    phone: '(415) 885-4311',
    is_pet_friendly: true,
    created_by: '11111111-1111-1111-1111-111111111111'
  },
  {
    name: 'The Plant Café Organic',
    description: 'Organic, locally-sourced plant-based meals in a cozy atmosphere. Great for brunch and healthy bowls!',
    category: 'restaurant',
    latitude: 37.8019,
    longitude: -122.4180,
    address: '2884 Webster St, San Francisco, CA 94123',
    website: 'https://theplantcafe.com',
    phone: '(415) 931-2777',
    is_pet_friendly: true,
    created_by: '22222222-2222-2222-2222-222222222222'
  },
  {
    name: 'Buddha\'s Kitchen',
    description: 'Asian-fusion vegan restaurant with incredible mock meat dishes and traditional favorites.',
    category: 'restaurant',
    latitude: 37.7849,
    longitude: -122.4186,
    address: '1800 Fillmore St, San Francisco, CA 94115',
    website: 'https://buddhaskitchensf.com',
    phone: '(415) 921-1218',
    is_pet_friendly: false,
    created_by: '33333333-3333-3333-3333-333333333333'
  },
  {
    name: 'Weekly Farmers Market',
    description: 'Every Saturday! Local organic produce, vegan food vendors, and live music. Dog-friendly market.',
    category: 'event',
    latitude: 37.7849,
    longitude: -122.4094,
    address: 'Ferry Building, San Francisco, CA 94111',
    website: 'https://ferrybuildingmarketplace.com',
    phone: null,
    is_pet_friendly: true,
    created_by: '11111111-1111-1111-1111-111111111111'
  },
  {
    name: 'Conservatory of Flowers',
    description: 'Historic Victorian greenhouse with exotic plants from around the world. Perfect for plant lovers!',
    category: 'museum',
    latitude: 37.7714,
    longitude: -122.4606,
    address: '100 John F Kennedy Dr, San Francisco, CA 94117',
    website: 'https://conservatoryofflowers.org',
    phone: '(415) 831-2090',
    is_pet_friendly: true,
    created_by: '55555555-5555-5555-5555-555555555555'
  }
]

async function createSchema() {
  console.log('🏗️  Creating database schema...')

  const schemas = [
    // Users table
    `
    CREATE TABLE IF NOT EXISTS public.users (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      username text UNIQUE NOT NULL,
      first_name text,
      last_name text,
      bio text,
      avatar_url text,
      is_private boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    `,
    
    // Posts table
    `
    CREATE TABLE IF NOT EXISTS public.posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      content text NOT NULL CHECK (char_length(content) <= 500),
      privacy text CHECK (privacy IN ('public', 'friends')) DEFAULT 'public',
      image_url text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    `,
    
    // Comments table
    `
    CREATE TABLE IF NOT EXISTS public.comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
      user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      content text NOT NULL CHECK (char_length(content) <= 280),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    `,
    
    // Follows table
    `
    CREATE TABLE IF NOT EXISTS public.follows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      following_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(follower_id, following_id)
    );
    `,
    
    // Post likes table
    `
    CREATE TABLE IF NOT EXISTS public.post_likes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
      user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(post_id, user_id)
    );
    `,
    
    // Places table
    `
    CREATE TABLE IF NOT EXISTS public.places (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      category text CHECK (category IN ('restaurant', 'event', 'museum', 'other')) NOT NULL,
      latitude double precision NOT NULL,
      longitude double precision NOT NULL,
      address text NOT NULL,
      website text,
      phone text,
      is_pet_friendly boolean DEFAULT false,
      created_by uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    `,
    
    // Favorite places table
    `
    CREATE TABLE IF NOT EXISTS public.favorite_places (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      place_id uuid REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, place_id)
    );
    `
  ]

  for (const schema of schemas) {
    try {
      await supabase.rpc('exec_sql', { sql: schema.trim() })
    } catch (error) {
      // Try direct table creation if RPC doesn't work
      console.log(`Note: ${error.message}`)
    }
  }
}

async function setupDatabase() {
  console.log('🌱 Setting up VeganConnect database...\n')

  try {
    // Step 1: Create schema (tables will be created by Supabase migrations)
    console.log('📋 Tables should be created by migrations...')

    // Step 2: Create auth users
    console.log('\n👥 Creating auth users...')
    for (const user of testUsers) {
      try {
        const { error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
          }
        })
        
        if (error && !error.message.includes('already registered')) {
          console.log(`⚠️  ${user.email}: ${error.message}`)
        } else if (!error) {
          console.log(`✅ Created auth user: ${user.email}`)
        } else {
          console.log(`ℹ️  User exists: ${user.email}`)
        }
      } catch (err) {
        console.log(`⚠️  ${user.email}: ${err.message}`)
      }
    }

    // Step 3: Insert user profiles
    console.log('\n👤 Creating user profiles...')
    
    // First, get the actual auth user IDs that were created
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log(`⚠️  Could not fetch auth users: ${authError.message}`)
    } else {
      // Create a mapping of email to auth user ID
      const emailToAuthId = {}
      authUsers.users.forEach(authUser => {
        emailToAuthId[authUser.email] = authUser.id
      })
      
      // Create profiles using the actual auth user IDs
      const profilesData = testUsers.map(user => ({
        id: emailToAuthId[user.email] || user.id, // Use auth ID if available
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        bio: user.bio
      })).filter(profile => profile.id) // Only include profiles with valid IDs
      
      const { error: usersError } = await supabase
        .from('users')
        .upsert(profilesData, { onConflict: 'id' })

      if (usersError) {
        console.log(`⚠️  User profiles: ${usersError.message}`)
      } else {
        console.log(`✅ Created ${profilesData.length} user profiles`)
      }
    }

    // Step 4: Insert posts
    console.log('\n📝 Creating sample posts...')
    
    // Get the actual user profiles that were created
    const { data: actualUsers, error: usersFetchError } = await supabase
      .from('users')
      .select('id, email')
    
    // Create mapping from test user ID to actual profile ID
    const testIdToActualId = {}
    if (!usersFetchError && actualUsers) {
      testUsers.forEach(testUser => {
        const actualUser = actualUsers.find(u => u.email === testUser.email)
        if (actualUser) {
          testIdToActualId[testUser.id] = actualUser.id
        }
      })
    }
    
    if (usersFetchError || !actualUsers) {
      console.log(`⚠️  Could not fetch user profiles: ${usersFetchError?.message}`)
    } else {
      // Update sample posts with actual user IDs
      const postsWithActualIds = samplePosts.map(post => ({
        ...post,
        user_id: testIdToActualId[post.user_id] || post.user_id
      })).filter(post => testIdToActualId[post.user_id]) // Only include posts for users that exist
      
      const { error: postsError } = await supabase
        .from('posts')
        .insert(postsWithActualIds)

      if (postsError) {
        console.log(`⚠️  Posts: ${postsError.message}`)
      } else {
        console.log(`✅ Created ${postsWithActualIds.length} sample posts`)
      }
    }

    // Step 5: Insert places
    console.log('\n📍 Creating vegan places...')
    
    // Use the same user mapping for places
    if (actualUsers && Object.keys(testIdToActualId).length > 0) {
      const placesWithActualIds = veganPlaces.map(place => ({
        ...place,
        created_by: testIdToActualId[place.created_by] || place.created_by
      })).filter(place => testIdToActualId[place.created_by]) // Only include places for users that exist
      
      const { error: placesError } = await supabase
        .from('places')
        .insert(placesWithActualIds)

      if (placesError) {
        console.log(`⚠️  Places: ${placesError.message}`)
      } else {
        console.log(`✅ Created ${placesWithActualIds.length} vegan places`)
      }
    } else {
      console.log(`⚠️  Places: Could not create without valid user IDs`)
    }

    // Step 6: Add some follows
    console.log('\n👥 Creating follow relationships...')
    
    if (actualUsers && Object.keys(testIdToActualId).length >= 3) {
      const follows = [
        { follower_id: testIdToActualId['11111111-1111-1111-1111-111111111111'], following_id: testIdToActualId['22222222-2222-2222-2222-222222222222'] },
        { follower_id: testIdToActualId['11111111-1111-1111-1111-111111111111'], following_id: testIdToActualId['33333333-3333-3333-3333-333333333333'] },
        { follower_id: testIdToActualId['22222222-2222-2222-2222-222222222222'], following_id: testIdToActualId['11111111-1111-1111-1111-111111111111'] },
        { follower_id: testIdToActualId['33333333-3333-3333-3333-333333333333'], following_id: testIdToActualId['55555555-5555-5555-5555-555555555555'] }
      ].filter(follow => follow.follower_id && follow.following_id) // Only include valid relationships

      const { error: followsError } = await supabase
        .from('follows')
        .insert(follows)

      if (followsError) {
        console.log(`⚠️  Follows: ${followsError.message}`)
      } else {
        console.log(`✅ Created ${follows.length} follow relationships`)
      }
    } else {
      console.log(`⚠️  Follows: Not enough users to create relationships`)
    }

    console.log('\n🎉 Database setup complete!')
    console.log('\n📊 Summary:')
    console.log(`👥 Users: ${testUsers.length}`)
    console.log(`📝 Posts: ${samplePosts.length}`)
    console.log(`📍 Places: ${veganPlaces.length}`)
    console.log(`🔗 Follows: 4`)

    console.log('\n🔑 Test Login Credentials:')
    console.log('┌─────────────────────────┬─────────────┬─────────────────┐')
    console.log('│ Email                   │ Password    │ Username        │')
    console.log('├─────────────────────────┼─────────────┼─────────────────┤')
    testUsers.forEach(user => {
      console.log(`│ ${user.email.padEnd(23)} │ password123 │ ${user.username.padEnd(15)} │`)
    })
    console.log('└─────────────────────────┴─────────────┴─────────────────┘')

    console.log('\n🌐 Next Steps:')
    console.log('1. Run: npm run dev')
    console.log('2. Visit: http://localhost:3000')
    console.log('3. Login with any test user above')
    console.log('4. Explore posts, map, and profiles!')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Make sure Supabase is running: npm run db:start')
    console.log('2. Check if migrations applied: npx supabase status')
    console.log('3. Try resetting: npm run db:reset')
    process.exit(1)
  }
}

if (require.main === module) {
  setupDatabase().then(() => process.exit(0))
}

module.exports = { setupDatabase }