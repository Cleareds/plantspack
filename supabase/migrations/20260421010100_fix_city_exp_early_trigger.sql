-- Fix: maybe_award_early() hard-references NEW.created_by, which doesn't
-- exist on city_experiences rows. Attaching it to city_experiences caused
-- every INSERT to fail at trigger parse time.
-- Create a user-id-only variant and point the city_experiences trigger at it.

CREATE OR REPLACE FUNCTION public.maybe_award_early_user_only() RETURNS TRIGGER AS $$
DECLARE
  current INT;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO current FROM public.user_badges WHERE badge_code = 'early_contributor';
  IF current < 100 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.user_id, 'early_contributor')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_early_city_exp ON public.city_experiences;
CREATE TRIGGER trg_award_early_city_exp
  AFTER INSERT ON public.city_experiences
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early_user_only();
