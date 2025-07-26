-- SQL snippet to add test followers
-- Run this in your Supabase SQL editor

-- First, let's see what users exist in your database
-- You can run this query first to see available usernames:
-- SELECT id, username, first_name, last_name FROM users ORDER BY created_at;

-- Example: Add some test followers
-- Replace 'your_username_here' with your actual username from the database

-- Add test followers for your account (assuming your username exists)
DO $$
DECLARE
    main_user_id UUID;
    test_user_ids UUID[];
    user_record RECORD;
BEGIN
    -- Get your user ID (replace 'your_username_here' with your actual username)
    SELECT id INTO main_user_id
    FROM users
    WHERE username = 'papasoft';

    IF main_user_id IS NULL THEN
        RAISE NOTICE 'User not found. Please update the username in the script.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found user with ID: %', main_user_id;

    -- Create some test users if they don't exist
    INSERT INTO users (id, email, username, first_name, last_name, bio) 
    SELECT * FROM (VALUES
        (gen_random_uuid(), 'alice@example.com', 'alice_green', 'Alice', 'Green', 'Plant-based chef and recipe creator 🌱'),
        (gen_random_uuid(), 'bob@example.com', 'bob_vegan', 'Bob', 'Johnson', 'Vegan activist and fitness enthusiast 💪'),
        (gen_random_uuid(), 'carol@example.com', 'carol_cook', 'Carol', 'Smith', 'Food blogger sharing vegan adventures 🥗'),
        (gen_random_uuid(), 'david@example.com', 'david_nature', 'David', 'Brown', 'Environmental scientist and nature lover 🌍'),
        (gen_random_uuid(), 'emma@example.com', 'emma_wellness', 'Emma', 'Wilson', 'Wellness coach and meditation teacher 🧘')
    ) AS v(id, email, username, first_name, last_name, bio)
    WHERE NOT EXISTS (
        SELECT 1 FROM users WHERE users.email = v.email OR users.username = v.username
    );

    -- Get the IDs of test users
    SELECT ARRAY_AGG(id) INTO test_user_ids
    FROM users
    WHERE username IN ('alice_green', 'bob_vegan', 'carol_cook', 'david_nature', 'emma_wellness');

    -- Make test users follow the main user
    FOR i IN 1..array_length(test_user_ids, 1) LOOP
        INSERT INTO follows (follower_id, following_id)
        SELECT test_user_ids[i], main_user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM follows 
            WHERE follower_id = test_user_ids[i] AND following_id = main_user_id
        );

        RAISE NOTICE 'Added follower: %', test_user_ids[i];
    END LOOP;

    -- Make the main user follow some test users back
    INSERT INTO follows (follower_id, following_id) 
    SELECT main_user_id, test_user_ids[1]
    WHERE NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = main_user_id AND following_id = test_user_ids[1]);
    
    INSERT INTO follows (follower_id, following_id) 
    SELECT main_user_id, test_user_ids[3]
    WHERE NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = main_user_id AND following_id = test_user_ids[3]);
    
    INSERT INTO follows (follower_id, following_id) 
    SELECT main_user_id, test_user_ids[5]
    WHERE NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = main_user_id AND following_id = test_user_ids[5]);

    -- Create some cross-follows between test users (simplified approach)
    INSERT INTO follows (follower_id, following_id) 
    SELECT f.follower_id, f.following_id FROM (VALUES
        (test_user_ids[1], test_user_ids[2]),
        (test_user_ids[2], test_user_ids[1]),
        (test_user_ids[3], test_user_ids[4]),
        (test_user_ids[4], test_user_ids[3]),
        (test_user_ids[1], test_user_ids[5]),
        (test_user_ids[5], test_user_ids[1])
    ) AS f(follower_id, following_id)
    WHERE NOT EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = f.follower_id AND following_id = f.following_id
    );

    RAISE NOTICE 'Test followers setup complete!';

    -- Show summary
    RAISE NOTICE 'Followers of main user: %', (SELECT COUNT(*) FROM follows WHERE following_id = main_user_id);
    RAISE NOTICE 'Users main user follows: %', (SELECT COUNT(*) FROM follows WHERE follower_id = main_user_id);

END $$;

-- Verify the results
SELECT
    f.id,
    follower.username as follower_username,
    follower.first_name as follower_name,
    following.username as following_username,
    following.first_name as following_name,
    f.created_at
FROM follows f
JOIN users follower ON f.follower_id = follower.id
JOIN users following ON f.following_id = following.id
ORDER BY f.created_at DESC
LIMIT 20;

-- Quick stats
SELECT
    'Total follows' as metric,
    COUNT(*) as count
FROM follows
UNION ALL
SELECT
    'Users with followers' as metric,
    COUNT(DISTINCT following_id) as count
FROM follows
UNION ALL
SELECT
    'Users following others' as metric,
    COUNT(DISTINCT follower_id) as count
FROM follows;
