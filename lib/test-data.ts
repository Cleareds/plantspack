/**
 * Test data for VeganConnect local development
 * This file contains all the dummy data used for seeding the database
 */

export interface TestUser {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  bio: string
  password: string // For reference - actual hashing is handled by Supabase Auth
}

export interface TestPost {
  user_id: string
  content: string
  privacy: 'public' | 'friends'
}

export interface TestPlace {
  name: string
  description: string
  category: 'restaurant' | 'event' | 'museum' | 'other'
  latitude: number
  longitude: number
  address: string
  website?: string
  phone?: string
  is_pet_friendly: boolean
  created_by: string
}

export const testUsers: TestUser[] = [
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

export const testPosts: TestPost[] = [
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
    user_id: '11111111-1111-1111-1111-111111111111',
    content: 'Trying out a new jackfruit BBQ recipe tonight! Will share if it turns out amazing. Sometimes the best discoveries happen in the kitchen 👩‍🍳',
    privacy: 'friends'
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
    user_id: '22222222-2222-2222-2222-222222222222',
    content: 'Rest day with my pup at the dog park. Even he loves my plant-based energy balls! 🐕 Recipe: dates, almonds, chia seeds, and a touch of vanilla.',
    privacy: 'public'
  },
  {
    user_id: '33333333-3333-3333-3333-333333333333',
    content: 'Harvested fresh herbs from my garden today 🌿 There\'s something magical about growing your own medicine. Today\'s haul: basil, rosemary, thyme, and lavender.',
    privacy: 'public'
  },
  {
    user_id: '33333333-3333-3333-3333-333333333333',
    content: 'Meditation session in the garden this morning 🧘‍♀️ Connecting with nature and practicing gratitude for all the plants that nourish us.',
    privacy: 'friends'
  },
  {
    user_id: '33333333-3333-3333-3333-333333333333',
    content: 'Making herbal tea blends for winter wellness. Ginger, turmeric, and elderberry - nature\'s pharmacy is incredible! 🍵',
    privacy: 'public'
  },
  {
    user_id: '44444444-4444-4444-4444-444444444444',
    content: 'Planting season is here! 🌱 Started 50 tomato seedlings and 30 pepper plants. This year\'s goal is to supply 5 local restaurants with fresh organic produce.',
    privacy: 'public'
  },
  {
    user_id: '44444444-4444-4444-4444-444444444444',
    content: 'Composting workshop this weekend was amazing! Teaching families how to turn kitchen scraps into garden gold. Every small action counts for our planet 🌍',
    privacy: 'public'
  },
  {
    user_id: '55555555-5555-5555-5555-555555555555',
    content: 'Found the most incredible street food in Bangkok! 🇹🇭 This som tam (papaya salad) was absolutely perfect - spicy, tangy, and completely plant-based. Travel blog post coming soon!',
    privacy: 'public'
  },
  {
    user_id: '55555555-5555-5555-5555-555555555555',
    content: 'Cooking class in Tuscany was magical ✨ Learning to make fresh pasta with tomatoes from the garden. The simplest ingredients make the most beautiful dishes.',
    privacy: 'public'
  },
  {
    user_id: '55555555-5555-5555-5555-555555555555',
    content: 'Missing the incredible vegan ramen I had in Tokyo last month. The broth was so rich and umami-packed. Need to recreate this at home! 🍜',
    privacy: 'friends'
  }
]

export const testPlaces: TestPlace[] = [
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
    name: 'Loving Hut Express',
    description: 'Quick and delicious Asian vegan fast food. Perfect for lunch breaks and casual dining.',
    category: 'restaurant',
    latitude: 37.7849,
    longitude: -122.4294,
    address: '1234 Mission St, San Francisco, CA 94103',
    website: 'https://lovinghut.com',
    phone: '(415) 555-0199',
    is_pet_friendly: false,
    created_by: '55555555-5555-5555-5555-555555555555'
  },
  {
    name: 'California Academy of Sciences',
    description: 'Natural history museum with sustainable practices and plant-focused exhibits. The living roof is incredible!',
    category: 'museum',
    latitude: 37.7697,
    longitude: -122.4663,
    address: '55 Music Concourse Dr, San Francisco, CA 94118',
    website: 'https://calacademy.org',
    phone: '(415) 379-8000',
    is_pet_friendly: false,
    created_by: '44444444-4444-4444-4444-444444444444'
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
  },
  {
    name: 'Weekly Farmers Market',
    description: 'Every Saturday! Local organic produce, vegan food vendors, and live music. Dog-friendly market.',
    category: 'event',
    latitude: 37.7849,
    longitude: -122.4094,
    address: 'Ferry Building, San Francisco, CA 94111',
    website: 'https://ferrybuildingmarketplace.com',
    is_pet_friendly: true,
    created_by: '11111111-1111-1111-1111-111111111111'
  },
  {
    name: 'Vegan Food Festival 2024',
    description: 'Annual celebration of plant-based cuisine with local vendors, cooking demos, and sustainability talks.',
    category: 'event',
    latitude: 37.7694,
    longitude: -122.4862,
    address: 'Golden Gate Park, San Francisco, CA 94118',
    website: 'https://veganfoodfest.com',
    is_pet_friendly: true,
    created_by: '22222222-2222-2222-2222-222222222222'
  },
  {
    name: 'Plant-Based Cooking Workshop',
    description: 'Monthly hands-on cooking classes focusing on seasonal vegan recipes and nutrition education.',
    category: 'event',
    latitude: 37.7549,
    longitude: -122.4194,
    address: '456 Community Center Way, San Francisco, CA 94110',
    website: 'https://plantbasedworkshops.com',
    phone: '(415) 555-0156',
    is_pet_friendly: false,
    created_by: '33333333-3333-3333-3333-333333333333'
  },
  {
    name: 'Community Garden Project',
    description: 'Volunteer-run urban garden growing organic vegetables for local food banks. Volunteer opportunities available!',
    category: 'other',
    latitude: 37.7849,
    longitude: -122.4194,
    address: '1234 Community St, San Francisco, CA 94110',
    website: 'https://communitygardens.org',
    phone: '(415) 555-0123',
    is_pet_friendly: true,
    created_by: '44444444-4444-4444-4444-444444444444'
  },
  {
    name: 'Zero Waste Store',
    description: 'Bulk foods, sustainable products, and eco-friendly alternatives. Supporting a plastic-free lifestyle.',
    category: 'other',
    latitude: 37.7649,
    longitude: -122.4094,
    address: '789 Eco Street, San Francisco, CA 94114',
    website: 'https://zerowastestore.com',
    phone: '(415) 555-0167',
    is_pet_friendly: true,
    created_by: '11111111-1111-1111-1111-111111111111'
  }
]

export const followRelationships = [
  { follower_id: '11111111-1111-1111-1111-111111111111', following_id: '22222222-2222-2222-2222-222222222222' },
  { follower_id: '11111111-1111-1111-1111-111111111111', following_id: '33333333-3333-3333-3333-333333333333' },
  { follower_id: '11111111-1111-1111-1111-111111111111', following_id: '55555555-5555-5555-5555-555555555555' },
  { follower_id: '22222222-2222-2222-2222-222222222222', following_id: '11111111-1111-1111-1111-111111111111' },
  { follower_id: '22222222-2222-2222-2222-222222222222', following_id: '44444444-4444-4444-4444-444444444444' },
  { follower_id: '33333333-3333-3333-3333-333333333333', following_id: '11111111-1111-1111-1111-111111111111' },
  { follower_id: '33333333-3333-3333-3333-333333333333', following_id: '55555555-5555-5555-5555-555555555555' },
  { follower_id: '44444444-4444-4444-4444-444444444444', following_id: '22222222-2222-2222-2222-222222222222' },
  { follower_id: '44444444-4444-4444-4444-444444444444', following_id: '33333333-3333-3333-3333-333333333333' },
  { follower_id: '55555555-5555-5555-5555-555555555555', following_id: '11111111-1111-1111-1111-111111111111' },
  { follower_id: '55555555-5555-5555-5555-555555555555', following_id: '33333333-3333-3333-3333-333333333333' }
]

export const sampleComments = [
  {
    post_content_match: '%cashew-based cheese%',
    user_id: '22222222-2222-2222-2222-222222222222',
    content: 'I need this recipe! 🙏 Have you tried making it with macadamia nuts too?'
  },
  {
    post_content_match: '%cashew-based cheese%',
    user_id: '33333333-3333-3333-3333-333333333333',
    content: 'Cashew cheese is the best! I love adding nutritional yeast and a bit of lemon juice for tang.'
  },
  {
    post_content_match: '%marathon%',
    user_id: '11111111-1111-1111-1111-111111111111',
    content: 'Congratulations! 🎉 You\'re such an inspiration. What was your fuel strategy during the race?'
  },
  {
    post_content_match: '%Bangkok%',
    user_id: '44444444-4444-4444-4444-444444444444',
    content: 'Thai food is amazing! The balance of flavors is incredible. Can\'t wait for your blog post!'
  },
  {
    post_content_match: '%herbs from my garden%',
    user_id: '22222222-2222-2222-2222-222222222222',
    content: 'Your garden always looks so lush! Do you have any tips for growing basil indoors?'
  }
]