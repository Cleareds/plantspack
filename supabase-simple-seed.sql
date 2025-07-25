-- VeganConnect - Simplified Seed Data for Supabase Cloud
-- This version creates a placeholder user and then assigns all content to them
-- After deployment, you can create real users and transfer ownership

-- Step 1: Create a placeholder user in public.users table
-- Note: This user won't be able to log in, but will satisfy foreign key constraints
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
('00000000-0000-0000-0000-000000000000',
 'placeholder@demo.com',
 'demo_user',
 'Demo',
 'User',
 'Placeholder user for initial seed data. Replace with real users after deployment.',
 NOW(),
 NOW())
ON CONFLICT (id) DO UPDATE SET
  bio = EXCLUDED.bio;

-- Step 2: Insert vegan places around San Francisco (all assigned to placeholder user)
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
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '20 days'),

('The Plant Café Organic',
 'Organic, locally-sourced plant-based meals in a cozy atmosphere. Great for brunch and healthy bowls!',
 'restaurant',
 37.8019, -122.4180,
 '2884 Webster St, San Francisco, CA 94123',
 'https://theplantcafe.com',
 '(415) 931-2777',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '18 days'),

('Buddha''s Kitchen',
 'Asian-fusion vegan restaurant with incredible mock meat dishes and traditional favorites.',
 'restaurant',
 37.7849, -122.4186,
 '1800 Fillmore St, San Francisco, CA 94115',
 'https://buddhaskitchensf.com',
 '(415) 921-1218',
 false,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '15 days'),

('Loving Hut',
 'International vegan chain with delicious Asian-inspired dishes and mock meat options.',
 'restaurant',
 37.7849, -122.4286,
 '1500 Irving St, San Francisco, CA 94122',
 'https://lovinghut.com',
 '(415) 731-9887',
 false,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '13 days'),

('Shizen',
 'Upscale vegan sushi restaurant with creative plant-based takes on Japanese classics.',
 'restaurant',
 37.7749, -122.4194,
 '370 14th St, San Francisco, CA 94103',
 'https://shizensf.com',
 '(415) 678-5767',
 false,
 '00000000-0000-0000-0000-000000000000',
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
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '12 days'),

('Conservatory of Flowers',
 'Historic Victorian greenhouse with exotic plants from around the world. Perfect for plant lovers!',
 'museum',
 37.7714, -122.4606,
 '100 John F Kennedy Dr, San Francisco, CA 94117',
 'https://conservatoryofflowers.org',
 '(415) 831-2090',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '10 days'),

('San Francisco Botanical Garden',
 'Beautiful 55-acre botanical garden with plants from around the world. Great for peaceful walks.',
 'museum',
 37.7661, -122.4707,
 '1199 9th Ave, San Francisco, CA 94122',
 'https://sfbg.org',
 '(415) 661-1316',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '8 days'),

('Japanese Tea Garden',
 'Historic tea garden featuring traditional landscaping, pagodas, and peaceful walking paths.',
 'museum',
 37.7701, -122.4681,
 '75 Hagiwara Tea Garden Dr, San Francisco, CA 94118',
 'https://japaneseteagardensf.com',
 '(415) 752-1171',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '9 days'),

-- Events
('Weekly Farmers Market',
 'Every Saturday! Local organic produce, vegan food vendors, and live music. Dog-friendly market.',
 'event',
 37.7956, -122.3933,
 'Ferry Building, San Francisco, CA 94111',
 'https://ferrybuildingmarketplace.com',
 NULL,
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '5 days'),

('Vegan Food Festival 2024',
 'Annual celebration of plant-based cuisine with local vendors, cooking demos, and sustainability talks.',
 'event',
 37.7694, -122.4862,
 'Golden Gate Park, San Francisco, CA 94118',
 'https://veganfoodfest.com',
 NULL,
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '3 days'),

('Plant-Based Cooking Workshop',
 'Monthly hands-on cooking class featuring seasonal plant-based recipes. All skill levels welcome!',
 'event',
 37.7849, -122.4194,
 '123 Workshop Ave, San Francisco, CA 94110',
 'https://plantbasedcooking.com',
 '(415) 555-0456',
 false,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '2 days'),

('Mindful Eating Meditation',
 'Weekly mindfulness practice focusing on conscious eating and gratitude for plant-based nutrition.',
 'event',
 37.7849, -122.4094,
 'Mission Dolores Park, San Francisco, CA 94114',
 'https://mindfuleatingsf.org',
 NULL,
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '1 day'),

-- Other places (shops, markets, etc.)
('Community Garden Project',
 'Volunteer-run urban garden growing organic vegetables for local food banks. Volunteer opportunities available!',
 'other',
 37.7849, -122.4194,
 '1234 Community St, San Francisco, CA 94110',
 'https://communitygardens.org',
 '(415) 555-0123',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '7 days'),

('Rainbow Grocery Cooperative',
 'Worker-owned natural foods cooperative with amazing vegan and organic selection.',
 'other',
 37.7649, -122.4194,
 '1745 Folsom St, San Francisco, CA 94103',
 'https://rainbow.coop',
 '(415) 863-0620',
 false,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '6 days'),

('Whole Foods Market',
 'Natural and organic grocery store with extensive vegan options and prepared foods.',
 'other',
 37.7849, -122.4394,
 '2001 Market St, San Francisco, CA 94114',
 'https://wholefoodsmarket.com',
 '(415) 618-0066',
 false,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '4 days'),

('BiRite Market',
 'Local grocery store known for high-quality organic and local products, great vegan selection.',
 'other',
 37.7599, -122.4217,
 '3639 18th St, San Francisco, CA 94110',
 'https://biritemarket.com',
 '(415) 241-9760',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '5 days'),

('Urban Sprouts',
 'Plant nursery specializing in herbs, vegetables, and urban gardening supplies for city dwellers.',
 'other',
 37.7749, -122.4094,
 '567 Potrero Ave, San Francisco, CA 94110',
 'https://urbansproutssf.com',
 '(415) 555-0789',
 true,
 '00000000-0000-0000-0000-000000000000',
 NOW() - INTERVAL '8 days');

-- Step 3: Instructions for after deployment
-- Once you have real users signing up, you can transfer ownership:
-- 
-- UPDATE public.places 
-- SET created_by = 'real-user-uuid' 
-- WHERE created_by = '00000000-0000-0000-0000-000000000000';
--
-- Or delete the placeholder user and let real users add their own places:
-- DELETE FROM public.places WHERE created_by = '00000000-0000-0000-0000-000000000000';
-- DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000000';