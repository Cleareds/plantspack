-- Fix: posts trigger should use user_id-only variant (posts has user_id, not created_by)
DROP TRIGGER IF EXISTS trg_award_early_post ON public.posts;
CREATE TRIGGER trg_award_early_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early_user_only();
