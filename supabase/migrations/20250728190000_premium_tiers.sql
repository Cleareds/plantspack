-- Premium Tiers and Subscription System
-- Adds subscription management with Stripe integration

-- Create subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'medium', 'premium');

-- Add subscription fields to users table
ALTER TABLE public.users 
ADD COLUMN subscription_tier subscription_tier DEFAULT 'free',
ADD COLUMN subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid')),
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_canceled_at TIMESTAMP WITH TIME ZONE;

-- Create subscriptions table for detailed tracking
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  
  -- Stripe integration fields
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  
  -- Billing details
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment tracking
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create subscription events table for audit trail
CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'canceled', 'payment_succeeded', 'payment_failed', etc.
  event_data JSONB DEFAULT '{}',
  stripe_event_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create indexes for performance
CREATE INDEX idx_users_subscription_tier ON public.users (subscription_tier);
CREATE INDEX idx_users_stripe_customer_id ON public.users (stripe_customer_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions (stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX idx_subscription_events_subscription_id ON public.subscription_events (subscription_id);
CREATE INDEX idx_subscription_events_stripe_event_id ON public.subscription_events (stripe_event_id);

-- Function to get tier limits
CREATE OR REPLACE FUNCTION get_tier_limits(tier subscription_tier)
RETURNS JSONB AS $$
BEGIN
  CASE tier
    WHEN 'free' THEN
      RETURN jsonb_build_object(
        'max_post_length', 250,
        'max_images_per_post', 1,
        'can_use_location', false,
        'can_see_analytics', false,
        'priority_support', false,
        'badge_color', '#6B7280',
        'badge_text', 'Free'
      );
    WHEN 'medium' THEN
      RETURN jsonb_build_object(
        'max_post_length', 1000,
        'max_images_per_post', 3,
        'can_use_location', true,
        'can_see_analytics', true,
        'priority_support', false,
        'badge_color', '#059669',
        'badge_text', 'Supporter'
      );
    WHEN 'premium' THEN
      RETURN jsonb_build_object(
        'max_post_length', 1000,
        'max_images_per_post', 5,
        'can_use_location', true,
        'can_see_analytics', true,
        'priority_support', true,
        'badge_color', '#7C3AED',
        'badge_text', 'Premium'
      );
    ELSE
      RETURN jsonb_build_object(
        'max_post_length', 250,
        'max_images_per_post', 1,
        'can_use_location', false,
        'can_see_analytics', false,
        'priority_support', false,
        'badge_color', '#6B7280',
        'badge_text', 'Free'
      );
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to update user subscription
CREATE OR REPLACE FUNCTION update_user_subscription(
  target_user_id UUID,
  new_tier subscription_tier,
  new_status TEXT,
  stripe_sub_id TEXT DEFAULT NULL,
  stripe_cust_id TEXT DEFAULT NULL,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update user record
  UPDATE public.users 
  SET 
    subscription_tier = new_tier,
    subscription_status = new_status,
    stripe_customer_id = COALESCE(stripe_cust_id, stripe_customer_id),
    stripe_subscription_id = COALESCE(stripe_sub_id, stripe_subscription_id),
    subscription_started_at = CASE 
      WHEN subscription_tier = 'free' AND new_tier != 'free' THEN COALESCE(period_start, now())
      ELSE subscription_started_at 
    END,
    subscription_ends_at = period_end,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Update or create subscription record
  INSERT INTO public.subscriptions (
    user_id, 
    tier, 
    status, 
    stripe_subscription_id, 
    stripe_customer_id,
    stripe_price_id,
    current_period_start, 
    current_period_end
  ) VALUES (
    target_user_id,
    new_tier,
    new_status,
    stripe_sub_id,
    COALESCE(stripe_cust_id, (SELECT stripe_customer_id FROM public.users WHERE id = target_user_id)),
    CASE new_tier 
      WHEN 'medium' THEN 'price_medium_monthly' 
      WHEN 'premium' THEN 'price_premium_monthly'
      ELSE 'price_free'
    END,
    COALESCE(period_start, now()),
    COALESCE(period_end, now() + INTERVAL '1 month')
  )
  ON CONFLICT (stripe_subscription_id) 
  DO UPDATE SET
    tier = EXCLUDED.tier,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can perform action based on tier
CREATE OR REPLACE FUNCTION user_can_perform_action(
  target_user_id UUID,
  action_type TEXT,
  action_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier subscription_tier;
  tier_limits JSONB;
  post_length INTEGER;
  image_count INTEGER;
BEGIN
  -- Get user's current tier
  SELECT subscription_tier INTO user_tier 
  FROM public.users 
  WHERE id = target_user_id;
  
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Get tier limits
  tier_limits := get_tier_limits(user_tier);
  
  -- Check specific actions
  CASE action_type
    WHEN 'create_post' THEN
      -- Check post length
      post_length := (action_data->>'content_length')::INTEGER;
      IF post_length > (tier_limits->>'max_post_length')::INTEGER THEN
        RETURN FALSE;
      END IF;
      
      -- Check image count
      image_count := COALESCE((action_data->>'image_count')::INTEGER, 0);
      IF image_count > (tier_limits->>'max_images_per_post')::INTEGER THEN
        RETURN FALSE;
      END IF;
      
      RETURN TRUE;
      
    WHEN 'use_location' THEN
      RETURN (tier_limits->>'can_use_location')::BOOLEAN;
      
    WHEN 'see_analytics' THEN
      RETURN (tier_limits->>'can_see_analytics')::BOOLEAN;
      
    WHEN 'priority_support' THEN
      RETURN (tier_limits->>'priority_support')::BOOLEAN;
      
    ELSE
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_timestamp_trigger
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

-- RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Users can only see their own subscription events
CREATE POLICY "Users can view own subscription events" ON public.subscription_events
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Service role can manage all subscriptions (for Stripe webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_limits(subscription_tier) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_subscription(UUID, subscription_tier, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_perform_action(UUID, TEXT, JSONB) TO authenticated, anon;