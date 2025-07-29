-- Database Schema Updates for Vegan Social App
-- Execute these commands in your Supabase SQL editor

-- 1. Add subscription columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'medium', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'unpaid')),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_period_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_period_end timestamp with time zone;

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('medium', 'premium')),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. Create subscription_events table for webhook logging
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  stripe_event_id text NOT NULL UNIQUE,
  processed_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT subscription_events_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL
);

-- 4. Create user_preferences table for future features
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  privacy_level text DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends', 'private')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- 5. Add post metadata columns for enhanced features
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS location_data jsonb,
ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium_content boolean DEFAULT false;

-- 6. Create or replace function to update user subscription
CREATE OR REPLACE FUNCTION public.update_user_subscription(
  target_user_id uuid,
  new_tier text,
  new_status text,
  stripe_sub_id text DEFAULT NULL,
  stripe_cust_id text DEFAULT NULL,
  period_start text DEFAULT NULL,
  period_end text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update users table
  UPDATE public.users 
  SET 
    subscription_tier = new_tier,
    subscription_status = new_status,
    stripe_customer_id = COALESCE(stripe_cust_id, stripe_customer_id),
    subscription_period_start = CASE 
      WHEN period_start IS NOT NULL THEN period_start::timestamp with time zone 
      ELSE subscription_period_start 
    END,
    subscription_period_end = CASE 
      WHEN period_end IS NOT NULL THEN period_end::timestamp with time zone 
      ELSE subscription_period_end 
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;

  -- Upsert subscription record if we have stripe data
  IF stripe_sub_id IS NOT NULL AND new_tier != 'free' THEN
    INSERT INTO public.subscriptions (
      user_id, 
      stripe_subscription_id, 
      stripe_customer_id, 
      tier, 
      status,
      current_period_start,
      current_period_end
    )
    VALUES (
      target_user_id,
      stripe_sub_id,
      stripe_cust_id,
      new_tier,
      new_status,
      COALESCE(period_start::timestamp with time zone, timezone('utc'::text, now())),
      COALESCE(period_end::timestamp with time zone, timezone('utc'::text, now()) + interval '1 month')
    )
    ON CONFLICT (stripe_subscription_id)
    DO UPDATE SET
      tier = EXCLUDED.tier,
      status = EXCLUDED.status,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = timezone('utc'::text, now());
  END IF;
END;
$$;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_posts_engagement_score ON public.posts(engagement_score);
CREATE INDEX IF NOT EXISTS idx_posts_is_premium ON public.posts(is_premium_content);

-- 8. Set up RLS (Row Level Security) policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription data
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Users can only see their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin/service role can manage subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_subscriptions_updated_at') THEN
    CREATE TRIGGER set_subscriptions_updated_at
      BEFORE UPDATE ON public.subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_preferences_updated_at') THEN
    CREATE TRIGGER set_user_preferences_updated_at
      BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- 10. Insert default preferences for existing users
INSERT INTO public.user_preferences (user_id)
SELECT id FROM public.users 
WHERE id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Complete! Your database now supports:
-- ✅ User subscriptions with Stripe integration
-- ✅ Subscription event logging
-- ✅ User preferences system
-- ✅ Enhanced post metadata
-- ✅ Proper indexing and security policies