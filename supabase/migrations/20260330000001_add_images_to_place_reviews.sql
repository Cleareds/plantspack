-- Migration: Add images column to place_reviews
-- Created: 2026-03-30
-- Description: Allow users to attach images to their place reviews

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.place_reviews.images IS 'Array of image URLs attached to the review (max 5)';
