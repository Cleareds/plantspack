-- SQL snippet to add test posts for followed users
-- Run this in your Supabase SQL editor after running add-test-followers.sql

DO $$
DECLARE
    test_user_ids UUID[];
    current_user_id UUID;
    post_contents TEXT[] := ARRAY[
        'Just tried this amazing jackfruit taco recipe! 🌮 The texture is so close to pulled pork, even my non-vegan friends were impressed.',
        'Morning meditation in the garden surrounded by my vegetable patch. There''s something magical about growing your own food 🧘‍♀️🌱',
        'Visited a new plant-based restaurant downtown today. Their cashew mac and cheese was absolutely incredible! Will definitely be back.',
        'Reading "The China Study" again and it never fails to reinforce why I chose this lifestyle. Science-backed compassion 📚',
        'Made homemade oat milk for the first time and I''m never buying store-bought again! So creamy and cost-effective 🥛',
        'Attended a local animal sanctuary today. These beautiful souls deserve all our love and protection 🐷❤️',
        'Meal prep Sunday! Quinoa bowls with roasted vegetables and tahini dressing for the week ahead 🥗',
        'Just finished a 5K run fueled entirely by plants! Feeling stronger than ever 🏃‍♀️💚',
        'Discovered this hidden gem of a farmers market. Supporting local organic growers feels so good 🥕🍅',
        'Experimenting with aquafaba meringues today. Plant-based baking never ceases to amaze me! 🧁',
        'Documentary night: watching "Earthlings" with friends. Education is the first step to change 🎬',
        'Homemade hummus with roasted red peppers and fresh herbs. Simple pleasures in life 🌿',
        'Started composting last month and my garden is already thanking me! Circle of life in action ♻️',
        'Tried making seitan from scratch today. The process is therapeutic and the result is delicious! 🍄',
        'Local vegan meetup was amazing! Found my tribe and exchanged so many great recipes 👥',
        'Picked up some seasonal produce at the market. Butternut squash soup is happening tonight! 🎃',
        'Yoga class this morning reminded me that being vegan is yoga off the mat - ahimsa in action 🧘',
        'Made the most incredible lentil walnut bolognese. Even my Italian grandmother would approve! 🍝',
        'Foraging for wild mushrooms with an expert guide. Nature provides everything we need 🍄🌲',
        'Batch cooking chickpea curry for the week. Meal prep that actually tastes good! 🍛',
        'Reading labels at the grocery store and feeling grateful for how many vegan options exist now 🛒',
        'Homemade bread with herbs from my garden. Nothing beats the smell of fresh baking 🍞',
        'Volunteering at the local food bank, making sure plant-based options are available for everyone 🤝',
        'Date night at that new vegan fine dining restaurant. Who says plant-based can''t be elegant? 🍽️',
        'Morning smoothie with spinach, banana, and almond butter. Green fuel for the day ahead! 🥤',
        'Attended a sustainable fashion workshop. Veganism extends beyond just food choices 👗',
        'Harvested the first tomatoes from my balcony garden! Nothing tastes better than homegrown 🍅',
        'Exploring fermentation: kimchi, sauerkraut, and kombucha brewing in my kitchen 🥬',
        'Beach cleanup this morning. Protecting the environment one piece of trash at a time 🏖️',
        'Made cashew cheese that actually melts! Plant-based innovation is incredible these days 🧀',
        'Hiking trip with packed lunches of veggie wraps and energy balls. Nature + nourishment 🥾',
        'Trying intermittent fasting combined with plant-based eating. Feeling more energetic than ever! ⚡',
        'Local cooking class taught me to make authentic Thai curry with coconut milk 🍜',
        'Community garden work day! Growing food together builds stronger neighborhoods 🌱',
        'Discovered a new plant milk - pistachio! Creamy and delicious in my morning coffee ☕',
        'Zero waste grocery shopping with my reusable containers. Small steps, big impact 🌍',
        'Homemade granola with nuts, seeds, and dried fruit. Breakfast never tasted so good! 🥣',
        'Attended a nutrition seminar about plant-based proteins. Education empowers better choices 📖',
        'Made friends with the vendors at my local farmers market. Community connections matter 🤝',
        'Trying new vegetables I''ve never cooked before. Today''s adventure: romanesco broccoli! 🥦',
        'Sunday morning pancakes made with banana and oat flour. Weekend bliss achieved 🥞',
        'Joined a CSA (Community Supported Agriculture) box. Seasonal eating at its finest 📦',
        'Late night craving satisfied with homemade energy balls. Dates and nuts never fail! 🍫',
        'Farmers market haul: rainbow chard, purple carrots, and the most beautiful beets 🌈',
        'Sourdough starter is thriving! Fermented foods are having a moment in my kitchen 🍞',
        'Plant-based barbecue with portobello burgers and grilled vegetables. Summer vibes! 🔥',
        'Morning run through the park, grateful for this strong plant-powered body 🏃‍♂️',
        'Experimenting with jackfruit carnitas for taco Tuesday. The texture is mind-blowing! 🌮',
        'Meditation retreat this weekend focused on compassion for all beings 🧘‍♀️',
        'Homemade nut butter with just peanuts and a pinch of salt. Simple ingredients, amazing taste! 🥜'
    ];
    privacy_options TEXT[] := ARRAY['public', 'friends'];
    random_privacy TEXT;
    random_content TEXT;
    posts_per_user INTEGER := 10;
    i INTEGER;
    j INTEGER;
BEGIN
    -- Get the main user ID
    SELECT id INTO current_user_id 
    FROM users 
    WHERE username = 'papasoft';
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'Main user not found. Please update the username in the script.';
        RETURN;
    END IF;
    
    -- Get test user IDs
    SELECT ARRAY_AGG(id) INTO test_user_ids
    FROM users 
    WHERE username IN ('alice_green', 'bob_vegan', 'carol_cook', 'david_nature', 'emma_wellness');
    
    IF array_length(test_user_ids, 1) = 0 THEN
        RAISE NOTICE 'No test users found. Please run add-test-followers.sql first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found % test users to create posts for', array_length(test_user_ids, 1);
    
    -- Create posts for each test user
    FOR i IN 1..array_length(test_user_ids, 1) LOOP
        RAISE NOTICE 'Creating posts for user %', test_user_ids[i];
        
        FOR j IN 1..posts_per_user LOOP
            -- Randomly select content
            random_content := post_contents[1 + (random() * (array_length(post_contents, 1) - 1))::int];
            
            -- Randomly select privacy (50/50 split)
            random_privacy := privacy_options[1 + (random() * (array_length(privacy_options, 1) - 1))::int];
            
            -- Insert the post with random timestamp in the last 30 days
            INSERT INTO posts (user_id, content, privacy, created_at) VALUES (
                test_user_ids[i],
                random_content,
                random_privacy,
                NOW() - (random() * INTERVAL '30 days')
            );
        END LOOP;
    END LOOP;
    
    -- Create a few posts for the main user too
    RAISE NOTICE 'Creating posts for main user';
    FOR j IN 1..5 LOOP
        random_content := post_contents[1 + (random() * (array_length(post_contents, 1) - 1))::int];
        random_privacy := privacy_options[1 + (random() * (array_length(privacy_options, 1) - 1))::int];
        
        INSERT INTO posts (user_id, content, privacy, created_at) VALUES (
            current_user_id,
            random_content || ' #MyVeganJourney',
            random_privacy,
            NOW() - (random() * INTERVAL '7 days')
        );
    END LOOP;
    
    RAISE NOTICE 'Test posts creation complete!';
    
    -- Show summary by privacy level
    RAISE NOTICE 'Public posts created: %', (
        SELECT COUNT(*) FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE u.username IN ('alice_green', 'bob_vegan', 'carol_cook', 'david_nature', 'emma_wellness', 'papasoft')
        AND p.privacy = 'public'
    );
    
    RAISE NOTICE 'Friends posts created: %', (
        SELECT COUNT(*) FROM posts p 
        JOIN users u ON p.user_id = u.id 
        WHERE u.username IN ('alice_green', 'bob_vegan', 'carol_cook', 'david_nature', 'emma_wellness', 'papasoft')
        AND p.privacy = 'friends'
    );
    
END $$;

-- Verify the results - show recent posts by privacy
SELECT 
    u.username,
    u.first_name,
    p.privacy,
    LEFT(p.content, 60) || '...' as content_preview,
    p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE u.username IN ('alice_green', 'bob_vegan', 'carol_cook', 'david_nature', 'emma_wellness', 'papasoft')
ORDER BY p.created_at DESC
LIMIT 20;

-- Summary stats
SELECT 
    u.username,
    COUNT(*) as total_posts,
    COUNT(*) FILTER (WHERE p.privacy = 'public') as public_posts,
    COUNT(*) FILTER (WHERE p.privacy = 'friends') as friends_posts
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE u.username IN ('alice_green', 'bob_vegan', 'carol_cook', 'david_nature', 'emma_wellness', 'papasoft')
GROUP BY u.username, u.first_name
ORDER BY u.first_name;