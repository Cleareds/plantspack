#!/usr/bin/env node

/**
 * Seed script for VeganConnect local development
 * This script populates the database with dummy data for testing
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
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
    bio: 'Plant-based lifestyle enthusiast 🌱 | Love exploring new vegan restaurants and sharing recipes!'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'marcus@plantbased.org',
    username: 'marcusplant',
    first_name: 'Marcus',
    last_name: 'Plant',
    bio: 'Fitness coach promoting plant-powered performance 💪 | Marathon runner | Dog dad 🐕'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'lily@herbivore.net',
    username: 'lilyherbs',
    first_name: 'Lily',
    last_name: 'Herbs',
    bio: 'Herbalist and mindful living advocate 🌿 | Sharing natural healing wisdom'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'david@sprouts.com',
    username: 'davidsprouts',
    first_name: 'David',
    last_name: 'Sprouts',
    bio: 'Sustainable farming and permaculture enthusiast 🌾 | Growing our future'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'sofia@quinoalover.com',
    username: 'sofiaquinoa',
    first_name: 'Sofia',
    last_name: 'Quinoa',
    bio: 'Traveling the world to discover authentic vegan cuisine 🌍 | Food blogger'
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

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // First, create auth users via Supabase Auth API
    console.log('👥 Creating test users in auth system...')
    
    for (const user of testUsers) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
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
          console.log(`⚠️  Warning for ${user.email}: ${error.message}`)
        } else if (!error) {
          console.log(`✅ Created auth user: ${user.email}`)
        } else {
          console.log(`ℹ️  User already exists: ${user.email}`)
        }
      } catch (err) {
        console.log(`⚠️  Could not create auth user ${user.email}: ${err.message}`)
      }
    }

    // Insert/update user profiles
    console.log('\n👤 Updating user profiles...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(testUsers.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        bio: user.bio
      })), { onConflict: 'id' })
    
    if (userError) {
      console.log('Note: Some users may already exist, that\'s okay!')
      console.log('Error details:', userError.message)
    } else {
      console.log(`✅ Updated ${testUsers.length} user profiles`)
    }

    // Insert posts
    console.log('\n📝 Inserting sample posts...')
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .insert(samplePosts)
    
    if (postError) {
      console.error('❌ Error inserting posts:', postError)
    } else {
      console.log(`✅ Created ${samplePosts.length} sample posts`)
    }

    // Insert places
    console.log('\n📍 Inserting vegan places...')
    const { data: placeData, error: placeError } = await supabase
      .from('places')
      .insert(veganPlaces)
    
    if (placeError) {
      console.error('❌ Error inserting places:', placeError)
    } else {
      console.log(`✅ Created ${veganPlaces.length} vegan places`)
    }

    // Add some follows
    console.log('\n👥 Creating follow relationships...')
    const follows = [
      { follower_id: '11111111-1111-1111-1111-111111111111', following_id: '22222222-2222-2222-2222-222222222222' },
      { follower_id: '11111111-1111-1111-1111-111111111111', following_id: '33333333-3333-3333-3333-333333333333' },
      { follower_id: '22222222-2222-2222-2222-222222222222', following_id: '11111111-1111-1111-1111-111111111111' },
      { follower_id: '33333333-3333-3333-3333-333333333333', following_id: '55555555-5555-5555-5555-555555555555' }
    ]
    
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .insert(follows)
    
    if (followError) {
      console.error('❌ Error creating follows:', followError)
    } else {
      console.log(`✅ Created ${follows.length} follow relationships`)
    }

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\nTest users you can log in with:')
    console.log('┌─────────────────────────┬─────────────┬─────────────────┐')
    console.log('│ Email                   │ Password    │ Username        │')
    console.log('├─────────────────────────┼─────────────┼─────────────────┤')
    testUsers.forEach(user => {
      console.log(`│ ${user.email.padEnd(23)} │ password123 │ ${user.username.padEnd(15)} │`)
    })
    console.log('└─────────────────────────┴─────────────┴─────────────────┘')
    console.log('\n🌐 Visit http://localhost:3000 to see your app with data!')
    console.log('🛠️  Visit http://localhost:54323 to see Supabase Studio')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase().then(() => process.exit(0))
}

module.exports = { seedDatabase }