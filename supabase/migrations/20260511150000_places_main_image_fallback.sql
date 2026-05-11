-- Defensive trigger: if a place is inserted/updated with images[] but
-- null main_image_url, auto-fill main_image_url from images[1].
--
-- Background: 1,075 active places had main_image_url=null while
-- images[0] was a valid URL — they rendered fine on /place/<slug>
-- (the place page falls back to images[0]) but appeared as
-- icon-only placeholders on the search results page, city
-- directories, sidebar nudges, and any other surface that reads
-- main_image_url directly. A one-off backfill (2026-05-11) fixed
-- the existing rows; this trigger ensures the gap can't re-open.

CREATE OR REPLACE FUNCTION public.places_main_image_fallback()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.main_image_url IS NULL
     AND NEW.images IS NOT NULL
     AND array_length(NEW.images, 1) IS NOT NULL
     AND array_length(NEW.images, 1) > 0
     AND NEW.images[1] IS NOT NULL
     AND NEW.images[1] <> '' THEN
    NEW.main_image_url := NEW.images[1];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_places_main_image_fallback ON places;
CREATE TRIGGER trg_places_main_image_fallback
  BEFORE INSERT OR UPDATE OF main_image_url, images
  ON places
  FOR EACH ROW
  EXECUTE FUNCTION public.places_main_image_fallback();
