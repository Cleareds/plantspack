-- Reassert place-related badge triggers against places.created_by.
-- The live database appears to have trigger drift causing inserts into
-- public.places to fail with "record NEW has no field user_id".

CREATE OR REPLACE FUNCTION public.maybe_award_curator() RETURNS TRIGGER AS $$
DECLARE
  total INT;
  uid UUID := NEW.created_by;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO total
    FROM public.places
    WHERE created_by = uid AND archived_at IS NULL;

  IF total >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (uid, 'curator')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.maybe_award_early() RETURNS TRIGGER AS $$
DECLARE
  uid UUID;
  current INT;
BEGIN
  uid := COALESCE(NEW.created_by, NEW.user_id);
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current
    FROM public.user_badges
    WHERE badge_code = 'early_contributor';

  IF current < 100 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (uid, 'early_contributor')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.maybe_award_early_place() RETURNS TRIGGER AS $$
DECLARE
  current INT;
BEGIN
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current
    FROM public.user_badges
    WHERE badge_code = 'early_contributor';

  IF current < 100 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.created_by, 'early_contributor')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_curator ON public.places;
CREATE TRIGGER trg_award_curator
  AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_curator();

DROP TRIGGER IF EXISTS trg_award_early_place ON public.places;
CREATE TRIGGER trg_award_early_place
  AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early_place();
