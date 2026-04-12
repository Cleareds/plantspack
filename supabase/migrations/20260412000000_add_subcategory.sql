-- Add subcategory column for more granular place classification
ALTER TABLE places ADD COLUMN IF NOT EXISTS subcategory text;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_places_subcategory ON places (subcategory);

-- Backfill existing places based on current data
-- eat places: default to 'restaurant'
UPDATE places SET subcategory = 'restaurant' WHERE category = 'eat' AND subcategory IS NULL;

-- store places: default to 'grocery'
UPDATE places SET subcategory = 'grocery' WHERE category = 'store' AND subcategory IS NULL;

-- hotel places: check tags for more specific subcategory
UPDATE places SET subcategory = 'bnb' WHERE category = 'hotel' AND subcategory IS NULL AND (
  tags @> ARRAY['bnb'] OR tags @> ARRAY['bed and breakfast']
);
UPDATE places SET subcategory = 'hostel' WHERE category = 'hotel' AND subcategory IS NULL AND (
  tags @> ARRAY['hostel']
);
UPDATE places SET subcategory = 'retreat' WHERE category = 'hotel' AND subcategory IS NULL AND (
  tags @> ARRAY['retreat']
);
UPDATE places SET subcategory = 'hotel' WHERE category = 'hotel' AND subcategory IS NULL;

-- organisation places: default to 'animal_sanctuary'
UPDATE places SET subcategory = 'animal_sanctuary' WHERE category = 'organisation' AND subcategory IS NULL;

-- other: default to 'other'
UPDATE places SET subcategory = 'other' WHERE subcategory IS NULL;
