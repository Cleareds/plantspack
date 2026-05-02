-- Block any path that promotes a place to vegan_level='fully_vegan' with
-- verification_method='ai_verified'. Promotion to fully_vegan is a high-
-- trust claim ("100% vegan menu") and should only come from human review
-- or first-party vegan-list sources (HappyCow, VegGuide).
--
-- Background: the May 2026 Belgium audit found ~95 places promoted to
-- fully_vegan by an AI reclassifier reading hallucinated descriptions
-- and OSM tags it had mistranslated. This trigger ensures the bug
-- can't recur even if a future import script forgets the
-- veganLevelFromOSMTags() guard. Non-AI promotions (admin_review,
-- community_correction, imported with strong evidence) are unaffected.

CREATE OR REPLACE FUNCTION enforce_fully_vegan_human_only()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: forbid any new fully_vegan row whose method is 'ai_verified'.
  IF TG_OP = 'INSERT'
     AND NEW.vegan_level = 'fully_vegan'
     AND NEW.verification_method = 'ai_verified' THEN
    RAISE EXCEPTION
      'fully_vegan with verification_method=ai_verified is forbidden. '
      'Use admin_review, community_correction, imported (with vegan-source evidence), '
      'or downgrade vegan_level to mostly_vegan / vegan_friendly / vegan_options.';
  END IF;

  -- UPDATE: allow keeping a row at fully_vegan, but block promotion from
  -- a lower tier when method is 'ai_verified'. Demotion from fully_vegan
  -- to a lower tier is always allowed.
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.vegan_level, '') != 'fully_vegan'
     AND NEW.vegan_level = 'fully_vegan'
     AND NEW.verification_method = 'ai_verified' THEN
    RAISE EXCEPTION
      'Cannot promote to fully_vegan with verification_method=ai_verified. '
      'AI judgments alone are insufficient evidence. Use admin_review or community_correction.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS places_fully_vegan_human_only ON places;
CREATE TRIGGER places_fully_vegan_human_only
  BEFORE INSERT OR UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION enforce_fully_vegan_human_only();

COMMENT ON FUNCTION enforce_fully_vegan_human_only() IS
  'Prevents AI-driven promotion to fully_vegan. See May 2026 Belgium audit context.';
