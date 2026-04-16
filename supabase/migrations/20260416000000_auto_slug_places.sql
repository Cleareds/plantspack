-- Auto-generate slug for new places if not provided
CREATE OR REPLACE FUNCTION auto_generate_place_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is NULL or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate base slug from name + city
    base_slug := lower(
      regexp_replace(
        unaccent(coalesce(NEW.name, '') || CASE WHEN NEW.city IS NOT NULL THEN '-' || NEW.city ELSE '' END),
        '[^a-z0-9]+', '-', 'g'
      )
    );
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 100);

    -- Check for uniqueness
    final_slug := base_slug;
    LOOP
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.places WHERE slug = final_slug AND id != NEW.id);
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;

    NEW.slug := final_slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_place_slug ON public.places;
CREATE TRIGGER trigger_auto_place_slug
  BEFORE INSERT OR UPDATE ON public.places
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_place_slug();
