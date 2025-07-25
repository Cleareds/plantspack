-- VeganConnect - Production-Ready Seed Data for Supabase Cloud
-- This approach works around auth constraints by using a function

-- Step 1: Create a function to safely insert demo users
CREATE OR REPLACE FUNCTION create_demo_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert demo users directly into public.users (bypassing auth for seed data)
  INSERT INTO public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    bio,
    created_at,
    updated_at
  ) VALUES 
  ('11111111-1111-1111-1111-111111111111', 
   'emma@veganlife.com',
   'emmagreen',
   'Emma',
   'Green',
   'Plant-based lifestyle enthusiast 🌱 | Love exploring new vegan restaurants and sharing recipes!',
   NOW() - INTERVAL '30 days',
   NOW() - INTERVAL '30 days'),

  ('22222222-2222-2222-2222-222222222222',
   'marcus@plantbased.org',
   'marcusplant',
   'Marcus',
   'Plant',
   'Fitness coach promoting plant-powered performance 💪 | Marathon runner | Dog dad 🐕',
   NOW() - INTERVAL '25 days',
   NOW() - INTERVAL '25 days'),

  ('33333333-3333-3333-3333-333333333333',
   'lily@herbivore.net',
   'lilyherbs',
   'Lily',
   'Herbs',
   'Herbalist and mindful living advocate 🌿 | Sharing natural healing wisdom',
   NOW() - INTERVAL '20 days',
   NOW() - INTERVAL '20 days'),

  ('44444444-4444-4444-4444-444444444444',
   'david@sprouts.com',
   'davidsprouts',
   'David',
   'Sprouts',
   'Sustainable farming and permaculture enthusiast 🌾 | Growing our future',
   NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '15 days'),

  ('55555555-5555-5555-5555-555555555555',
   'sofia@quinoalover.com',
   'sofiaquinoa',
   'Sofia',
   'Quinoa',
   'Traveling the world to discover authentic vegan cuisine 🌍 | Food blogger',
   NOW() - INTERVAL '10 days',
   NOW() - INTERVAL '10 days')
  ON CONFLICT (id) DO UPDATE SET
    bio = EXCLUDED.bio,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
    
  RAISE NOTICE 'Demo users created successfully';
END;
$$;

-- Step 2: Execute the function
SELECT create_demo_users();

-- Step 3: Insert sample posts
INSERT INTO public.posts (user_id, content, privacy, created_at) VALUES
-- Emma's posts
('11111111-1111-1111-1111-111111111111', 
 'Just discovered this amazing cashew-based cheese recipe! 🧀 The texture is so creamy and the flavor is incredible. Plant-based alternatives keep getting better! #VeganCheese #PlantBased', 
 'public', NOW() - INTERVAL '2 days'),

('11111111-1111-1111-1111-111111111111',
 'Morning smoothie bowl with fresh berries, granola, and almond butter 🍓🥣 Starting the day with plants gives me so much energy!',
 'public', NOW() - INTERVAL '5 days'),

-- Marcus's posts
('22222222-2222-2222-2222-222222222222',
 'Completed my first plant-powered marathon today! 🏃‍♂️💨 Proving once again that you don''t need animal products for peak performance. Fueled entirely by fruits, nuts, and determination!',
 'public', NOW() - INTERVAL '1 day'),

('22222222-2222-2222-2222-222222222222',
 'Pre-workout fuel: banana with almond butter and a green smoothie 🍌💚 Plant protein is all you need for strength training!',
 'public', NOW() - INTERVAL '4 days'),

-- Lily's posts
('33333333-3333-3333-3333-333333333333',
 'Harvested fresh herbs from my garden today 🌿 There''s something magical about growing your own medicine. Today''s haul: basil, rosemary, thyme, and lavender.',
 'public', NOW() - INTERVAL '3 days'),

('33333333-3333-3333-3333-333333333333',
 'Meditation session in the garden this morning 🧘‍♀️ Connecting with nature and practicing gratitude for all the plants that nourish us.',
 'friends', NOW() - INTERVAL '6 days'),

-- David's posts
('44444444-4444-4444-4444-444444444444',
 'Planting season is here! 🌱 Started 50 tomato seedlings and 30 pepper plants. This year''s goal is to supply 5 local restaurants with fresh organic produce.',
 'public', NOW() - INTERVAL '7 days'),

('44444444-4444-4444-4444-444444444444',
 'Composting workshop this weekend was amazing! Teaching families how to turn kitchen scraps into garden gold. Every small action counts for our planet 🌍',
 'public', NOW() - INTERVAL '3 days'),

-- Sofia's posts
('55555555-5555-5555-5555-555555555555',
 'Found the most incredible street food in Bangkok! 🇹🇭 This som tam (papaya salad) was absolutely perfect - spicy, tangy, and completely plant-based. Travel blog post coming soon!',
 'public', NOW() - INTERVAL '1 hour'),

('55555555-5555-5555-5555-555555555555',
 'Cooking class in Tuscany was magical ✨ Learning to make fresh pasta with tomatoes from the garden. The simplest ingredients make the most beautiful dishes.',
 'public', NOW() - INTERVAL '8 days');

-- Step 4: Insert follow relationships
INSERT INTO public.follows (follower_id, following_id, created_at) VALUES
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '20 days'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '18 days'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 days'),
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '15 days'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '17 days'),
('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', NOW() - INTERVAL '12 days'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '14 days'),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 days'),
('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '6 days')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Step 5: Insert vegan places around San Francisco
INSERT INTO public.places (name, description, category, latitude, longitude, address, website, phone, is_pet_friendly, created_by, created_at) VALUES
-- Restaurants
('Green Seed Vegan', 
 'Farm-to-table vegan restaurant featuring seasonal California cuisine with creative plant-based dishes.',
 'restaurant', 
 37.7849, -122.4094,
 '2205 Fillmore St, San Francisco, CA 94115',
 'https://greenseedvegan.com',
 '(415) 885-4311',
 true,
 '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '20 days'),

('The Plant Café Organic',
 'Organic, locally-sourced plant-based meals in a cozy atmosphere. Great for brunch and healthy bowls!',
 'restaurant',
 37.8019, -122.4180,
 '2884 Webster St, San Francisco, CA 94123',
 'https://theplantcafe.com',
 '(415) 931-2777',
 true,
 '22222222-2222-2222-2222-222222222222',
 NOW() - INTERVAL '18 days'),

('Buddha''s Kitchen',
 'Asian-fusion vegan restaurant with incredible mock meat dishes and traditional favorites.',
 'restaurant',
 37.7849, -122.4186,
 '1800 Fillmore St, San Francisco, CA 94115',
 'https://buddhaskitchensf.com',
 '(415) 921-1218',
 false,
 '33333333-3333-3333-3333-333333333333',
 NOW() - INTERVAL '15 days'),

('Loving Hut',
 'International vegan chain with delicious Asian-inspired dishes and mock meat options.',
 'restaurant',
 37.7849, -122.4286,
 '1500 Irving St, San Francisco, CA 94122',
 'https://lovinghut.com',
 '(415) 731-9887',
 false,
 '44444444-4444-4444-4444-444444444444',
 NOW() - INTERVAL '13 days'),

('Shizen',
 'Upscale vegan sushi restaurant with creative plant-based takes on Japanese classics.',
 'restaurant',
 37.7749, -122.4194,
 '370 14th St, San Francisco, CA 94103',
 'https://shizensf.com',
 '(415) 678-5767',
 false,
 '55555555-5555-5555-5555-555555555555',
 NOW() - INTERVAL '11 days'),

-- Museums and Gardens
('California Academy of Sciences',
 'Natural history museum with sustainable practices and plant-focused exhibits. The living roof is incredible!',
 'museum',
 37.7697, -122.4663,
 '55 Music Concourse Dr, San Francisco, CA 94118',
 'https://calacademy.org',
 '(415) 379-8000',
 false,
 '44444444-4444-4444-4444-444444444444',
 NOW() - INTERVAL '12 days'),

('Conservatory of Flowers',
 'Historic Victorian greenhouse with exotic plants from around the world. Perfect for plant lovers!',
 'museum',
 37.7714, -122.4606,
 '100 John F Kennedy Dr, San Francisco, CA 94117',
 'https://conservatoryofflowers.org',
 '(415) 831-2090',
 true,
 '55555555-5555-5555-5555-555555555555',
 NOW() - INTERVAL '10 days'),

('San Francisco Botanical Garden',
 'Beautiful 55-acre botanical garden with plants from around the world. Great for peaceful walks.',
 'museum',
 37.7661, -122.4707,
 '1199 9th Ave, San Francisco, CA 94122',
 'https://sfbg.org',
 '(415) 661-1316',
 true,
 '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '8 days'),

-- Events
('Weekly Farmers Market',
 'Every Saturday! Local organic produce, vegan food vendors, and live music. Dog-friendly market.',
 'event',
 37.7956, -122.3933,
 'Ferry Building, San Francisco, CA 94111',
 'https://ferrybuildingmarketplace.com',
 NULL,
 true,
 '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '5 days'),

('Vegan Food Festival 2024',
 'Annual celebration of plant-based cuisine with local vendors, cooking demos, and sustainability talks.',
 'event',
 37.7694, -122.4862,
 'Golden Gate Park, San Francisco, CA 94118',
 'https://veganfoodfest.com',
 NULL,
 true,
 '22222222-2222-2222-2222-222222222222',
 NOW() - INTERVAL '3 days'),

('Plant-Based Cooking Workshop',
 'Monthly hands-on cooking class featuring seasonal plant-based recipes. All skill levels welcome!',
 'event',
 37.7849, -122.4194,
 '123 Workshop Ave, San Francisco, CA 94110',
 'https://plantbasedcooking.com',
 '(415) 555-0456',
 false,
 '33333333-3333-3333-3333-333333333333',
 NOW() - INTERVAL '2 days'),

-- Other places
('Community Garden Project',
 'Volunteer-run urban garden growing organic vegetables for local food banks. Volunteer opportunities available!',
 'other',
 37.7849, -122.4194,
 '1234 Community St, San Francisco, CA 94110',
 'https://communitygardens.org',
 '(415) 555-0123',
 true,
 '44444444-4444-4444-4444-444444444444',
 NOW() - INTERVAL '7 days'),

('Rainbow Grocery Cooperative',
 'Worker-owned natural foods cooperative with amazing vegan and organic selection.',
 'other',
 37.7649, -122.4194,
 '1745 Folsom St, San Francisco, CA 94103',
 'https://rainbow.coop',
 '(415) 863-0620',
 false,
 '55555555-5555-5555-5555-555555555555',
 NOW() - INTERVAL '6 days'),

('Whole Foods Market',
 'Natural and organic grocery store with extensive vegan options and prepared foods.',
 'other',
 37.7849, -122.4394,
 '2001 Market St, San Francisco, CA 94114',
 'https://wholefoodsmarket.com',
 '(415) 618-0066',
 false,
 '22222222-2222-2222-2222-222222222222',
 NOW() - INTERVAL '4 days');

-- Step 6: Add some favorite places
INSERT INTO public.favorite_places (user_id, place_id) 
SELECT u.id, p.id 
FROM public.users u, public.places p 
WHERE 
  (u.username = 'emmagreen' AND p.name IN ('Green Seed Vegan', 'The Plant Café Organic', 'Weekly Farmers Market'))
  OR (u.username = 'marcusplant' AND p.name IN ('The Plant Café Organic', 'Community Garden Project'))
  OR (u.username = 'lilyherbs' AND p.name IN ('Conservatory of Flowers', 'Community Garden Project'))
  OR (u.username = 'sofiaquinoa' AND p.name IN ('Buddha''s Kitchen', 'Vegan Food Festival 2024'))
ON CONFLICT (user_id, place_id) DO NOTHING;

-- Step 7: Add some post likes
INSERT INTO public.post_likes (post_id, user_id)
SELECT p.id, u.id
FROM public.posts p, public.users u
WHERE 
  (p.content LIKE '%cashew-based cheese%' AND u.username IN ('marcusplant', 'lilyherbs', 'sofiaquinoa'))
  OR (p.content LIKE '%marathon%' AND u.username IN ('emmagreen', 'davidsprouts'))
  OR (p.content LIKE '%herbs from my garden%' AND u.username IN ('emmagreen', 'davidsprouts', 'sofiaquinoa'))
  OR (p.content LIKE '%Bangkok%' AND u.username IN ('emmagreen', 'marcusplant', 'lilyherbs'))
ON CONFLICT (post_id, user_id) DO NOTHING;

-- Step 8: Add some comments
INSERT INTO public.comments (post_id, user_id, content, created_at) VALUES
-- Comments on Emma's cheese post
((SELECT id FROM public.posts WHERE content LIKE '%cashew-based cheese%' LIMIT 1),
 '22222222-2222-2222-2222-222222222222',
 'I need this recipe! 🙏 Have you tried making it with macadamia nuts too?',
 NOW() - INTERVAL '1 day'),

((SELECT id FROM public.posts WHERE content LIKE '%cashew-based cheese%' LIMIT 1),
 '33333333-3333-3333-3333-333333333333',
 'Cashew cheese is the best! I love adding nutritional yeast and a bit of lemon juice for tang.',
 NOW() - INTERVAL '12 hours'),

-- Comments on Marcus's marathon post
((SELECT id FROM public.posts WHERE content LIKE '%marathon%' LIMIT 1),
 '11111111-1111-1111-1111-111111111111',
 'Congratulations! 🎉 You''re such an inspiration. What was your fuel strategy during the race?',
 NOW() - INTERVAL '6 hours'),

-- Comments on Sofia's Bangkok post
((SELECT id FROM public.posts WHERE content LIKE '%Bangkok%' LIMIT 1),
 '44444444-4444-4444-4444-444444444444',
 'Thai food is amazing! The balance of flavors is incredible. Can''t wait for your blog post!',
 NOW() - INTERVAL '30 minutes');

-- Step 9: Clean up the function
DROP FUNCTION create_demo_users();

-- Success message
SELECT 'VeganConnect seed data loaded successfully! 🌱' as status;