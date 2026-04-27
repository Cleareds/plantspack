-- Fix trg_award_early_place_rev and trg_award_early_recipe_rev which call
-- maybe_award_early() — a function that references NEW.created_by. These tables
-- only have user_id, so the trigger crashes on every review insert.
-- Switch both to maybe_award_early_user_only() (already exists from 20260421010100).

DROP TRIGGER IF EXISTS trg_award_early_place_rev ON public.place_reviews;
CREATE TRIGGER trg_award_early_place_rev
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early_user_only();

DROP TRIGGER IF EXISTS trg_award_early_recipe_rev ON public.recipe_reviews;
CREATE TRIGGER trg_award_early_recipe_rev
  AFTER INSERT ON public.recipe_reviews
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early_user_only();
