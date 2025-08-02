-- Fix Subscription System Database Issues
-- Run this in your Supabase SQL Editor

-- Step 1: Ensure all subscription columns exist in users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'medium', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Step 2: Update any users missing subscription fields
UPDATE users SET 
    subscription_tier = COALESCE(subscription_tier, 'free'),
    subscription_status = COALESCE(subscription_status, 'active')
WHERE subscription_tier IS NULL OR subscription_status IS NULL;

-- Step 3: Create the missing stored procedure for updating user subscriptions
CREATE OR REPLACE FUNCTION update_user_subscription(
    target_user_id UUID,
    new_tier TEXT,
    new_status TEXT,
    stripe_sub_id TEXT DEFAULT NULL,
    stripe_cust_id TEXT DEFAULT NULL,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update the user's subscription information
    UPDATE users 
    SET 
        subscription_tier = new_tier,
        subscription_status = new_status,
        subscription_ends_at = period_end,
        stripe_customer_id = COALESCE(stripe_cust_id, stripe_customer_id),
        stripe_subscription_id = COALESCE(stripe_sub_id, stripe_subscription_id),
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the update for debugging
    RAISE LOG 'Updated subscription for user % to tier % with status %', target_user_id, new_tier, new_status;
    
    -- If no rows were affected, the user doesn't exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % not found', target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create subscription events table for logging (if it doesn't exist)
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB,
    stripe_event_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create function to get user subscription details (for the UI)
CREATE OR REPLACE FUNCTION get_user_subscription(user_id UUID)
RETURNS TABLE (
    tier TEXT,
    status TEXT,
    ends_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.subscription_tier,
        u.subscription_status,
        u.subscription_ends_at,
        u.stripe_customer_id,
        u.stripe_subscription_id
    FROM users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);

-- Step 7: Grant necessary permissions
-- Allow the service role to execute these functions
GRANT EXECUTE ON FUNCTION update_user_subscription TO service_role;
GRANT EXECUTE ON FUNCTION get_user_subscription TO service_role;
GRANT EXECUTE ON FUNCTION get_user_subscription TO authenticated;

-- Allow webhook endpoint to access subscription_events
GRANT ALL ON subscription_events TO service_role;

-- Step 8: Create a view for easier subscription checking (optional)
CREATE OR REPLACE VIEW user_subscription_info AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.subscription_tier,
    u.subscription_status,
    u.subscription_ends_at,
    u.stripe_customer_id,
    u.stripe_subscription_id,
    CASE 
        WHEN u.subscription_status = 'active' AND (u.subscription_ends_at IS NULL OR u.subscription_ends_at > NOW()) THEN true
        ELSE false
    END AS is_subscription_active
FROM users u;

-- Grant access to the view
GRANT SELECT ON user_subscription_info TO service_role;
GRANT SELECT ON user_subscription_info TO authenticated;

-- Step 9: Test the function (optional - remove if running in production)
-- This will test if the function works
-- SELECT update_user_subscription(
--     (SELECT id FROM users LIMIT 1),
--     'premium',
--     'active',
--     'sub_test123',
--     'cus_test123',
--     NOW(),
--     NOW() + INTERVAL '1 month'
-- );

COMMIT;