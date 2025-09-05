-- Generate test users with different subscription levels
-- This script creates test users for development and testing

-- Insert test users with different subscription tiers
INSERT INTO public.users (id, email, username, first_name, last_name, bio, subscription_tier, subscription_status, subscription_started_at, created_at, updated_at) VALUES
-- Free tier user
('11111111-1111-1111-1111-111111111111', 'free@test.com', 'freeuser', 'Free', 'User', 'I love plants and sharing vegan recipes! Currently on the free plan to explore the community.', 'free', 'active', NOW(), NOW(), NOW()),

-- Supporter ($3) tier user
('22222222-2222-2222-2222-222222222222', 'supporter@test.com', 'supporter', 'Sarah', 'Green', 'Vegan for 5 years! Love sharing my journey and connecting with like-minded people. Supporting this amazing platform! 🌱', 'medium', 'active', NOW(), NOW(), NOW()),

-- Premium ($10) tier user
('33333333-3333-3333-3333-333333333333', 'premium@test.com', 'premiumuser', 'Alex', 'Vegan', 'Professional chef specializing in plant-based cuisine. Running my own vegan restaurant and food blog. Excited to share unlimited content here! 🍃', 'premium', 'active', NOW(), NOW(), NOW())

ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  bio = EXCLUDED.bio,
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_status = EXCLUDED.subscription_status,
  subscription_started_at = EXCLUDED.subscription_started_at,
  updated_at = NOW();

-- Insert test posts to demonstrate different subscription capabilities

-- Free user posts (500 chars max, 3 images max, no videos)
INSERT INTO public.posts (id, user_id, content, privacy, image_urls, created_at, updated_at) VALUES
('post-free-1', '11111111-1111-1111-1111-111111111111', 'Just made an amazing quinoa bowl with roasted vegetables! The colors are so vibrant and it tastes incredible. Simple ingredients: quinoa, bell peppers, zucchini, chickpeas, and tahini dressing. Perfect for meal prep! 🥗 #veganfood #healthyeating #mealprep', 'public', '{"https://picsum.photos/800/600?random=1", "https://picsum.photos/800/600?random=2", "https://picsum.photos/800/600?random=3"}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

('post-free-2', '11111111-1111-1111-1111-111111111111', 'Loving this vegan community! So many inspiring people sharing their plant-based journey. Still learning but excited to connect with everyone here! 🌱', 'public', NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

-- Supporter user posts (1000 chars max, 7 images max, 1 video max)
('post-supporter-1', '22222222-2222-2222-2222-222222222222', 'Today I want to share my weekly vegan meal prep routine! Planning ahead has been game-changing for maintaining a healthy plant-based lifestyle. I spent Sunday afternoon preparing: overnight oats with berries and nuts for breakfast, colorful Buddha bowls with tahini dressing for lunch, and hearty lentil curry for dinner. The key is variety - different textures, flavors, and colors keep things interesting. I also prep snacks like energy balls and cut vegetables. This approach saves me so much time during busy weekdays and ensures I always have nutritious options ready. What are your favorite meal prep recipes? 🥙🥗🍛', 'public', '{"https://picsum.photos/800/600?random=4", "https://picsum.photos/800/600?random=5", "https://picsum.photos/800/600?random=6", "https://picsum.photos/800/600?random=7", "https://picsum.photos/800/600?random=8", "https://picsum.photos/800/600?random=9", "https://picsum.photos/800/600?random=10"}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

('post-supporter-2', '22222222-2222-2222-2222-222222222222', 'Check out this beautiful farmers market haul! I love supporting local farmers and getting the freshest seasonal produce. Today I found amazing heirloom tomatoes, fresh basil, purple carrots, and some gorgeous peaches. The best part about eating seasonally is discovering new flavors and varieties you might not find in regular stores. Plus, the environmental impact is so much lower! What did you find at your local market this week? 🍅🥕🍑', 'public', '{"https://picsum.photos/800/600?random=11", "https://picsum.photos/800/600?random=12"}', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),

-- Premium user posts (unlimited chars, unlimited images, 3 videos max)
('post-premium-1', '33333333-3333-3333-3333-333333333333', 'Welcome to my kitchen! Today I'm sharing my signature recipe for the most incredible cashew-based vegan cheese that has fooled even the most skeptical cheese lovers. This recipe took me months to perfect, and I'm finally ready to share it with you all. The secret is in the fermentation process and the combination of cashews, nutritional yeast, and a special blend of probiotics that creates that authentic tangy flavor and creamy texture we all crave. 

The base starts with soaked raw cashews - I soak them for at least 4 hours, but overnight is even better for the smoothest texture. Then I blend them with filtered water, a touch of white miso for umami depth, fresh lemon juice for acidity, and my secret weapon: a combination of rejuvelac and specific probiotic strains that help develop that characteristic cheese flavor through fermentation.

The process involves three stages: first, creating the base mixture; second, adding the cultures and allowing initial fermentation for 24-48 hours at room temperature; and third, shaping and aging the cheese in a controlled environment. The aging process is where the magic happens - the flavors develop complexity, the texture firms up, and you get that beautiful rind formation.

I've experimented with different additions: herbs, spices, wine reduction, truffle oil, and even edible flowers for special occasions. Each variation creates a unique flavor profile that rivals traditional dairy cheeses. The versatility is endless - you can create soft spreading cheeses, hard aged varieties, or even fresh mozzarella-style options.

What makes this recipe special isn't just the taste, but also the nutritional benefits. Cashews provide healthy fats, plant-based protein, and minerals like magnesium and zinc. The fermentation process adds beneficial probiotics for gut health. It's incredible how we can create something so delicious and satisfying while supporting our health and the environment.

I'll be sharing video tutorials for each step of the process, from basic techniques to advanced aging methods. Whether you're new to vegan cheese making or looking to elevate your skills, there's something here for everyone. Let's revolutionize plant-based cuisine together! 🧀🌱✨', 'public', '{"https://picsum.photos/800/600?random=13", "https://picsum.photos/800/600?random=14", "https://picsum.photos/800/600?random=15", "https://picsum.photos/800/600?random=16", "https://picsum.photos/800/600?random=17", "https://picsum.photos/800/600?random=18", "https://picsum.photos/800/600?random=19", "https://picsum.photos/800/600?random=20", "https://picsum.photos/800/600?random=21", "https://picsum.photos/800/600?random=22"}', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

('post-premium-2', '33333333-3333-3333-3333-333333333333', 'Behind the scenes at my restaurant! Here's how we prepare our signature dishes with love and attention to detail. From sourcing ingredients to plating, every step matters in creating an exceptional dining experience. 🍽️👨‍🍳', 'public', '{"https://picsum.photos/800/600?random=23", "https://picsum.photos/800/600?random=24"}', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours')

ON CONFLICT (id) DO UPDATE SET
  content = EXCLUDED.content,
  privacy = EXCLUDED.privacy,
  image_urls = EXCLUDED.image_urls,
  updated_at = NOW();

-- Add some post likes for engagement
INSERT INTO public.post_likes (post_id, user_id, created_at) VALUES
-- Free user likes supporter's posts
('post-supporter-1', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 hours'),
('post-supporter-2', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 hours'),
('post-premium-1', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 hours'),

-- Supporter likes premium and free posts
('post-free-1', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 hour'),
('post-premium-1', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '3 hours'),

-- Premium user likes all posts
('post-free-1', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 hour'),
('post-free-2', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '23 hours'),
('post-supporter-1', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '2 hours')

ON CONFLICT (post_id, user_id) DO NOTHING;

-- Add some comments for engagement
INSERT INTO public.comments (post_id, user_id, content, created_at, updated_at) VALUES
('post-free-1', '22222222-2222-2222-2222-222222222222', 'This looks absolutely delicious! I love how colorful and nutritious it is. Definitely trying this recipe this week! 😍', NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 30 minutes'),
('post-supporter-1', '33333333-3333-3333-3333-333333333333', 'Great meal prep ideas! As a chef, I really appreciate the thought you put into balancing flavors and nutrition. Keep sharing!', NOW() - INTERVAL '2 hours 30 minutes', NOW() - INTERVAL '2 hours 30 minutes'),
('post-premium-1', '22222222-2222-2222-2222-222222222222', 'Wow, this is incredible! As someone who missed cheese the most when going vegan, I can't wait to try this recipe. Thank you for sharing your expertise!', NOW() - INTERVAL '3 hours 30 minutes', NOW() - INTERVAL '3 hours 30 minutes'),
('post-premium-1', '11111111-1111-1111-1111-111111111111', 'This is exactly what I've been looking for! I'm still new to veganism and cheese was my biggest challenge. Can't wait to watch the video tutorials!', NOW() - INTERVAL '3 hours 15 minutes', NOW() - INTERVAL '3 hours 15 minutes')

ON CONFLICT (id) DO NOTHING;

-- Add some test places with different creators
INSERT INTO public.places (id, name, description, category, latitude, longitude, address, website, phone, is_pet_friendly, created_by, created_at, updated_at) VALUES
('place-free-1', 'Green Garden Cafe', 'Cozy neighborhood cafe with amazing vegan options. Their avocado toast and oat milk lattes are the best in town!', 'restaurant', 40.7589, -73.9851, '123 Plant St, New York, NY 10001', 'https://greengardencafe.com', '(555) 123-4567', true, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

('place-supporter-1', 'Vegan Delights Market', 'Fully plant-based grocery store with local produce, vegan specialty items, and bulk goods. Great selection of hard-to-find ingredients.', 'other', 40.7505, -73.9934, '456 Veggie Ave, New York, NY 10002', 'https://vegandelightsmarket.com', '(555) 234-5678', false, '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

('place-premium-1', 'Plant & Prose', 'Upscale plant-based restaurant featuring creative seasonal menus and an extensive natural wine selection.', 'restaurant', 40.7282, -74.0776, '789 Gourmet Blvd, New York, NY 10003', 'https://plantandprose.com', '(555) 345-6789', true, '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  address = EXCLUDED.address,
  website = EXCLUDED.website,
  phone = EXCLUDED.phone,
  is_pet_friendly = EXCLUDED.is_pet_friendly,
  updated_at = NOW();

-- Add some favorite places relationships
INSERT INTO public.favorite_places (user_id, place_id, created_at) VALUES
-- Cross-favoriting to show community engagement
('22222222-2222-2222-2222-222222222222', 'place-free-1', NOW() - INTERVAL '20 hours'),
('33333333-3333-3333-3333-333333333333', 'place-free-1', NOW() - INTERVAL '18 hours'),
('11111111-1111-1111-1111-111111111111', 'place-supporter-1', NOW() - INTERVAL '1 day 2 hours'),
('33333333-3333-3333-3333-333333333333', 'place-supporter-1', NOW() - INTERVAL '1 day 4 hours'),
('11111111-1111-1111-1111-111111111111', 'place-premium-1', NOW() - INTERVAL '2 days 1 hour'),
('22222222-2222-2222-2222-222222222222', 'place-premium-1', NOW() - INTERVAL '2 days 3 hours')

ON CONFLICT (user_id, place_id) DO NOTHING;

-- Create some follows relationships for social interaction
INSERT INTO public.follows (follower_id, following_id, created_at) VALUES
-- Free user follows both paid users
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '1 day'),
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '2 days'),

-- Supporter follows premium user
('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 day'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 hours'),

-- Premium user follows back
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '18 hours'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 hours')

ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Update user stats to reflect the test data
UPDATE public.users SET updated_at = NOW() WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
);