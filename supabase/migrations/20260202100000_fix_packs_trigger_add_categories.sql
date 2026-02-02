-- Fix pack creation 500 error: trigger function needs SECURITY DEFINER
-- to bypass RLS when inserting admin membership for new packs.
-- Also adds categories TEXT[] column for multi-category support.

-- 1. Fix the trigger function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_pack_admin_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pack_members (pack_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add categories array column
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- 3. Migrate existing single category data to categories array
UPDATE public.packs
SET categories = ARRAY[category]
WHERE category IS NOT NULL AND (categories IS NULL OR categories = '{}');

-- 4. Index for array queries
CREATE INDEX IF NOT EXISTS idx_packs_categories ON public.packs USING GIN (categories);
