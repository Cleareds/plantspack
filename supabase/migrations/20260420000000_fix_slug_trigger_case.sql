-- Fix auto_generate_place_slug: lower() was applied AFTER regexp_replace.
--
-- The regex [^a-z0-9]+ matched uppercase letters (they're not in a-z), so
-- "La Grange DesRochers" became "-a--range--es-ochers" → "a-range-es-ochers".
-- Effectively every word's leading uppercase letter was stripped.
--
-- Fix: lowercase the input BEFORE the regex, so uppercase letters become
-- lowercase first and then match [a-z0-9] correctly.

CREATE OR REPLACE FUNCTION auto_generate_place_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is NULL or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate base slug from name + city.
    -- Order: unaccent → lower → regex — so ALL letters collapse to [a-z0-9].
    base_slug := regexp_replace(
      lower(unaccent(coalesce(NEW.name, '') || CASE WHEN NEW.city IS NOT NULL THEN '-' || NEW.city ELSE '' END)),
      '[^a-z0-9]+', '-', 'g'
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
