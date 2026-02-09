-- Fix slugs for any existing packs that have NULL or empty slugs
-- This handles packs created before the slug column was added

UPDATE public.packs
SET slug = generate_pack_slug(title, id)
WHERE slug IS NULL OR slug = '';

-- Verify all packs now have slugs
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.packs WHERE slug IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % packs with NULL slugs', null_count;
  END IF;
END $$;
