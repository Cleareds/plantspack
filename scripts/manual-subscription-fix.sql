-- Manual Subscription Fix Script
-- Use this to manually update a user's subscription status after successful payment
-- Replace the email and subscription details below

-- STEP 1: Check current user subscription status
-- Replace 'user@example.com' with the actual user email
SELECT 
    id,
    email,
    username,
    subscription_tier,
    subscription_status,
    subscription_ends_at,
    stripe_customer_id,
    stripe_subscription_id
FROM users 
WHERE email = 'user@example.com';  -- REPLACE THIS EMAIL

-- STEP 2: Manual subscription update (if needed)
-- Replace values below with actual subscription details
/*
UPDATE users 
SET 
    subscription_tier = 'premium',  -- or 'medium' for supporter plan
    subscription_status = 'active',
    subscription_ends_at = NOW() + INTERVAL '1 month',  -- adjust as needed
    stripe_customer_id = 'cus_XXXXXXXXXX',  -- from Stripe dashboard
    stripe_subscription_id = 'sub_XXXXXXXXXX',  -- from Stripe dashboard
    updated_at = NOW()
WHERE email = 'user@example.com';  -- REPLACE THIS EMAIL
*/

-- STEP 3: Verify the update
-- Replace 'user@example.com' with the actual user email
SELECT 
    id,
    email,
    username,
    subscription_tier,
    subscription_status,
    subscription_ends_at,
    stripe_customer_id,
    stripe_subscription_id
FROM users 
WHERE email = 'user@example.com';  -- REPLACE THIS EMAIL

-- STEP 4: If you want to update by user ID instead of email:
/*
UPDATE users 
SET 
    subscription_tier = 'premium',  -- or 'medium' for supporter plan
    subscription_status = 'active',
    subscription_ends_at = NOW() + INTERVAL '1 month',
    stripe_customer_id = 'cus_XXXXXXXXXX',
    stripe_subscription_id = 'sub_XXXXXXXXXX',
    updated_at = NOW()
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';  -- REPLACE WITH ACTUAL USER ID
*/