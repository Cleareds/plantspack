-- Promotional Subscription System
-- Provides free subscriptions for first 100 users and first 100 purchasers

-- Add fields to track promotional subscriptions
ALTER TABLE public.users 
ADD COLUMN registration_number SERIAL,
ADD COLUMN is_promotional_subscriber BOOLEAN DEFAULT FALSE,
ADD COLUMN promotional_type TEXT CHECK (promotional_type IN ('early_bird', 'early_purchaser')),
ADD COLUMN promotional_granted_at TIMESTAMP WITH TIME ZONE;

-- Create a table to track promotional subscription grants
CREATE TABLE public.promotional_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('early_bird_free_supporter', 'early_purchaser_free_premium')),
  original_tier subscription_tier NOT NULL,
  promotional_tier subscription_tier NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'
);

-- Create index for performance
CREATE INDEX idx_users_registration_number ON public.users (registration_number);
CREATE INDEX idx_promotional_subscriptions_user_id ON public.promotional_subscriptions (user_id);
CREATE INDEX idx_promotional_subscriptions_type ON public.promotional_subscriptions (promotion_type);

-- Function to check if user qualifies for early bird promotion (first 100 registered)
CREATE OR REPLACE FUNCTION check_early_bird_eligibility(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_reg_number INTEGER;
BEGIN
  SELECT registration_number INTO user_reg_number
  FROM public.users 
  WHERE id = target_user_id;
  
  -- First 100 registered users qualify
  RETURN user_reg_number <= 100;
END;
$$ LANGUAGE plpgsql;

-- Function to grant early bird free supporter subscription
CREATE OR REPLACE FUNCTION grant_early_bird_subscription(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  user_reg_number INTEGER;
  existing_promo_id UUID;
BEGIN
  -- Check if user is eligible
  IF NOT check_early_bird_eligibility(target_user_id) THEN
    RAISE EXCEPTION 'User is not eligible for early bird promotion';
  END IF;
  
  -- Check if already granted
  SELECT id INTO existing_promo_id 
  FROM public.promotional_subscriptions 
  WHERE user_id = target_user_id AND promotion_type = 'early_bird_free_supporter';
  
  IF existing_promo_id IS NOT NULL THEN
    RETURN; -- Already granted
  END IF;
  
  -- Grant the promotion
  INSERT INTO public.promotional_subscriptions (
    user_id,
    promotion_type,
    original_tier,
    promotional_tier,
    expires_at
  ) VALUES (
    target_user_id,
    'early_bird_free_supporter',
    'free',
    'medium',
    timezone('utc'::text, now()) + INTERVAL '1 year' -- Free for 1 year
  );
  
  -- Update user subscription
  UPDATE public.users 
  SET 
    subscription_tier = 'medium',
    subscription_status = 'active',
    is_promotional_subscriber = TRUE,
    promotional_type = 'early_bird',
    promotional_granted_at = timezone('utc'::text, now()),
    subscription_started_at = timezone('utc'::text, now()),
    subscription_ends_at = timezone('utc'::text, now()) + INTERVAL '1 year',
    updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check early purchaser eligibility (first 100 to purchase $3 subscription)
CREATE OR REPLACE FUNCTION check_early_purchaser_eligibility()
RETURNS BOOLEAN AS $$
DECLARE
  purchaser_count INTEGER;
BEGIN
  -- Count how many users have purchased the $3 subscription
  SELECT COUNT(*) INTO purchaser_count
  FROM public.subscriptions
  WHERE tier = 'medium' 
    AND status = 'active'
    AND stripe_subscription_id IS NOT NULL;
  
  RETURN purchaser_count < 100;
END;
$$ LANGUAGE plpgsql;

-- Function to grant early purchaser free premium subscription
CREATE OR REPLACE FUNCTION grant_early_purchaser_subscription(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  existing_promo_id UUID;
BEGIN
  -- Check if still eligible (under 100 purchasers)
  IF NOT check_early_purchaser_eligibility() THEN
    RAISE EXCEPTION 'Early purchaser promotion is no longer available';
  END IF;
  
  -- Check if already granted
  SELECT id INTO existing_promo_id 
  FROM public.promotional_subscriptions 
  WHERE user_id = target_user_id AND promotion_type = 'early_purchaser_free_premium';
  
  IF existing_promo_id IS NOT NULL THEN
    RETURN; -- Already granted
  END IF;
  
  -- Grant the promotion
  INSERT INTO public.promotional_subscriptions (
    user_id,
    promotion_type,
    original_tier,
    promotional_tier,
    expires_at
  ) VALUES (
    target_user_id,
    'early_purchaser_free_premium',
    'medium',
    'premium',
    timezone('utc'::text, now()) + INTERVAL '1 year' -- Free premium for 1 year
  );
  
  -- Update user subscription to premium
  UPDATE public.users 
  SET 
    subscription_tier = 'premium',
    is_promotional_subscriber = TRUE,
    promotional_type = 'early_purchaser',
    promotional_granted_at = timezone('utc'::text, now()),
    subscription_ends_at = timezone('utc'::text, now()) + INTERVAL '1 year',
    updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration and auto-grant early bird promotion
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user qualifies for early bird promotion
  IF check_early_bird_eligibility(NEW.id) THEN
    PERFORM grant_early_bird_subscription(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
CREATE TRIGGER handle_new_user_registration_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_registration();

-- Function to handle subscription updates and check for early purchaser promotion
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new medium tier subscription with Stripe ID, check early purchaser eligibility
  IF NEW.tier = 'medium' 
     AND NEW.status = 'active' 
     AND NEW.stripe_subscription_id IS NOT NULL 
     AND (OLD.stripe_subscription_id IS NULL OR OLD.status != 'active') THEN
    
    -- Check if user qualifies for early purchaser promotion
    IF check_early_purchaser_eligibility() THEN
      PERFORM grant_early_purchaser_subscription(NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription updates
CREATE TRIGGER handle_subscription_update_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_update();

-- RLS Policies for promotional subscriptions
ALTER TABLE public.promotional_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own promotional subscriptions
CREATE POLICY "Users can view own promotional subscriptions" ON public.promotional_subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Service role can manage promotional subscriptions
CREATE POLICY "Service role can manage promotional subscriptions" ON public.promotional_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.promotional_subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION check_early_bird_eligibility(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_early_purchaser_eligibility() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION grant_early_bird_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_early_purchaser_subscription(UUID) TO authenticated;

-- Update existing users with registration numbers (backfill)
-- This will assign registration numbers based on creation order
WITH numbered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as reg_number
  FROM public.users
  WHERE registration_number IS NULL
)
UPDATE public.users 
SET registration_number = numbered_users.reg_number
FROM numbered_users
WHERE users.id = numbered_users.id;

-- Grant early bird subscriptions to existing first 100 users
DO $$
DECLARE
  early_user RECORD;
BEGIN
  FOR early_user IN 
    SELECT id FROM public.users 
    WHERE registration_number <= 100 
      AND subscription_tier = 'free'
      AND is_promotional_subscriber IS NOT TRUE
  LOOP
    PERFORM grant_early_bird_subscription(early_user.id);
  END LOOP;
END $$;