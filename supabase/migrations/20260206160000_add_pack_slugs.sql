-- Add slug column to packs table
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_packs_slug ON public.packs(slug);

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION generate_pack_slug(title TEXT, pack_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Generate base slug: lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(regexp_replace(
    regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  -- Trim leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure it's not empty
  IF base_slug = '' THEN
    base_slug := 'pack';
  END IF;
  
  -- Start with base slug
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (
    SELECT 1 FROM packs 
    WHERE slug = final_slug 
    AND id != pack_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Update existing packs to have slugs based on their titles
UPDATE public.packs
SET slug = generate_pack_slug(title, id)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE public.packs ALTER COLUMN slug SET NOT NULL;

-- Add constraint to ensure slug format
ALTER TABLE public.packs ADD CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$');

-- Trigger to auto-generate slug on insert if not provided
CREATE OR REPLACE FUNCTION auto_generate_pack_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_pack_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pack_slug_trigger ON public.packs;
CREATE TRIGGER pack_slug_trigger
  BEFORE INSERT OR UPDATE OF title
  ON public.packs
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_pack_slug();
