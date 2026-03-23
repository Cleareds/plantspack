-- Replace 'museum' category with 'store' and keep backward compat
-- Update the check constraint on places.category to include 'store'

-- First, update any existing museum places to 'other'
UPDATE places SET category = 'other' WHERE category = 'museum';

-- Alter the constraint to add 'store' and remove 'museum'
ALTER TABLE places DROP CONSTRAINT IF EXISTS places_category_check;
ALTER TABLE places ADD CONSTRAINT places_category_check
  CHECK (category IN ('eat', 'hotel', 'event', 'store', 'organisation', 'other'));
