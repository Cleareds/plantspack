-- Migration: Add opening hours and event time to places
-- Created: 2026-02-05
-- Description: Add opening_hours for restaurants/cafes and event_time for events

-- Add opening_hours column (JSONB for flexible schedule)
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

-- Add event_time column (for events: start and end time)
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS event_time JSONB DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.places.opening_hours IS 'Opening hours for restaurants/cafes. Format: {"monday": "9:00-17:00", "tuesday": "9:00-17:00", ...}';
COMMENT ON COLUMN public.places.event_time IS 'Event time. Format: {"start": "2024-01-01T10:00:00Z", "end": "2024-01-01T18:00:00Z"}';

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_places_opening_hours ON public.places USING GIN(opening_hours);
CREATE INDEX IF NOT EXISTS idx_places_event_time ON public.places USING GIN(event_time);
