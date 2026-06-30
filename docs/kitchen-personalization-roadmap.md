# Kitchen Personalization Roadmap (pre-Phase-3 plan)

Status: **DRAFT for review.** Nothing here is built yet. This is the plan for how the Kitchen
eventually reaches the original "gentle vegan food companion" vision (user preferences, goal
matching, post-meal feedback, optional AI) - **after** Phases 1+2 ship and the elite-100 recipe
catalog + web collections prove out. Review and approve before any Phase 3 work starts.

## The goal, restated honestly

Turn the Kitchen from a browse-and-filter recipe library into a product that *adapts to the
person*: their goals (high-protein, weight-loss, gentle/soft, bloating-conscious), the
ingredients they avoid, the equipment they own, and what they liked last time - **without**
making medical claims, **without** becoming a symptom-tracking health app on day one, and
**without** an AI dependency for the core experience (AI is an optional later layer).

## What already exists that we build on (no rebuild)

- **`user_preferences` table** already has: `dietary_preferences[]`, `interest_tags[]`,
  `content_type_preferences` (JSONB weights), `tag_affinity_scores` (JSONB, learned 0-1),
  `feed_categories[]`. We EXTEND this; we do not create a parallel profile system.
- **`post_likes`** already powers recipe "Save". Reuse for favorites; no `saved_recipes` table.
- **Recipe comfort metadata** (Phase 1): `texture`, `fodmap_band`, `soft`/`no_chew`/`blender_only`,
  `high_protein`, `weight_loss_friendly` on `recipe_data`. The scoring inputs already live here.
- **Collections** (Phase 1): the comfort "hoods" + their tag filters become the goal taxonomy.

## Staged plan (each stage independently shippable + gated)

### Phase 3a - Capture preferences (low risk, no new behavior)
Extend `user_preferences` (additive columns or a `kitchen_prefs` JSONB):
- `goals[]`: weight_loss | high_protein | gentle_food | reduce_bloating | dental_recovery | braces
- `avoid_ingredients[]` (hard filter), `disliked_ingredients[]` (soft penalty), `favorite_ingredients[]`
- `available_equipment[]`: blender | hand_blender | stovetop | oven | freezer
- `preferred_meal_types[]`
- optional `calorie_target`, `protein_target`
A simple onboarding card ("What do you need today?") writes these. **No personalization behavior yet** - just capture + an editable profile screen. Ship web first, mobile via OTA.

### Phase 3b - Deterministic (non-AI) personalized sorting
Re-rank recipe/collection lists by a pure scoring function (see pseudocode). No model, no inference,
fully explainable ("Shown because: high-protein + no avoided ingredients + blender on hand").
This is the core payoff and it needs zero AI.

### Phase 3c - Save + lightweight post-cook feedback (non-health)
- Favorites via existing `post_likes`.
- A `recipe_feedback` table: `taste 1-5`, `repeat_again bool`, `notes`, `cooked_at`. **Taste/repeat
  only** - NOT comfort/symptom data yet. Feeds `tag_affinity_scores` so future sorting reflects
  what they actually liked. This is the safe, high-value feedback loop.

### Phase 4 - Comfort feedback (SENSITIVE - opt-in, gated, maybe skip)
Only if real demand appears. Adds `braces_comfort`, `bloating_after`, `satiety` to feedback.
**This is health-adjacent personal data** - triggers GDPR consent, privacy-policy updates, explicit
opt-in, data-handling obligations (user + platform are EU). Decision rule: do NOT build unless
(a) Phase 3 shows users actively rating, and (b) we have the consent/privacy work done. Default
posture: defer. Wording stays "may be easier for some people", never treatment claims; dietitian
disclaimer required.

### Phase 5 - Optional AI layer (premium, internal-data-only)
Built on internal structured recipes only (no open-ended generation): AI substitutions for
avoided ingredients, weekly menu from goals, "what can I cook from these ingredients?". Gated on
the cost rule (explicit per-run confirm + cap, per [[feedback-cost-posture]]). Never the core path.

## Scoring pseudocode (Phase 3b, non-AI)

```
score(recipe, prefs, history) =
    goalMatch(recipe, prefs.goals)            * W_GOAL      // exact goal flags
  + dietaryMatch(recipe, prefs.dietary)       * W_DIET
  + equipmentMatch(recipe, prefs.equipment)   * W_EQUIP
  + favoriteIngredientOverlap(recipe, prefs)  * W_FAV
  + pastRating(recipe.tags, history)          * W_HISTORY   // from tag_affinity_scores
  - bloatingRisk(recipe.fodmap_band)          * W_BLOAT     // only if reduce_bloating goal
  - dislikedIngredientOverlap(recipe, prefs)  * W_DISLIKE
HARD FILTER (exclude entirely): any avoid_ingredients present; equipment user lacks if required.
```
Deterministic, explainable, cheap. Tunable weights as constants. No personal data leaves Supabase.

## Data model deltas (when we get there)
- Extend `user_preferences` (Phase 3a) - additive.
- New `recipe_feedback` table (Phase 3c) - taste/repeat first; comfort columns only at Phase 4.
- No symptom-tracking entities until Phase 4 is explicitly approved.

## Hard guardrails (carry from project decisions)
- No medical claims; "gentle/low-FODMAP-friendly/may be easier", + dietitian disclaimer.
- Health/symptom data is opt-in, consented, GDPR-handled - or not collected.
- AI is optional and cost-gated, never required for the core experience.
- Don't break existing URLs; reuse `user_preferences` + `post_likes`, don't fork them.

## Gating before Phase 3 starts
1. Phases 1+2 shipped. 2. Elite-100 catalog ~40-60+ live. 3. Web collections show real
engagement/SEO traction. 4. This roadmap approved by user. Only then build 3a.
